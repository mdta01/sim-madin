import { getServerSession } from "next-auth"
import type { NextRequest } from "next/server"
import { authOptions } from "@/lib/auth/auth-options"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { verifyBearerToken, isFirebaseConfigured } from "@/lib/firebase/admin"
import { verifySupabaseToken, isSupabaseConfigured } from "@/lib/supabase/admin"

/**
 * Auth Helpers — Server-side
 * ============================================================================
 * Mendukung 3 mode autentikasi (priority order):
 *
 * 1. Supabase Auth (production) — Bearer token via Authorization header
 *    Mobile apps login via Supabase Auth SDK, kirim access_token ke API.
 *    Server verify via Supabase Admin SDK.
 *
 * 2. Firebase Auth (legacy/alternative) — Bearer token via Authorization header
 *    Untuk mobile apps yang pakai Firebase Auth.
 *
 * 3. NextAuth (web admin) — cookie-based, otomatis dikirim browser
 *    Untuk web Super Admin.
 *
 * Auto-detect:
 * - Cek Authorization header dulu (Supabase → Firebase → fallback ke NextAuth)
 * - Fallback ke NextAuth session cookie (web)
 *
 * Helper functions tetap sama untuk caller.
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
 * Auto-detect: cek Bearer token (mobile) dulu, fallback ke NextAuth session (web).
 *
 * Priority:
 * 1. Supabase Bearer token (jika SUPABASE_* env di-set)
 * 2. Firebase Bearer token (jika FIREBASE_* env di-set)
 * 3. NextAuth session cookie (web)
 */
export async function getSession(req?: { headers: Headers }): Promise<AppSession | null> {
  // 1. Cek Bearer token (untuk mobile apps) — Supabase dulu, lalu Firebase
  if (req?.headers) {
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7)

      // Try Supabase token verification
      if (isSupabaseConfigured()) {
        const supabaseSession = await verifySupabaseToken(token)
        if (supabaseSession) return supabaseSession
      }

      // Fallback: Firebase token verification
      if (isFirebaseConfigured()) {
        const firebaseSession = await verifyBearerToken(authHeader)
        if (firebaseSession) return firebaseSession
      }
    }
  }

  // 2. Fallback ke NextAuth session (untuk web)
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session as unknown as AppSession
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

    await db.auditLog.create({
      data: {
        userId: session?.user?.id,
        action,
        module,
        entityId,
        entityType: module,
        changes: changes ? JSON.stringify(changes) : null,
        ip,
        userAgent,
      },
    })
  } catch (e) {
    // Jangan lempar error audit log agar tidak mengganggu flow utama
    console.error("[audit log] error:", e)
  }
}
