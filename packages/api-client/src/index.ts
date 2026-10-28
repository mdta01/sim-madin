/**
 * ============================================================================
 * API CLIENT — SIM MADIN
 * ============================================================================
 * Typed API client yang bisa dipakai oleh:
 * - apps/super-admin (Next.js) — pakai base URL relatif "/"
 * - apps/mobile-* (Expo RN) — pakai base URL absolute (mis. https://api.madin.id)
 *
 * Cara pakai:
 *   import { createApiClient } from "@sim-madin/api-client"
 *   const api = createApiClient({ baseUrl: "/", getToken: async () => session.jwt })
 *   const santri = await api.get("/api/admin/santri")
 *
 * Auth: kirim cookie (web) atau Bearer token (mobile).
 * Web (NextAuth): tidak perlu set Authorization header, browser kirim cookie otomatis.
 * Mobile (Firebase): set getToken untuk dapatkan Firebase ID token.
 * ============================================================================
 */

export interface ApiClientConfig {
  baseUrl?: string
  getToken?: () => Promise<string | null>
  fetch?: typeof fetch
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function createApiClient(config: ApiClientConfig = {}) {
  const baseUrl = config.baseUrl || ""
  const fetchFn = config.fetch || fetch

  async function request<T = any>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = path.startsWith("http") ? path : `${baseUrl}${path}`

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }

    // Set Content-Type for JSON body (kecuali FormData)
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json"
    }

    // Attach token (mobile) — web pakai cookie otomatis
    if (config.getToken) {
      const token = await config.getToken()
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
    }

    const res = await fetchFn(url, {
      ...options,
      headers,
      credentials: "include", // kirim cookie untuk web
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new ApiError(
        errBody?.message || errBody?.error || `Request failed: ${res.status}`,
        res.status,
        errBody?.error,
        errBody,
      )
    }

    return res.json()
  }

  return {
    get: <T = any>(path: string, params?: Record<string, any>) => {
      const search = params
        ? "?" + new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v !== undefined && v !== null && v !== "")
              .map(([k, v]) => [k, String(v)]),
          ).toString()
        : ""
      return request<T>(`${path}${search}`)
    },

    post: <T = any>(path: string, body?: any) => {
      const isFormData = body instanceof FormData
      return request<T>(path, {
        method: "POST",
        body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
      })
    },

    put: <T = any>(path: string, body: any) => {
      const isFormData = body instanceof FormData
      return request<T>(path, {
        method: "PUT",
        body: isFormData ? body : JSON.stringify(body),
      })
    },

    delete: <T = any>(path: string) => {
      return request<T>(path, { method: "DELETE" })
    },

    upload: <T = any>(path: string, file: File | Blob, fieldName = "file", extra?: Record<string, string>) => {
      const formData = new FormData()
      formData.append(fieldName, file)
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => formData.append(k, v))
      }
      return request<T>(path, { method: "POST", body: formData })
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
