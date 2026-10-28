"use client"

import { useSession } from "next-auth/react"
import { Loader2, GraduationCap } from "lucide-react"
import { LoginOverlay } from "@/components/auth/login-overlay"
import { AdminLayout } from "@/components/admin/admin-layout"

export function AuthGate() {
  const { data: session, status } = useSession()

  // Loading state
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

  // Not authenticated
  if (status === "unauthenticated" || !session?.user) {
    return <LoginOverlay />
  }

  // Authenticated
  return <AdminLayout />
}
