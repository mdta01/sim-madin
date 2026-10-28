"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Loader2, GraduationCap } from "lucide-react"
import { LoginOverlay } from "@/components/auth/login-overlay"
import { AdminLayout } from "@/components/admin/admin-layout"
import { WaliLoginOverlay } from "@/components/wali/wali-login-overlay"
import { WaliDashboard } from "@/components/wali/wali-dashboard"
import { verifyWaliToken } from "@/lib/wali/auth-client"

type Mode = "admin" | "wali"

export function AuthGate() {
  const { data: session, status } = useSession()
  const [waliToken, setWaliToken] = useState<string | null>(null)
  const [waliData, setWaliData] = useState<{ id: string; name: string; phone: string; email?: string } | null>(null)
  const [waliSantriList, setWaliSantriList] = useState<any[]>([])

  // Detect mode from URL query — pakai lazy initializer supaya tidak setState di effect
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "admin"
    const url = new URL(window.location.href)
    return url.searchParams.get("mode") === "wali" ? "wali" : "admin"
  })

  // Try restore wali session on mount (only if mode is wali)
  useEffect(() => {
    if (mode !== "wali") return

    const savedToken = localStorage.getItem("waliToken")
    const savedWali = localStorage.getItem("waliData")
    const savedSantri = localStorage.getItem("waliSantri")
    if (savedToken && savedWali && savedSantri) {
      const sessionData = verifyWaliToken(savedToken)
      if (sessionData) {
        setWaliToken(savedToken)
        setWaliData(JSON.parse(savedWali))
        setWaliSantriList(JSON.parse(savedSantri))
      } else {
        localStorage.removeItem("waliToken")
        localStorage.removeItem("waliData")
        localStorage.removeItem("waliSantri")
      }
    }
  }, [mode])

  // WALI MODE
  if (mode === "wali") {
    if (waliToken && waliData) {
      return (
        <WaliDashboard
          token={waliToken}
          wali={waliData}
          initialSantriList={waliSantriList}
          onLogout={() => {
            localStorage.removeItem("waliToken")
            localStorage.removeItem("waliData")
            localStorage.removeItem("waliSantri")
            setWaliToken(null)
            setWaliData(null)
            setWaliSantriList([])
          }}
        />
      )
    }
    return (
      <WaliLoginOverlay
        onBack={() => {
          setMode("admin")
          const url = new URL(window.location.href)
          url.searchParams.delete("mode")
          window.history.replaceState({}, "", url.toString())
        }}
        onLoginSuccess={(token, wali, santriList) => {
          localStorage.setItem("waliToken", token)
          localStorage.setItem("waliData", JSON.stringify(wali))
          localStorage.setItem("waliSantri", JSON.stringify(santriList))
          setWaliToken(token)
          setWaliData(wali)
          setWaliSantriList(santriList)
        }}
      />
    )
  }

  // ADMIN MODE
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center shadow-lg">
          <GraduationCap className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat sesi...
        </div>
      </div>
    )
  }

  if (status === "unauthenticated" || !session?.user) {
    return <LoginOverlay onSwitchToWali={() => {
      setMode("wali")
      const url = new URL(window.location.href)
      url.searchParams.set("mode", "wali")
      window.history.replaceState({}, "", url.toString())
    }} />
  }

  return <AdminLayout />
}
