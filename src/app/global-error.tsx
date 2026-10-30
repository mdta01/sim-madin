"use client"

import { useEffect } from "react"

/**
 * app/global-error.tsx — Last-resort error boundary
 *
 * Catches errors that escape `app/error.tsx` — specifically errors thrown
 * by `app/layout.tsx` itself (because error.tsx is rendered inside layout,
 * it can't catch layout errors).
 *
 * MUST include its own <html> + <body> tags because layout.tsx is bypassed
 * when this component renders.
 *
 * https://nextjs.org/docs/app/building-your-application/routing/error-handling#global-error-handling-optional
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[global-error] Unhandled error in root layout:", error)
  }, [error])

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#f8fafc",
          color: "#1e293b",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "4rem",
                height: "4rem",
                margin: "0 auto 1rem",
                borderRadius: "9999px",
                background: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
              }}
            >
              ⚠️
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Aplikasi error
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#64748b",
                marginBottom: "1.5rem",
              }}
            >
              Mohon maaf, terjadi error kritis pada aplikasi. Silakan refresh
              halaman atau hubungi administrator jika masalah berlanjut.
            </p>
            <button
              onClick={reset}
              style={{
                background: "#7c3aed",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.5rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Coba lagi
            </button>
            {process.env.NODE_ENV === "development" && (
              <pre
                style={{
                  marginTop: "1rem",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  background: "#f1f5f9",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  overflow: "auto",
                  color: "#dc2626",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
