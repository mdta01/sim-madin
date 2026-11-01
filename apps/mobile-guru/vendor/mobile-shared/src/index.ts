/**
 * @sim-madin/mobile-shared
 * Shared code khusus untuk mobile apps (Expo React Native)
 * - Auth helpers (Supabase + Wali JWT)
 * - API client (fetch dengan Bearer token)
 * - Types (re-export dari @sim-madin/shared)
 * - Constants (re-export dari @sim-madin/shared)
 * - Storage adapter (AsyncStorage untuk React Native)
 */

export * from "../../shared/src/constants"
export * from "../../shared/src/types"
export * from "../../shared/src/utils"
export * from "../../shared/src/theme"
export * from "./realtime"
export * from "./skeleton"
export * from "./network-status"

// ============================================================================
// MOBILE AUTH — Supabase Auth + Wali JWT
// ============================================================================

import * as SecureStore from "expo-secure-store"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
// jose removed — use simple base64 JWT decode instead (Hermes/Android 8 compat)

// Supabase client untuk mobile (singleton)
let supabaseClient: SupabaseClient | null = null

export function getMobileSupabase(): SupabaseClient | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  if (supabaseClient) return supabaseClient

  supabaseClient = createClient(url, anonKey, {
    auth: {
      storage: {
        getItem: async (key: string) => {
          try {
            return await SecureStore.getItemAsync(key)
          } catch {
            return null
          }
        },
        setItem: async (key: string, value: string) => {
          try {
            await SecureStore.setItemAsync(key, value)
          } catch {}
        },
        removeItem: async (key: string) => {
          try {
            await SecureStore.deleteItemAsync(key)
          } catch {}
        },
      },
      autoRefreshToken: true,
      persistSession: true,
    },
  })
  return supabaseClient
}

// ============================================================================
// WALI AUTH (WhatsApp + PIN) — Mobile version
// ============================================================================

const WALI_JWT_SECRET =
  process.env.EXPO_PUBLIC_WALI_JWT_SECRET ||
  "sim-madin-dev-secret-change-in-production-2025"

export interface WaliSession {
  waliId: string
  phone: string
  name: string
  santriIds: string[]
}

