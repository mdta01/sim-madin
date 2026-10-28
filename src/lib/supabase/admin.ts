/**
 * ============================================================================
 * SUPABASE ADAPTER — Server-side
 * ============================================================================
 * Supabase handles SEMUA: Database (Postgres) + Auth + Storage + Realtime
 *
 * File ini berisi:
 * - `getSupabaseAdmin()` — Supabase client dengan service role key (server-only, bypass RLS)
 * - `verifySupabaseToken()` — verify JWT dari mobile apps (untuk auth nanti)
 * - `isSupabaseConfigured()` — detect env vars
 *
 * Setup:
 * 1. Buat project di https://supabase.com (free tier)
 * 2. Project Settings → API:
 *    - URL: https://xxx.supabase.co
 *    - anon key: untuk client-side
 *    - service_role key: untuk server-side (jangan commit ke Git!)
 * 3. Set env vars:
 *    NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *    SUPABASE_SERVICE_ROLE_KEY=eyJ...  # SERVER-ONLY
 *
 * Untuk database (Prisma):
 *    DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 *    DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].supabase.com:5432/postgres
 * ============================================================================
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { AppSession } from "@/lib/auth/guards"

let cachedAdmin: SupabaseClient | null = null

/**
 * Detect apakah Supabase dikonfigurasi
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Detect apakah service role key tersedia (untuk server-side admin operations)
 */
export function hasSupabaseServiceRole(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY
}

/**
 * Get Supabase admin client (server-side, pakai service_role key yang bypass RLS)
 *
 * ⚠️ Hanya untuk server-side! Jangan import di client components.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured() || !hasSupabaseServiceRole()) {
    return null
  }

  if (cachedAdmin) return cachedAdmin

  cachedAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  return cachedAdmin
}

/**
 * Verify Supabase JWT token (untuk mobile apps auth)
 *
 * Saat mobile apps login via Supabase Auth, dapatkan access_token (JWT).
 * Mobile kirim token via Authorization: Bearer <token>.
 * Server verify token ini via Supabase Admin SDK.
 *
 * Return AppSession jika valid, null jika tidak.
 */
export async function verifySupabaseToken(token: string): Promise<AppSession | null> {
  const admin = getSupabaseAdmin()
  if (!admin) return null

  try {
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data.user) {
      return null
    }

    const user = data.user

    // Cari user di DB Prisma berdasarkan email atau Supabase user ID
    // (assign ke import db di sini supaya tidak circular)
    const { db } = await import("@/lib/db")
    const dbUser = await db.user.findFirst({
      where: {
        OR: [
          { email: user.email || "" },
          { firebaseUid: user.id }, // reuse firebaseUid field untuk Supabase UID
        ],
        deletedAt: null,
        isActive: true,
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    })

    if (!dbUser) return null

    // Sync Supabase UID ke field firebaseUid kalau belum ada
    if (!dbUser.firebaseUid) {
      await db.user.update({
        where: { id: dbUser.id },
        data: {
          firebaseUid: user.id,
          lastLoginAt: new Date(),
        },
      })
    }

    const roles = dbUser.userRoles.map((ur) => ur.role)
    const permissions = new Set<string>()
    for (const role of roles) {
      for (const rp of role.permissions) {
        permissions.add(rp.permission.code)
      }
    }

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        username: dbUser.username,
        phone: dbUser.phone || undefined,
        image: dbUser.avatarUrl,
        roles: roles.map((r) => r.code),
        permissions: Array.from(permissions),
      },
    }
  } catch (err) {
    console.error("[supabase] verifySupabaseToken failed:", err)
    return null
  }
}

/**
 * Get Supabase public URL for storage object
 * Format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
 */
export function getSupabaseStorageUrl(bucket: string, path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return ""
  return `${url}/storage/v1/object/public/${bucket}/${path}`
}
