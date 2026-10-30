import type { NextRequest } from "next/server"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { verifySupabaseToken, isSupabaseConfigured } from "@/lib/supabase/admin"

/**
 * Auth Helpers — Server-side
 * ============================================================================
 * Supabase-only authentication (NextAuth & Firebase fallbacks sudah dihapus).
 *
 * Auth flow:
 *   - Web admin login via login-overlay.tsx → supabase.auth.signInWithPassword()
 *   - Mobile apps login via Supabase Auth SDK → dapat access_token
 *   - Client kirim access_token via Authorization: Bearer <token>
 *   - Server verify via Supabase Auth REST API (verifySupabaseToken)
 *
 * Jika user belum login atau token expired → return null → caller kirim 401.
 * ============================================================================
 */

export interface AppSession {
  user: {
    id: string
    email: string
    name: string
    username: string
    phone?: string
    image?: string | null
    roles: string[]
    permissions: string[]
  }
}

/**
 * Ambil session saat ini (atau null jika belum login).
 *
 * Verifikasi Bearer token via Supabase Auth API. Token dikirim via
 * Authorization header oleh client (web admin & mobile apps).
 *
 * Note: NextAuth fallback sudah dihapus. Web admin HARUS kirim Supabase
 * access_token via Authorization header (lihat src/lib/api-client.ts).
 */
export async function getSession(req?: { headers: Headers }): Promise<AppSession | null> {
  // Get headers — either from req param or from Next.js headers() function
  let headerObj: Headers | undefined = req?.headers
  if (!headerObj) {
    try {
      headerObj = await headers()
    } catch {
      // headers() might not work in all contexts (e.g. during static gen)
    }
  }

  if (!headerObj) return null

  // Cek Bearer token
  const authHeader = headerObj.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)

  // Supabase token verification (primary & only mode)
  if (isSupabaseConfigured()) {
    return await verifySupabaseToken(token)
  }

  // Supabase tidak terkonfigurasi — return null
  console.warn("[auth] Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY env vars.")
  return null
}

/**
 * Harus login. Return session atau null.
 * Pass `req` jika ingin support Firebase Bearer token (mobile).
 */
export async function requireAuth(req?: NextRequest): Promise<AppSession | null> {
  return await getSession(req ? { headers: req.headers } : undefined)
}

/**
 * Cek apakah user punya permission tertentu.
 * Permission format: "module:action", contoh "santri:create"
 */
export function hasPermission(session: AppSession | null, permission: string): boolean {
  if (!session?.user?.permissions) return false
  // Super Admin bypass — selalu punya semua permission
  if (session.user.roles?.includes("SUPER_ADMIN")) return true
  return session.user.permissions.includes(permission)
}

/**
 * Cek apakah user punya salah satu dari role yang diberikan.
 */
export function hasRole(session: AppSession | null, ...roles: string[]): boolean {
  if (!session?.user?.roles) return false
  return roles.some((r) => session.user.roles.includes(r))
}

/**
 * Kombinasi auth + permission check untuk API route.
 * Return { session } jika lolos, atau { error: NextResponse 401/403 } jika gagal.
 *
 * @example
 * const guard = await requireApiPermission("santri:create", req)
 * if (guard.error) return guard.error
 * const session = guard.session!
 */
export async function requireApiPermission(
  permission: string,
  req?: NextRequest,
): Promise<{ session: AppSession; error?: undefined } | { session?: undefined; error: NextResponse }> {
  const session = await getSession(req ? { headers: req.headers } : undefined)
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized", message: "Anda harus login terlebih dahulu" },
        { status: 401 },
      ),
    }
  }
  if (!hasPermission(session, permission)) {
    return {
      error: NextResponse.json(
        {
          error: "Forbidden",
          message: `Anda tidak memiliki izin: ${permission}`,
          requiredPermission: permission,
        },
        { status: 403 },
      ),
    }
  }
  return { session }
}

/**
 * Variasi: hanya butuh login (sudah auth), tanpa permission check.
 * Cocok untuk endpoint yang spesifik per user (mis. profil sendiri).
 */
export async function requireApiAuth(
  req?: NextRequest,
): Promise<{ session: AppSession; error?: undefined } | { session?: undefined; error: NextResponse }> {
  const session = await getSession(req ? { headers: req.headers } : undefined)
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized", message: "Anda harus login terlebih dahulu" },
        { status: 401 },
      ),
    }
  }
  return { session }
}

/**
 * Audit log helper — catat perubahan penting ke database.
 *
 * @example
 * await logAudit(session, "CREATE", "SANTRI", santri.id, { name: santri.name })
 *
 * Security: sensitive fields in `changes` are automatically redacted
 * by `redactSensitive()` before being persisted. This prevents accidental
 * logging of credentials (passwordHash, pinHash, otpCode, tokens, etc.).
 */
export async function logAudit(
  session: AppSession | null,
  action: string,
  module: string,
  entityId?: string,
  changes?: Record<string, unknown>,
  req?: { headers: Headers },
): Promise<void> {
  try {
    const ip = req?.headers?.get("x-forwarded-for") || req?.headers?.get("x-real-ip") || undefined
    const userAgent = req?.headers?.get("user-agent") || undefined

    // Redact sensitive fields before serializing to JSON
    const sanitizedChanges = changes ? redactSensitive(changes) : null

    await db.auditLog.create({
      data: {
        userId: session?.user?.id,
        action,
        module,
        entityId,
        entityType: module,
        changes: sanitizedChanges ? JSON.stringify(sanitizedChanges) : null,
        ip,
        userAgent,
      },
    })
  } catch (e) {
    // Jangan lempar error audit log agar tidak mengganggu flow utama
    console.error("[audit log] error:", e)
  }
}

/**
 * Field names that should NEVER be logged to the audit trail.
 * Match is case-insensitive (so it catches both `password` and `passwordHash`).
 *
 * Add to this list as new sensitive fields are introduced.
 */
const SENSITIVE_KEYS = [
  "password",
  "passwordhash",
  "pin",
  "pinhash",
  "otp",
  "otpcode",
  "otprequestscount",
  "token",
  "activationtoken",
  "accesstoken",
  "refreshtoken",
  "session",
  "secret",
  "apikey",
  "privatekey",
  "credential",
  "authorization",
]

/**
 * Recursively redact sensitive fields in any value (object, array, or primitive).
 *
 * Rules:
 *   - Object keys matching SENSITIVE_KEYS (case-insensitive) → "[REDACTED]"
 *   - Strings that look like JWT (eyJ...) or long hex/b64 → "[REDACTED]"
 *   - Nested objects/arrays are traversed recursively
 *   - Maximum depth of 10 to prevent infinite loops on circular refs
 */
function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 10) return "[MAX_DEPTH]"
  if (value === null || value === undefined) return value

  if (typeof value === "string") {
    // Detect JWT-like or very long hex/base64 secrets
    if (value.startsWith("eyJ") && value.length > 30) return "[REDACTED]"
    if (/^[a-f0-9]{40,}$/i.test(value)) return "[REDACTED]" // SHA-1+ hex
    if (/^[A-Za-z0-9+/]{40,}={0,2}$/.test(value)) return "[REDACTED]" // base64
    return value
  }

  if (Array.isArray(value)) {
    return value.map((v) => redactSensitive(v, depth + 1))
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        result[key] = "[REDACTED]"
      } else {
        result[key] = redactSensitive(obj[key], depth + 1)
      }
    }
    return result
  }

  return value
}
