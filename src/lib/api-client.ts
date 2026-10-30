/**
 * ============================================================================
 * API CLIENT — fetch wrapper with timeout, retry & exponential backoff
 * ============================================================================
 *
 * Features:
 *   - Auto-attach Supabase Bearer token (browser-side only)
 *   - Default 10s timeout per request (AbortController)
 *   - Retry on network errors & 5xx with exponential backoff (1s, 2s, 4s)
 *   - No retry on 4xx (client error — retry won't help)
 *   - No retry on 401 (auth failed — re-login needed, not retry)
 *   - Consistent error parsing: prefers `{ error }` from server, falls back to status
 *
 * Usage:
 *   import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
 *   const data = await apiGet<SantriList>("/api/admin/santri", { page: 1, limit: 50 })
 *
 * Custom timeout/retry per call (rare):
 *   await apiGet("/api/admin/santri", undefined, { timeoutMs: 30_000, retries: 0 })
 * ============================================================================
 */

import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// ── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_RETRIES = 2
const BACKOFF_BASE_MS = 1_000 // 1s, 2s, 4s for retry 1, 2, 3

export interface ApiClientOptions {
  /** Per-request timeout in ms (default: 10_000) */
  timeoutMs?: number
  /** Max retry attempts on 5xx/network errors (default: 2) */
  retries?: number
  /** Skip retry entirely — useful for streaming or one-shot uploads */
  noRetry?: boolean
}

// ── Auth header helper ──────────────────────────────────────────────────────
async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") {
    const supabase = getSupabaseBrowserClient()
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          return { Authorization: `Bearer ${session.access_token}` }
        }
      } catch {
        // Supabase session not yet ready — proceed without auth
      }
    }
  }
  return {}
}

// ── Error extraction ────────────────────────────────────────────────────────
async function extractError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body?.error) return body.error
    if (body?.message) return body.message
    // Zod validation error format
    if (body?.issues && Array.isArray(body.issues)) {
      return body.issues.map((i: any) => `${i.path}: ${i.message}`).join("; ")
    }
    return `Request failed: ${res.status}`
  } catch {
    return `Request failed: ${res.status} ${res.statusText || ""}`
  }
}

// ── Core fetch with timeout + retry ─────────────────────────────────────────
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: ApiClientOptions = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, noRetry = false } = opts
  const maxAttempts = noRetry ? 1 : retries + 1

  let lastErr: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      // 4xx — client error, don't retry (retry won't fix it)
      if (res.status >= 400 && res.status < 500) {
        return res
      }
      // 5xx — server error, retry if attempts remain
      if (res.status >= 500 && attempt < maxAttempts) {
        await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt - 1))
        continue
      }
      return res
    } catch (err: any) {
      clearTimeout(timeoutId)
      lastErr = err

      // Timeout / network error — retry if attempts remain
      const isAbort = err?.name === "AbortError"
      const isNetwork = err?.message?.includes("network") || err?.message?.includes("fetch")
      if ((isAbort || isNetwork) && attempt < maxAttempts) {
        await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt - 1))
        continue
      }
      throw err
    }
  }

  // Should never reach here — loop returns or throws above
  throw lastErr ?? new Error("fetchWithRetry: unknown state")
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function apiGet<T = any>(
  path: string,
  params?: Record<string, any>,
  opts?: ApiClientOptions,
): Promise<T> {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v))
    })
  }
  const headers = await getAuthHeaders()
  const res = await fetchWithRetry(
    url.toString(),
    { method: "GET", headers, cache: "no-store" },
    opts,
  )
  if (!res.ok) {
    throw new Error(await extractError(res))
  }
  return res.json()
}

export async function apiPost<T = any>(
  path: string,
  body?: any,
  opts?: ApiClientOptions,
): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetchWithRetry(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
    },
    opts,
  )
  if (!res.ok) {
    throw new Error(await extractError(res))
  }
  return res.json()
}

export async function apiPut<T = any>(
  path: string,
  body: any,
  opts?: ApiClientOptions,
): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetchWithRetry(
    path,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      credentials: "include",
    },
    opts,
  )
  if (!res.ok) {
    throw new Error(await extractError(res))
  }
  return res.json()
}

export async function apiDelete<T = any>(
  path: string,
  opts?: ApiClientOptions,
): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetchWithRetry(
    path,
    { method: "DELETE", headers, credentials: "include" },
    opts,
  )
  if (!res.ok) {
    throw new Error(await extractError(res))
  }
  return res.json()
}

/**
 * Upload a file with progress tracking (for large uploads).
 * Uses XMLHttpRequest (not fetch) because fetch() doesn't support upload progress.
 */
export function apiUpload(
  path: string,
  file: File | Blob,
  opts?: {
    fieldName?: string
    metadata?: Record<string, string>
    onProgress?: (percent: number) => void
  },
): Promise<{ url: string; filename: string }> {
  return new Promise(async (resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    const fieldName = opts?.fieldName || "file"
    formData.append(fieldName, file)
    if (opts?.metadata) {
      Object.entries(opts.metadata).forEach(([k, v]) => formData.append(k, v))
    }

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && opts?.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener("load", async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data)
        } catch {
          reject(new Error("Invalid JSON response from upload endpoint"))
        }
      } else {
        try {
          const body = JSON.parse(xhr.responseText)
          reject(new Error(body?.error || `Upload failed: ${xhr.status}`))
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out")))

    // Attach auth header if available
    const authHeaders = await getAuthHeaders()
    xhr.open("POST", path)
    Object.entries(authHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    // Don't set Content-Type — browser will set it with multipart boundary
    xhr.send(formData)
  })
}
