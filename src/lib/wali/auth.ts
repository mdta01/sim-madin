/**
 * ============================================================================
 * WALI AUTH — JWT session & helpers
 * ============================================================================
 * Berbeda dengan NextAuth (admin), wali pakai custom JWT karena:
 * - Login pakai WhatsApp + PIN (bukan email/password)
 * - Token bisa dipakai mobile apps (Bearer token)
 * - Session data: waliId, phone, name, santriIds[]
 * ============================================================================
 */

import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { normalizeWhatsApp, isValidPINFormat, isWeakPIN } from "./helpers"

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "sim-madin-dev-secret-change-in-production"
const JWT_EXPIRES_IN = "7d"

export interface WaliSession {
  waliId: string
  phone: string
  name: string
  santriIds: string[]
}

/**
 * Hash PIN dengan bcrypt
 */
export async function hashPIN(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

/**
 * Verify PIN dengan bcrypt
 */
export async function verifyPIN(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/**
 * Sign JWT token untuk wali session
 */
export function signWaliToken(session: WaliSession): string {
  return jwt.sign(session, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Verify JWT token wali
 */
export function verifyWaliToken(token: string): WaliSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      waliId: decoded.waliId,
      phone: decoded.phone,
      name: decoded.name,
      santriIds: decoded.santriIds || [],
    }
  } catch {
    return null
  }
}

/**
 * Verify PIN format (6 digit, tidak weak)
 */
export function validatePIN(pin: string): { valid: boolean; error?: string } {
  if (!isValidPINFormat(pin)) {
    return { valid: false, error: "PIN harus 6 digit angka" }
  }
  if (isWeakPIN(pin)) {
    return { valid: false, error: "PIN terlalu lemah, pilih kombinasi lain" }
  }
  return { valid: true }
}

/**
 * Cek apakah wali terkunci (terlalu banyak percobaan login gagal)
 */
export function isWaliLocked(wali: { lockedUntil?: Date | null }): boolean {
  if (!wali.lockedUntil) return false
  return new Date(wali.lockedUntil) > new Date()
}

/**
 * Cek apakah wali bisa request OTP baru (rate limiting)
 */
export function canRequestOTP(wali: {
  otpRequestCount: number
  otpRequestResetAt: Date | null
}): { allowed: boolean; reason?: string } {
  // Reset counter setiap 1 jam
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  if (!wali.otpRequestResetAt || wali.otpRequestResetAt < oneHourAgo) {
    return { allowed: true }
  }
  if (wali.otpRequestCount >= 5) {
    return { allowed: false, reason: "Terlalu banyak request OTP. Coba lagi dalam 1 jam." }
  }
  return { allowed: true }
}

/**
 * Increment OTP request counter
 */
export async function incrementOTPRequest(waliId: string): Promise<void> {
  const wali = await db.wali.findUnique({ where: { id: waliId }, select: { otpRequestCount: true, otpRequestResetAt: true } })
  if (!wali) return

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  if (!wali.otpRequestResetAt || wali.otpRequestResetAt < oneHourAgo) {
    // Reset counter
    await db.wali.update({
      where: { id: waliId },
      data: { otpRequestCount: 1, otpRequestResetAt: new Date() },
    })
  } else {
    await db.wali.update({
      where: { id: waliId },
      data: { otpRequestCount: { increment: 1 } },
    })
  }
}

/**
 * Record failed login attempt, lock jika melebihi batas
 */
export async function recordFailedLogin(waliId: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const wali = await db.wali.findUnique({ where: { id: waliId }, select: { failedLoginAttempts: true } })
  if (!wali) return { locked: false }

  const newAttempts = wali.failedLoginAttempts + 1
  const shouldLock = newAttempts >= 5
  const lockedUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null // lock 15 menit

  await db.wali.update({
    where: { id: waliId },
    data: {
      failedLoginAttempts: newAttempts,
      ...(lockedUntil ? { lockedUntil } : {}),
    },
  })

  return { locked: shouldLock, lockedUntil: lockedUntil || undefined }
}

/**
 * Reset failed login attempts setelah login berhasil
 */
export async function resetFailedLogin(waliId: string): Promise<void> {
  await db.wali.update({
    where: { id: waliId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  })
}

/**
 * Verify bahwa wali tertentu punya akses ke santri tertentu
 */
export async function verifyWaliSantriAccess(
  waliId: string,
  santriId: string,
): Promise<{ allowed: boolean; link?: any; reason?: string }> {
  const link = await db.santriWali.findFirst({
    where: {
      waliId,
      santriId,
      canAccess: true,
      wali: { deletedAt: null },
      santri: { deletedAt: null, status: "AKTIF" },
    },
    include: {
      santri: {
        select: {
          id: true, name: true, nis: true, photoUrl: true,
          kelas: { select: { id: true, name: true, code: true } },
        },
      },
    },
  })

  if (!link) {
    return { allowed: false, reason: "Anda tidak memiliki akses ke santri ini" }
  }
  return { allowed: true, link }
}

/**
 * Get list santri yang bisa diakses wali
 */
export async function getWaliSantriList(waliId: string) {
  const links = await db.santriWali.findMany({
    where: {
      waliId,
      canAccess: true,
      santri: { deletedAt: null, status: "AKTIF" },
    },
    include: {
      santri: {
        select: {
          id: true, name: true, nis: true, gender: true, photoUrl: true,
          kelas: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { isPrimary: "desc" },
  })

  return links.map((link) => ({
    ...link.santri,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
  }))
}
