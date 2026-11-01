/**
 * ============================================================================
 * JWT DECODE (HERMES-COMPATIBLE) — Tanpa jose, tanpa WebCrypto
 * ============================================================================
 *
 * Menggantikan jose.jwtVerify() yang crash di Hermes (Android 8) karena
 * jose v5 mengandalkan WebCrypto.subtle yang tidak tersedia di Hermes.
 *
 * Strategi:
 * - Decode JWT payload menggunakan atob() (standar JS, didukung Hermes)
 * - Tidak verifikasi signature di mobile (signature verification dilakukan
 *   server-side di Next.js API setiap request). Mobile hanya perlu parse
 *   payload untuk dapat waliId/phone/name/santriIds dari token yang diterima
 *   dari /api/wali/login.
 *
 * Keamanan:
 * - Token hanya diberikan oleh server setelah verifikasi WhatsApp+PIN
 * - Setiap API call berikutnya tetap diverifikasi di server
 * - Token disimpan di SecureStore (encrypted at rest di Android Keystore)
 * - Token expired setelah 7 hari (cek field `exp` di payload)
 */

/**
 * Decode JWT payload tanpa verifikasi signature (Hermes-compatible).
 *
 * @param token JWT string (format: header.payload.signature)
 * @returns Payload object atau null jika token invalid/expired
 */
export function decodeJwtPayload<T = any>(token: string): T | null {
  try {
    if (!token || typeof token !== "string") return null

    const parts = token.split(".")
    if (parts.length !== 3) return null

    // JWT payload adalah base64url-encoded JSON
    // base64url: ganti '-' jadi '+', '_' jadi '/', tambah padding
    let payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")

    // Padding ke multiple of 4
    const pad = payloadB64.length % 4
    if (pad) {
      payloadB64 += "=".repeat(4 - pad)
    }

    // Decode base64 ke string JSON (atob tersedia di Hermes)
    // Fallback: pakai Buffer jika atob tidak tersedia
    let jsonStr: string
    if (typeof atob === "function") {
      jsonStr = atob(payloadB64)
    } else if (typeof Buffer !== "undefined") {
      jsonStr = Buffer.from(payloadB64, "base64").toString("utf-8")
    } else {
      // Last resort: manual decode
      jsonStr = manualBase64Decode(payloadB64)
    }

    const payload = JSON.parse(jsonStr)

    // Cek expired (jika ada field exp, dalam detik sejak epoch)
    if (payload.exp && typeof payload.exp === "number") {
      const now = Math.floor(Date.now() / 1000)
      if (now >= payload.exp) {
        return null // token expired
      }
    }

    return payload as T
  } catch (e) {
    return null
  }
}

/**
 * Manual base64 decode fallback (jarang dipakai, untuk Hermes lama).
 */
function manualBase64Decode(b64: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  let str = b64.replace(/=+$/, "")
  let output = ""

  for (let bc = 0, bs = 0, buffer = 0, i = 0; i < str.length; i++) {
    const c = chars.indexOf(str.charAt(i))
    if (c === -1) continue
    buffer = (buffer << 6) | c
    bs += 6
    if (bs >= 8) {
      bs -= 8
      output += String.fromCharCode((buffer >> bs) & 0xff)
    }
    bc++
  }

  // Convert binary string to UTF-8 (handle multi-byte chars)
  try {
    return decodeURIComponent(escape(output))
  } catch {
    return output
  }
}

/**
 * Verifikasi token wali (decode payload + check expired).
 * Pengganti jose.jwtVerify() yang kompatibel dengan Hermes.
 *
 * NOTE: Signature verification tidak dilakukan di mobile karena:
 * 1. Token hanya dikeluarkan oleh server setelah WhatsApp+PIN verification
 * 2. Setiap API call diverifikasi di server dengan signature check penuh
 * 3. Mobile hanya butuh parse payload untuk ambil data user
 */
export function verifyWaliTokenPayload(token: string): {
  waliId: string
  phone: string
  name: string
  santriIds: string[]
} | null {
  const payload = decodeJwtPayload<{
    waliId?: string
    phone?: string
    name?: string
    santriIds?: string[]
    exp?: number
  }>(token)

  if (!payload) return null
  if (!payload.waliId || !payload.phone) return null

  return {
    waliId: payload.waliId,
    phone: payload.phone,
    name: payload.name || "",
    santriIds: payload.santriIds || [],
  }
}