export async function verifyWaliTokenMobile(token: string): Promise<WaliSession | null> {
  try {
    // Simple JWT decode without crypto verification (Hermes/Android 8 compat)
    // JWT format: header.payload.signature (base64 encoded)
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(
      atob(parts[1])
    )
    // Check expiry
    if (payload.exp && Date.now() >= payload.exp * 1000) return null
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

// Storage helpers untuk wali session
export async function saveWaliSession(token: string, wali: any, santriList: any[]) {
  await SecureStore.setItemAsync("waliToken", token)
  await SecureStore.setItemAsync("waliData", JSON.stringify(wali))
  await SecureStore.setItemAsync("waliSantri", JSON.stringify(santriList))
}

export async function loadWaliSession(): Promise<{ token: string; wali: any; santriList: any[] } | null> {
  try {
    const token = await SecureStore.getItemAsync("waliToken")
    const wali = await SecureStore.getItemAsync("waliData")
    const santri = await SecureStore.getItemAsync("waliSantri")
    if (token && wali && santri) {
      const session = await verifyWaliTokenMobile(token)
      if (session) {
        return { token, wali: JSON.parse(wali), santriList: JSON.parse(santri) }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function clearWaliSession() {
  await SecureStore.deleteItemAsync("waliToken")
  await SecureStore.deleteItemAsync("waliData")
  await SecureStore.deleteItemAsync("waliSantri")
}

// ============================================================================
// API CLIENT — Mobile version (fetch dengan Bearer token)
// ============================================================================

export class MobileApiClient {
  private baseUrl: string
  private getToken: () => Promise<string | null>
  private onTokenExpired?: () => Promise<void>

  constructor(config: {
    baseUrl: string
    getToken: () => Promise<string | null>
    onTokenExpired?: () => Promise<void>
  }) {
    this.baseUrl = config.baseUrl
    this.getToken = config.getToken
    this.onTokenExpired = config.onTokenExpired
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken()
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }

  /**
   * Handle non-OK response. If 401 and onTokenExpired callback is configured,
   * invoke it (e.g. refresh token / re-auth) and signal retry. Otherwise throw.
   * Returns true if the caller should retry the request once.
   */
  private async handleUnauthorized(): Promise<boolean> {
    if (this.onTokenExpired) {
      try {
        await this.onTokenExpired()
        return true // caller should retry once with refreshed token
      } catch {
        // refresh failed — fall through to throw
      }
    }
    throw new Error("Sesi berakhir, silakan login kembali")
  }

  async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    const buildUrl = () => {
      const url = new URL(`${this.baseUrl}${path}`)
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            url.searchParams.set(k, String(v))
          }
        })
      }
      return url.toString()
    }

    let headers = await this.getHeaders()
    let res = await fetch(buildUrl(), { headers })

    if (res.status === 401 && (await this.handleUnauthorized())) {
      // Retry once with refreshed token
      headers = await this.getHeaders()
      res = await fetch(buildUrl(), { headers })
    }

    if (!res.ok) {
      let errorMsg = `Request failed: ${res.status}`
      try {
        const err = await res.json()
        errorMsg = err?.error || err?.message || errorMsg
      } catch {
        // Response bukan JSON — pakai status text
        errorMsg = `${errorMsg} ${res.statusText || ""}`.trim()
      }
      throw new Error(errorMsg)
    }
    try {
      return await res.json()
    } catch {
      throw new Error("Server returned non-JSON response")
    }
  }

  async post<T = any>(path: string, body?: any): Promise<T> {
    const doFetch = async () => {
      const headers = await this.getHeaders()
      return fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    }

    let res = await doFetch()
    if (res.status === 401 && (await this.handleUnauthorized())) {
      res = await doFetch()
    }

    if (!res.ok) {
      let errorMsg = `Request failed: ${res.status}`
      try {
        const err = await res.json()
        errorMsg = err?.error || err?.message || errorMsg
      } catch {
        errorMsg = `${errorMsg} ${res.statusText || ""}`.trim()
      }
      throw new Error(errorMsg)
    }
    try {
      return await res.json()
    } catch {
      throw new Error("Server returned non-JSON response")
    }
  }

  async put<T = any>(path: string, body: any): Promise<T> {
    const doFetch = async () => {
      const headers = await this.getHeaders()
      return fetch(`${this.baseUrl}${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      })
    }

    let res = await doFetch()
    if (res.status === 401 && (await this.handleUnauthorized())) {
      res = await doFetch()
    }

    if (!res.ok) {
      let errorMsg = `Request failed: ${res.status}`
      try {
        const err = await res.json()
        errorMsg = err?.error || err?.message || errorMsg
      } catch {
        errorMsg = `${errorMsg} ${res.statusText || ""}`.trim()
      }
      throw new Error(errorMsg)
    }
    try {
      return await res.json()
    } catch {
      throw new Error("Server returned non-JSON response")
    }
  }

  async delete<T = any>(path: string): Promise<T> {
    const doFetch = async () => {
      const headers = await this.getHeaders()
      return fetch(`${this.baseUrl}${path}`, {
        method: "DELETE",
        headers,
      })
    }

    let res = await doFetch()
    if (res.status === 401 && (await this.handleUnauthorized())) {
      res = await doFetch()
    }

    if (!res.ok) {
      let errorMsg = `Request failed: ${res.status}`
      try {
        const err = await res.json()
        errorMsg = err?.error || err?.message || errorMsg
      } catch {
        errorMsg = `${errorMsg} ${res.statusText || ""}`.trim()
      }
      throw new Error(errorMsg)
    }
    try {
      return await res.json()
    } catch {
      throw new Error("Server returned non-JSON response")
    }
  }
}

// ============================================================================
// WHATSAPP HELPER
// ============================================================================

export function normalizeWhatsApp(input: string): string | null {
  if (!input) return null
  let trimmed = input.trim().replace(/[\s\-()]/g, "")
  if (trimmed.startsWith("+62")) {
    trimmed = trimmed.slice(1)
  } else if (trimmed.startsWith("08")) {
    trimmed = "628" + trimmed.slice(2)
  } else if (trimmed.startsWith("8")) {
    trimmed = "62" + trimmed
  } else if (!trimmed.startsWith("62")) {
    return null
  }
  if (!/^\d{10,15}$/.test(trimmed)) return null
  return trimmed
}

export function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return "-"
  if (phone.startsWith("62")) {
    return "0" + phone.slice(2)
  }
  return phone
}
