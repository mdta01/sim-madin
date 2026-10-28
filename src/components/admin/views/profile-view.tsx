"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { apiGet, apiPost, apiPut } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
import { PageHeader } from "@/components/admin/shared/page-header"
import { LoadingState, ErrorState } from "@/components/admin/shared/states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ROLE_LABELS, formatDate } from "@/lib/constants"
import { PhotoUpload } from "@/components/admin/shared/photo-upload"
import { User, Lock, Mail, Phone, Shield, Calendar, Key, Save, CheckCircle2 } from "lucide-react"

interface MyProfile {
  id: string
  email: string
  username: string
  name: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: string[]
  roleDetails: { code: string; name: string; description: string | null }[]
  permissions: string[]
}

export function ProfileView() {
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState("profile")

  // Form states
  const [form, setForm] = useState<any>({})
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const { toast } = useToast()
  const { update } = useSession()

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<MyProfile>("/api/admin/me")
      setProfile(res.data)
      setForm({
        name: res.data.name,
        phone: res.data.phone || "",
        avatarUrl: res.data.avatarUrl,
        email: res.data.email,
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSaveProfile = async () => {
    if (!form.name?.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" })
      return
    }
    setSavingProfile(true)
    try {
      const updateData: any = {
        name: form.name,
        phone: form.phone,
        avatarUrl: form.avatarUrl,
      }
      // Email berubah → perlu currentPassword
      if (form.email !== profile?.email) {
        updateData.email = form.email
        if (!pwdForm.currentPassword) {
          toast({ title: "Verifikasi diperlukan", description: "Masukkan password saat ini di tab Keamanan untuk mengubah email", variant: "destructive" })
          setSavingProfile(false)
          return
        }
        updateData.currentPassword = pwdForm.currentPassword
      }
      const res = await apiPut("/api/admin/me", updateData)
      toast({ title: "Profil disimpan", description: "Perubahan profil berhasil disimpan" })
      // Update session
      await update({ name: res.data.name, email: res.data.email, image: res.data.avatarUrl })
      load()
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      toast({ title: "Lengkapi form", description: "Password saat ini & baru wajib diisi", variant: "destructive" })
      return
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast({ title: "Password tidak cocok", description: "Konfirmasi password baru tidak sama", variant: "destructive" })
      return
    }
    if (pwdForm.newPassword.length < 6) {
      toast({ title: "Password terlalu pendek", description: "Minimal 6 karakter", variant: "destructive" })
      return
    }
    setSavingPassword(true)
    try {
      await apiPost("/api/admin/me", pwdForm)
      toast({ title: "Password diubah", description: "Password berhasil diperbarui" })
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) return <LoadingState className="py-20" />
  if (error || !profile) return <ErrorState message={error || "Data tidak ditemukan"} onRetry={load} />

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Profil Saya"
        description="Kelola informasi akun & keamanan Anda"
        icon={<User className="h-5 w-5" />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1" /> Profil</TabsTrigger>
          <TabsTrigger value="security"><Lock className="h-3.5 w-3.5 mr-1" /> Keamanan</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Informasi Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Foto Profil</Label>
                <PhotoUpload
                  value={form.avatarUrl}
                  onChange={(url) => setForm({ ...form, avatarUrl: url })}
                  name={form.name}
                  prefix="avatar"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nama Lengkap *</Label>
                  <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">No. HP</Label>
                  <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <p className="text-[10px] text-amber-600 flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Verifikasi password diperlukan untuk ubah email
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Username</Label>
                  <Input value={profile.username} disabled className="bg-muted/40" />
                  <p className="text-[10px] text-muted-foreground">Username tidak bisa diubah</p>
                </div>
              </div>

              <div className="pt-3 border-t">
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? (
                    <><span className="h-4 w-4 mr-1 animate-spin">⏳</span> Menyimpan...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-1" /> Simpan Profil</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Role & Permission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Role yang dimiliki:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.roleDetails.map((r) => (
                    <div key={r.code} className="p-2 rounded-md border bg-muted/30">
                      <Badge variant="secondary" className="mb-1">{r.name}</Badge>
                      <p className="text-[11px] text-muted-foreground max-w-xs">{r.description || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Permission ({profile.permissions.length} total):</p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 border rounded bg-muted/20">
                  {profile.permissions.map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px] font-mono">{p}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Bergabung sejak</p>
                  <p className="font-medium">{formatDate(profile.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Login terakhir</p>
                  <p className="font-medium">{profile.lastLoginAt ? formatDate(profile.lastLoginAt, true) : "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" /> Ubah Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Password Saat Ini *</Label>
                <Input
                  type="password"
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                  placeholder="••••••••"
                />
                <p className="text-[10px] text-muted-foreground">Diperlukan juga untuk verifikasi perubahan email</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Password Baru *</Label>
                <Input
                  type="password"
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Konfirmasi Password Baru *</Label>
                <Input
                  type="password"
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  placeholder="Ulangi password baru"
                />
                {pwdForm.newPassword && pwdForm.confirmPassword && (
                  pwdForm.newPassword === pwdForm.confirmPassword ? (
                    <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Password cocok
                    </p>
                  ) : (
                    <p className="text-[10px] text-destructive">Password tidak cocok</p>
                  )
                )}
              </div>
              <Button onClick={handleChangePassword} disabled={savingPassword} className="mt-2">
                {savingPassword ? (
                  <><span className="h-4 w-4 mr-1 animate-spin">⏳</span> Mengubah...</>
                ) : (
                  <><Lock className="h-4 w-4 mr-1" /> Ubah Password</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Tips Keamanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Gunakan password minimal 8 karakter, kombinasi huruf besar, kecil, angka, dan simbol.</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Jangan gunakan password yang sama dengan akun lain.</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Logout dari perangkat umum setelah selesai digunakan.</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Sesi Anda berlaku 7 hari, lalu akan otomatis logout.</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
