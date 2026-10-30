"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"

/**
 * app/error.tsx — Route-level error boundary
 *
 * Catches runtime errors thrown by ANY component or async server component
 * inside the (admin) or any other route segment. Renders a fallback UI
 * with a "Try again" button that calls `reset()` (Next.js-provided).
 *
 * Note: this does NOT catch errors in:
 *   - `layout.tsx` itself (use `global-error.tsx` for that)
 *   - Server Components during streaming (handled separately)
 *
 * https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console + Sentry/error-tracking service in production
    console.error("[app/error] Unhandled error:", error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold">Terjadi kesalahan</h2>
          <p className="text-sm text-muted-foreground">
            Mohon maaf, halaman yang Anda akses mengalami error. Tim kami sudah
            diberi notifikasi otomatis. Silakan coba lagi.
          </p>
          {process.env.NODE_ENV === "development" && (
            <details className="text-left mt-3 rounded-lg border bg-muted/40 p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Detail error (development only)
              </summary>
              <pre className="mt-2 text-[11px] overflow-auto whitespace-pre-wrap break-all text-red-600 dark:text-red-400">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
                {error.digest && `\n\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <Button onClick={reset} variant="default">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Coba lagi
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            <Home className="h-4 w-4 mr-1.5" />
            Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
