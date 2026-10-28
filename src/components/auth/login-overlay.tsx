"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient, isSupabaseClientAvailable } from "@/lib/supabase/client"
import { GraduationCap, Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react"

export function LoginOverlay({ onSwitchToWali }: { onSwitchToWali?: () => void }) {
  const [email, setEmail] = useState("admin@madrasah.test")
  const [password, setPassword] = useState("admin123")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({ title: "Validasi gagal", description: "Email dan password wajib diisi", variant: "destructive" })
      return
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      toast({ title: "Error", description: "Supabase tidak terkonfigurasi. Cek env vars.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast({ title: "Login gagal", description: error.message, variant: "destructive" })
      } else if (data.user) {
        toast({ title: "Login berhasil", description: `Selamat datang, ${data.user.user_metadata?.name || email}!` })
        // Supabase Auth SDK auto-stores session, AuthGate will detect via onAuthStateChange
        // Force reload to ensure all components pick up the new session
        window.location.reload()
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword("admin123")
  }

  // Show warning if Supabase not configured
  if (!isSupabaseClientAvailable()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" /> Supabase Belum Dikonfigurasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set environment variables berikut di <code>.env</code>:
            </p>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              Lihat <code>docs/SETUP-SUPABASE.md</code> untuk panduan.
            </p>
            {onSwitchToWali && (
              <Button variant="outline" className="w-full mt-4" onClick={onSwitchToWali}>
                Login sebagai Wali Santri →
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-lg">
            <GraduationCap className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SIM MADIN</h1>
          <p className="text-sm text-muted-foreground">Sistem Informasi Madrasah Diniyah Terpadu</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Masuk ke Akun
            </CardTitle>
            <CardDescription>Login Super Admin dengan email & password (Supabase Auth)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@madrasah.test"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" /> Masuk</>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Akun Demo (password: <code className="font-mono font-semibold">admin123</code>):</p>
              <div className="grid grid-cols-1 gap-1.5">
                <button onClick={() => fillDemo("admin@madrasah.test")} className="text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs transition-colors">
                  <span className="font-medium text-emerald-600">Super Admin</span> — admin@madrasah.test
                </button>
                <button onClick={() => fillDemo("kepala@madrasah.test")} className="text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs transition-colors">
                  <span className="font-medium text-blue-600">Kepala Madrasah</span> — kepala@madrasah.test
                </button>
                <button onClick={() => fillDemo("bendahara@madrasah.test")} className="text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs transition-colors">
                  <span className="font-medium text-purple-600">Bendahara</span> — bendahara@madrasah.test
                </button>
                <button onClick={() => fillDemo("guru@madrasah.test")} className="text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs transition-colors">
                  <span className="font-medium text-orange-600">Guru</span> — guru@madrasah.test
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {onSwitchToWali && (
          <div className="text-center mt-4">
            <button
              onClick={onSwitchToWali}
              className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Login sebagai Wali Santri →
            </button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2025 SIM MADIN • MVP V1.4 • Powered by Next.js + Supabase
        </p>
      </div>
    </div>
  )
}
