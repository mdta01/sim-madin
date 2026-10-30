/**
 * ============================================================================
 * SUPABASE AUTH ADMIN — User management (server-only)
 * ============================================================================
 *
 * Helper functions untuk create/list/update/delete user di Supabase Auth
 * (auth.users table — terpisah dari tabel User di Prisma DB kita).
 *
 * Menggunakan Supabase Auth Admin API dengan service_role key (bypass RLS).
 *
 * Setelah create user di Supabase Auth, harus juga create record di Prisma
 * User table dengan field `supabaseUid` di-link ke Supabase user.id.
 *
 * Reference: https://supabase.com/docs/reference/api/admin-api
 * ============================================================================
 */

import { getSupabaseAdmin, isSupabaseConfigured, hasSupabaseServiceRole } from "./admin"

export interface SupabaseAuthUser {
  id: string
  email: string
  email_confirmed_at: string | null
  created_at: string
  last_sign_in_at: string | null
  user_metadata: Record<string, any>
}

/**
 * Create user di Supabase Auth.
 *
 * @returns user.id (Supabase UID) — link ke Prisma User.supabaseUid
 * @throws Error jika Supabase tidak terkonfigurasi atau API call gagal
 */
export async function createSupabaseAuthUser(opts: {
  email: string
  password: string
  fullName?: string
  emailConfirm?: boolean // default: true (skip email verification flow)
}): Promise<{ id: string; email: string }> {
  if (!isSupabaseConfigured() || !hasSupabaseServiceRole()) {
    throw new Error(
      "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY env vars.",
    )
  }

  const supabase = getSupabaseAdmin()!
  const { data, error } = await supabase.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: opts.emailConfirm ?? true,
    user_metadata: opts.fullName ? { name: opts.fullName } : undefined,
  })

  if (error) {
    // Handle common errors gracefully
    if (error.message.includes("already been registered")) {
      throw new Error(`User dengan email ${opts.email} sudah terdaftar di Supabase Auth`)
    }
    throw new Error(`Supabase Auth createUser failed: ${error.message}`)
  }

  if (!data.user) {
    throw new Error("Supabase Auth createUser returned no user")
  }

  return { id: data.user.id, email: data.user.email! }
}

/**
 * List all users di Supabase Auth (paged).
 */
export async function listSupabaseAuthUsers(page = 1, perPage = 100): Promise<SupabaseAuthUser[]> {
  if (!isSupabaseConfigured() || !hasSupabaseServiceRole()) {
    return []
  }

  const supabase = getSupabaseAdmin()!
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage,
  })

  if (error) {
    console.error("[supabase] listUsers failed:", error.message)
    return []
  }

  return (data.users || []).map((u) => ({
    id: u.id,
    email: u.email || "",
    email_confirmed_at: u.email_confirmed_at || null,
    created_at: u.created_at || "",
    last_sign_in_at: u.last_sign_in_at || null,
    user_metadata: u.user_metadata || {},
  }))
}

/**
 * Find Supabase Auth user by email.
 */
export async function findSupabaseAuthUserByEmail(email: string): Promise<SupabaseAuthUser | null> {
  if (!isSupabaseConfigured() || !hasSupabaseServiceRole()) {
    return null
  }

  const supabase = getSupabaseAdmin()!
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error("[supabase] findUserByEmail failed:", error.message)
    return null
  }

  const user = (data.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return null

  return {
    id: user.id,
    email: user.email || "",
    email_confirmed_at: user.email_confirmed_at || null,
    created_at: user.created_at || "",
    last_sign_in_at: user.last_sign_in_at || null,
    user_metadata: user.user_metadata || {},
  }
}

/**
 * Delete user dari Supabase Auth.
 * Use case: ketika user di-hapus dari Prisma User table, juga hapus dari Supabase Auth.
 */
export async function deleteSupabaseAuthUser(supabaseUid: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !hasSupabaseServiceRole()) {
    return false
  }

  const supabase = getSupabaseAdmin()!
  const { error } = await supabase.auth.admin.deleteUser(supabaseUid)

  if (error) {
    console.error(`[supabase] deleteUser failed for ${supabaseUid}:`, error.message)
    return false
  }

  return true
}

/**
 * Update user metadata di Supabase Auth (mis. update name setelah profile edit).
 */
export async function updateSupabaseAuthUser(
  supabaseUid: string,
  updates: {
    email?: string
    password?: string
    fullName?: string
  },
): Promise<boolean> {
  if (!isSupabaseConfigured() || !hasSupabaseServiceRole()) {
    return false
  }

  const supabase = getSupabaseAdmin()!
  const { error } = await supabase.auth.admin.updateUserById(supabaseUid, {
    email: updates.email,
    password: updates.password,
    user_metadata: updates.fullName ? { name: updates.fullName } : undefined,
  })

  if (error) {
    console.error(`[supabase] updateUser failed for ${supabaseUid}:`, error.message)
    return false
  }

  return true
}
