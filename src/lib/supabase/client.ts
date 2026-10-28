/**
 * ============================================================================
 * SUPABASE CLIENT — Client-side (untuk browser & mobile)
 * ============================================================================
 * File ini untuk komponen client (browser) & mobile apps.
 *
 * ⚠️ Penting: JANGAN pakai service_role key di sini!
 * Hanya pakai anon key (public), aman untuk di-expose ke client.
 *
 * Singleton pattern untuk menghindari "Multiple GoTrueClient instances" warning.
 * ============================================================================
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

let cachedClient: SupabaseClient | null = null

/**
 * Get Supabase client untuk browser (anon key, aman untuk client)
 * Singleton — hanya buat 1 instance per browser.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  if (cachedClient) return cachedClient

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return cachedClient
}

/**
 * Cek apakah Supabase client tersedia di browser
 */
export function isSupabaseClientAvailable(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
