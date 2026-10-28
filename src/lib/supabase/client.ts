/**
 * ============================================================================
 * SUPABASE CLIENT — Client-side (untuk browser & mobile)
 * ============================================================================
 * File ini untuk komponen client (browser) & mobile apps.
 *
 * ⚠️ Penting: JANGAN pakai service_role key di sini!
 * Hanya pakai anon key (public), aman untuk di-expose ke client.
 *
 * Cara pakai di Next.js client component:
 *   "use client"
 *   import { getSupabaseBrowserClient } from "@/lib/supabase/client"
 *   const supabase = getSupabaseBrowserClient()
 *   await supabase.auth.signInWithPassword({ email, password })
 *
 * Cara pakai di Expo (mobile apps):
 *   import { createClient } from "@supabase/supabase-js"
 *   import * as SecureStore from "expo-secure-store"
 *   const supabase = createClient(URL, ANON_KEY, {
 *     auth: { storage: SecureStoreAdapter, autoRefreshToken: true }
 *   })
 * ============================================================================
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

/**
 * Get Supabase client untuk browser (anon key, aman untuk client)
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

/**
 * Cek apakah Supabase client tersedia di browser
 */
export function isSupabaseClientAvailable(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
