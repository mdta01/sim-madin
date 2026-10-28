/**
 * Client-side wali auth helpers
 *
 * ⚠️ Pakai `jose` (bukan `jsonwebtoken`) karena jose browser-compatible
 * (tidak butuh Node.js Buffer/crypto).
 *
 * Untuk security: signature verification di client hanya untuk UX (cek expired).
 * Verification sebenarnya tetap dilakukan di server saat API call.
 */

import { jwtVerify, decodeJwt } from "jose"

// NEXT_PUBLIC_ prefix wajib agar ter-expose ke browser
const JWT_SECRET_STRING =
  process.env.NEXT_PUBLIC_WALI_JWT_SECRET ||
  process.env.NEXT_PUBLIC_NEXTAUTH_SECRET ||
  "sim-madin-dev-secret-change-in-production-2025"

// Encode secret ke Uint8Array (format yang jose butuhkan)
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING)

export interface WaliSession {
  waliId: string
  phone: string
  name: string
  santriIds: string[]
}

/**
 * Verify wali JWT token (client-side, pakai jose untuk browser compat).
 */
export async function verifyWaliToken(token: string): Promise<WaliSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      waliId: payload.waliId as string,
      phone: payload.phone as string,
      name: payload.name as string,
      santriIds: (payload.santriIds as string[]) || [],
    }
  } catch {
    return null
  }
}

/**
 * Cek apakah token expired (tanpa verify signature, lebih cepat)
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJwt(token)
    if (!decoded?.exp) return false
    return Date.now() >= decoded.exp * 1000
  } catch {
    return true
  }
}
