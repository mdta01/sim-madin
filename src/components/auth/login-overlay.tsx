"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { GraduationCap, Loader2, Lock, User, Eye, EyeOff, ShieldCheck } from "lucide-react"

export function LoginOverlay({ onSwitchToWali }: { onSwitchToWali?: () => void }) {
  const [identifier, setIdentifier] = useState("admin@madrasah.test")
  const [password, setPassword] = useState("admin123")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier || !password) {
      toast({ title: "Validasi gagal", description: "Email/username dan password wajib diisi", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      })
      if (result?.error) {
        toast({
          title: "Login gagal",
          description: result.error === "CredentialsSignin"
            ? "Email/username atau password salah"
            : result.error,
          variant: "destructive",
        })
      } else if (result?.ok) {
        toast({ title: "Login berhasil", description: "Selamat datang kembali!" })
        // Trigger reload to refresh session
        window.location.reload()
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (id: string, pass: string) => {
    setIdentifier(id)
    setPassword(pass)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
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
              <ShieldCheck className="h-5 w-5 text-primary" />
              Masuk ke Akun
            </CardTitle>
            <CardDescription>Masukkan kredensial Super Admin Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email atau Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="admin@madrasah.test"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-9"
                    autoComplete="username"
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
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" /> Masuk
                  </>
                )}
              </Button>
            </form>

            {/* Demo credentials helper */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Akun Demo (klik untuk isi otomatis):</p>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => fillDemo("admin@madrasah.test", "admin123")}
                  className="text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs transition-colors"
                >
                  <span className="font-medium text-emerald-600">Super Admin</span> — admin@madrasah.test
                </button>
                <button
                  onClick={() => fillDemo("kepala@madrasah.test", "admin123")}
                  className="text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs transition-colors"
                >
                  <span className="font-medium text-blue-600">Kepala Madrasah</span> — kepala@madrasah.test
                </button>
                <button
                  onClick={() => fillDemo("bendahara@madrasah.test", "admin123")}
                  className="text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs transition-colors"
                >
                  <span className="font-medium text-purple-600">Bendahara</span> — bendahara@madrasah.test
                </button>
                <button
                  onClick={() => fillDemo("guru@madrasah.test", "admin123")}
                  className="text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs transition-colors"
                >
                  <span className="font-medium text-orange-600">Guru</span> — guru@madrasah.test
                </button>
                <button
                  onClick={() => fillDemo("wali@madrasah.test", "admin123")}
                  className="text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs transition-colors"
                >
                  <span className="font-medium text-rose-600">Wali Santri</span> — wali@madrasah.test
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Password semua akun demo: <code className="font-mono font-semibold">admin123</code>
              </p>
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
          © 2025 SIM MADIN • MVP V1.0 • Powered by Next.js + Prisma
        </p>
      </div>
    </div>
  )
}
