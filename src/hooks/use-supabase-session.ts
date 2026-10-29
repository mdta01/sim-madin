"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react"
import { getSupabaseBrowserClient, isSupabaseClientAvailable } from "@/lib/supabase/client"
import type { Session } from "@supabase/supabase-js"

/**
 * Hook untuk manage Supabase Auth session di client-side.
 *
 * Replaces NextAuth's useSession() for Super Admin login.
 *
 * Usage:
 *   const { session, user, loading, signOut } = useSupabaseSession()
 *   if (loading) return <Spinner />
 *   if (!session) return <Login />
 *   return <Dashboard user={user} />
 */
export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseClientAvailable()) {
      setLoading(false)
      return
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
  }, [])

  const user = session?.user || null

  return {
    session,
    user,
    loading,
    signOut,
    // Convenience: get access token for API calls
    accessToken: session?.access_token || null,
  }
}

/**
 * Get current Supabase access token (for API calls).
 * Returns null if not logged in or Supabase not configured.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseClientAvailable()) return null
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}
