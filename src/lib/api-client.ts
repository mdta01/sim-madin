/**
 * API Helper untuk client-side fetching ke /api/admin/*
 * Auto-include Supabase Auth Bearer token jika tersedia.
 */

import { getSupabaseBrowserClient } from "@/lib/supabase/client"

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") {
    const supabase = getSupabaseBrowserClient()
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` }
      }
    }
  }
  return {}
}

export async function apiGet<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v))
    })
  }
  const headers = await getAuthHeaders()
  const res = await fetch(url.toString(), { cache: "no-store", headers })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiPut<T = any>(path: string, body: any): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    credentials: "include",
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(path, { method: "DELETE", headers, credentials: "include" })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error || `Request failed: ${res.status}`)
  }
  return res.json()
}
