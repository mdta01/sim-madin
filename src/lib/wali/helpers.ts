/**
 * ============================================================================
 * NIS GENERATOR — Auto-generate Nomor Induk Santri
 * ============================================================================
 * Format: YY + NNNNNN (2 digit tahun masuk + 6 digit urut per tahun)
 * Contoh: 26000001, 26000002, ..., 27000001 (untuk 2027)
 * ============================================================================
 */

import { db } from "@/lib/db"

/**
 * Generate NIS otomatis untuk tahun tertentu.
 * Format: YY + NNNNNN (8 digit total).
 *
 * @param year Tahun masuk santri (default: tahun sekarang)
 * @returns NIS string, mis. "26000001"
 */
export async function generateNIS(year: number = new Date().getFullYear()): Promise<string> {
  const yearPrefix = String(year).slice(-2)

  const existingSantri = await db.santri.findMany({
    where: {
      nis: { startsWith: yearPrefix },
    },
    select: { nis: true },
    orderBy: { nis: "desc" },
  })

  let nextSequence = 1
  if (existingSantri.length > 0) {
    const maxNis = existingSantri[0].nis
    const sequenceStr = maxNis.slice(2)
    const lastSequence = parseInt(sequenceStr, 10)
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1
    }
  }

  const nis = `${yearPrefix}${String(nextSequence).padStart(6, "0")}`
  return nis
}

export function isValidNISFormat(nis: string): boolean {
  return /^\d{8}$/.test(nis)
}

export async function isNISTaken(nis: string, excludeSantriId?: string): Promise<boolean> {
  const existing = await db.santri.findFirst({
    where: {
      nis,
      ...(excludeSantriId ? { NOT: { id: excludeSantriId } } : {}),
      deletedAt: null,
    },
    select: { id: true },
  })
  return !!existing
}

/**
 * Normalize nomor WhatsApp ke format 62xxx
 */
export function normalizeWhatsApp(input: string): string | null {
  if (!input) return null
  let trimmed = input.trim().replace(/[\s\-()]/g, "")

  if (trimmed.startsWith("+62")) {
    trimmed = trimmed.slice(1)
  } else if (trimmed.startsWith("08")) {
    trimmed = "628" + trimmed.slice(2)
  } else if (trimmed.startsWith("8")) {
    trimmed = "62" + trimmed
  } else if (!trimmed.startsWith("62")) {
    return null
  }

  if (!/^\d{10,15}$/.test(trimmed)) return null
  return trimmed
}

export function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return "-"
  if (phone.startsWith("62")) {
    return "0" + phone.slice(2)
  }
  return phone
}

export function generateOTP(): string {
  let otp = ""
  for (let i = 0; i < 6; i++) {
    otp += Math.floor(Math.random() * 10).toString()
  }
  if (otp === "000000" || otp === "123456") {
    return generateOTP()
  }
  return otp
}

export function generateActivationToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

const WEAK_PINS = new Set([
  "000000", "111111", "222222", "333333", "444444",
  "555555", "666666", "777777", "888888", "999999",
  "123456", "654321", "112233", "123123", "111222",
])

export function isWeakPIN(pin: string): boolean {
  return WEAK_PINS.has(pin)
}

export function isValidPINFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}
