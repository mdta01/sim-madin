/**
 * Client-side wali auth helpers
 * (Server-side pakai jsonwebtoken langsung, ini versi client yang pakai js-jwt)
 *
 * Untuk verifikasi yang aman di client, hanya decode (tidak verify signature).
 * Signature verification dilakukan di server saat API call.
 */

import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "sim-madin-dev-secret-change-in-production"

export interface WaliSession {
  waliId: string
  phone: string
  name: string
  santriIds: string[]
}

/**
 * Decode wali JWT token (client-side, verify signature jika bisa)
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
 * Cek apakah token expired (tanpa verify signature)
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded?.exp) return false
    return Date.now() >= decoded.exp * 1000
  } catch {
    return true
  }
}
