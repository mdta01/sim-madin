"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { GraduationCap, Loader2, Phone, Lock, Eye, EyeOff, User, ArrowLeft, MessageCircle, KeyRound } from "lucide-react"

interface WaliLoginOverlayProps {
  onBack: () => void
  onLoginSuccess: (token: string, wali: any, santriList: any[]) => void
}

export function WaliLoginOverlay({ onBack, onLoginSuccess }: WaliLoginOverlayProps) {
  const [phone, setPhone] = useState("081234511001")
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForgotPin, setShowForgotPin] = useState(false)
  const { toast } = useToast()

  // Forgot PIN flow state
  const [forgotPhone, setForgotPhone] = useState("")
  const [forgotOtp, setForgotOtp] = useState("")
  const [forgotNewPin, setForgotNewPin] = useState("")
  const [forgotConfirmPin, setForgotConfirmPin] = useState("")
  const [forgotStep, setForgotStep] = useState<"phone" | "otp" | "set-pin">("phone")
  const [forgotVerifyToken, setForgotVerifyToken] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !pin) {
      toast({ title: "Validasi gagal", description: "Nomor WhatsApp dan PIN wajib diisi", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/wali/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Login gagal", description: data.error || data.message, variant: "destructive" })
      } else {
        toast({ title: "Login berhasil", description: `Selamat datang, ${data.wali.name}!` })
        onLoginSuccess(data.token, data.wali, data.santriList)
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotRequestOTP = async () => {
    if (!forgotPhone) {
      toast({ title: "Validasi", description: "Nomor WhatsApp wajib diisi", variant: "destructive" })
      return
    }
    setForgotLoading(true)
    try {
      const res = await fetch("/api/wali/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: forgotPhone, type: "FORGOT_PIN" }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error || data.message, variant: "destructive" })
      } else {
        toast({
          title: "OTP terkirim",
          description: data.devOtp ? `Kode OTP (DEV): ${data.devOtp}` : data.message,
        })
        setForgotStep("otp")
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotVerifyOTP = async () => {
    if (!forgotOtp) {
      toast({ title: "Validasi", description: "Kode OTP wajib diisi", variant: "destructive" })
      return
    }
    setForgotLoading(true)
    try {
      const res = await fetch("/api/wali/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: forgotPhone, otpCode: forgotOtp }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "OTP terverifikasi", description: "Silakan buat PIN baru" })
        setForgotVerifyToken(data.verifyToken)
        setForgotStep("set-pin")
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotSetPIN = async () => {
    if (!forgotNewPin || !forgotConfirmPin) {
      toast({ title: "Validasi", description: "PIN & konfirmasi wajib diisi", variant: "destructive" })
      return
    }
    if (forgotNewPin !== forgotConfirmPin) {
      toast({ title: "PIN tidak cocok", description: "Konfirmasi PIN berbeda", variant: "destructive" })
      return
    }
    if (!/^\d{6}$/.test(forgotNewPin)) {
      toast({ title: "Format PIN salah", description: "PIN harus 6 digit angka", variant: "destructive" })
      return
    }
    setForgotLoading(true)
    try {
      const res = await fetch("/api/wali/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifyToken: forgotVerifyToken, pin: forgotNewPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "PIN berhasil diubah", description: "Silakan login dengan PIN baru" })
        setShowForgotPin(false)
        setPhone(forgotPhone)
        setPin("")
        // Reset forgot state
        setForgotPhone("")
        setForgotOtp("")
        setForgotNewPin("")
        setForgotConfirmPin("")
        setForgotStep("phone")
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setForgotLoading(false)
    }
  }

  if (showForgotPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/30 p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center mb-3 shadow-lg">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Lupa PIN Wali Santri</h1>
          </div>
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-base">
                {forgotStep === "phone" && "Masukkan Nomor WhatsApp"}
                {forgotStep === "otp" && "Verifikasi Kode OTP"}
                {forgotStep === "set-pin" && "Buat PIN Baru"}
              </CardTitle>
              <CardDescription>
                {forgotStep === "phone" && "Kami akan kirim kode OTP ke nomor WhatsApp Anda"}
                {forgotStep === "otp" && "Masukkan 6 digit kode yang dikirim"}
                {forgotStep === "set-pin" && "Buat PIN 6 digit baru untuk login"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {forgotStep === "phone" && (
                <div className="space-y-2">
                  <Label htmlFor="forgot-phone">Nomor WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-phone"
                      type="tel"
                      placeholder="08xxx atau 62xxx"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={handleForgotRequestOTP} disabled={forgotLoading} className="w-full">
                    {forgotLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengirim...</> : "Kirim OTP"}
                  </Button>
                </div>
              )}
              {forgotStep === "otp" && (
                <div className="space-y-2">
                  <Label htmlFor="forgot-otp">Kode OTP (6 digit)</Label>
                  <Input
                    id="forgot-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                  <Button onClick={handleForgotVerifyOTP} disabled={forgotLoading} className="w-full">
                    {forgotLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifikasi...</> : "Verifikasi OTP"}
                  </Button>
                </div>
              )}
              {forgotStep === "set-pin" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-pin">PIN Baru (6 digit)</Label>
                    <Input
                      id="forgot-pin"
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={forgotNewPin}
                      onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, ""))}
                      className="text-center text-xl tracking-widest font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-pin2">Konfirmasi PIN</Label>
                    <Input
                      id="forgot-pin2"
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={forgotConfirmPin}
                      onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, ""))}
                      className="text-center text-xl tracking-widest font-mono"
                    />
                  </div>
                  <Button onClick={handleForgotSetPIN} disabled={forgotLoading} className="w-full">
                    {forgotLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : <><KeyRound className="h-4 w-4 mr-2" /> Simpan PIN Baru</>}
                  </Button>
                </div>
              )}
              <Button variant="ghost" onClick={() => setShowForgotPin(false)} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-3 shadow-lg">
            <MessageCircle className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Login Wali Santri</h1>
          <p className="text-sm text-muted-foreground">Masuk dengan Nomor WhatsApp & PIN</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Masuk ke Akun Wali</CardTitle>
            <CardDescription>Akses dashboard anak-anak Anda di madrasah</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wali-phone">Nomor WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wali-phone"
                    type="tel"
                    placeholder="08xxx atau 62xxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9"
                    autoComplete="tel"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wali-pin">PIN (6 digit)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wali-pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="pl-9 pr-9 text-center text-xl tracking-widest font-mono"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" /> Masuk</>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setShowForgotPin(true)}
                className="w-full text-xs text-emerald-600 hover:text-emerald-700 mt-2"
              >
                Lupa PIN?
              </button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Akun Demo (PIN: <code className="font-mono font-semibold">123456</code>):</p>
              <div className="space-y-1">
                <button onClick={() => setPhone("081234511001")} className="w-full text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs">
                  <span className="font-medium text-emerald-600">Bapak H. Abdullah</span> — 081234511001 (3 anak)
                </button>
                <button onClick={() => setPhone("081234511003")} className="w-full text-left p-2 rounded border bg-muted/30 hover:bg-muted text-xs">
                  <span className="font-medium text-emerald-600">Bapak Hasan</span> — 081234511003 (3 anak)
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <button
          onClick={onBack}
          className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Kembali ke Login Admin
        </button>
      </div>
    </div>
  )
}
