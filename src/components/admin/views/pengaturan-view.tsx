"use client"

import { useEffect, useState } from "react"
import { apiGet, apiPut } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { LoadingState, ErrorState } from "@/components/admin/shared/states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Settings, Building2, Calendar, Save, School, Database } from "lucide-react"

export function PengaturanView() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet("/api/admin/settings")
      setSettings(res.data || {})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiPut("/api/admin/settings", { settings })
      toast({ title: "Berhasil", description: "Pengaturan tersimpan" })
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState className="py-20" />
  if (error) return <ErrorState message={error} onRetry={load} />

  const update = (key: string, value: string) => setSettings({ ...settings, [key]: value })

  return (
    <div>
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi profil madrasah dan preferensi sistem"
        icon={<Settings className="h-5 w-5" />}
        actions={<Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Menyimpan..." : "Simpan"}</Button>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Profil Madrasah
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nama Madrasah</Label>
              <Input value={settings.MADRASAH_NAME || ""} onChange={(e) => update("MADRASAH_NAME", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Alamat</Label>
              <Input value={settings.MADRASAH_ADDRESS || ""} onChange={(e) => update("MADRASAH_ADDRESS", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Telepon</Label>
                <Input value={settings.MADRASAH_PHONE || ""} onChange={(e) => update("MADRASAH_PHONE", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={settings.MADRASAH_EMAIL || ""} onChange={(e) => update("MADRASAH_EMAIL", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kepala Madrasah</Label>
              <Input value={settings.MADRASAH_HEAD || ""} onChange={(e) => update("MADRASAH_HEAD", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Periode Akademik Aktif
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-md bg-muted/30 border">
              <p className="text-xs text-muted-foreground">Tahun Ajaran Aktif</p>
              <p className="text-sm font-medium font-mono mt-1">{settings.ACTIVE_TA_ID || "Belum diatur"}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Atur tahun ajaran aktif melalui menu Tahun Ajaran</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 border">
              <p className="text-xs text-muted-foreground">Semester Aktif</p>
              <p className="text-sm font-medium font-mono mt-1">{settings.ACTIVE_SEMESTER_ID || "Belum diatur"}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Aktifkan semester melalui menu Tahun Ajaran</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Konfigurasi Sistem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mata Uang</Label>
                <Input value={settings.CURRENCY || "IDR"} onChange={(e) => update("CURRENCY", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Timezone</Label>
                <Input value={settings.TIMEZONE || "Asia/Jakarta"} onChange={(e) => update("TIMEZONE", e.target.value)} />
              </div>
            </div>
            <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">ℹ️ Catatan Pengembangan</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Saat produksi, integrasi dengan Supabase (database), Firebase (auth & storage), dan Expo React Native (mobile apps) akan diatur melalui environment variables.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <School className="h-4 w-4" /> Informasi Versi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Versi Aplikasi</span>
              <span className="font-mono font-medium">MVP V1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stack Frontend</span>
              <span className="font-medium text-xs">Next.js 16 + React 19</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stack Backend</span>
              <span className="font-medium text-xs">Supabase + Firebase (planned)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mobile (roadmap)</span>
              <span className="font-medium text-xs">Expo React Native</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Database Lokal (dev)</span>
              <span className="font-mono font-medium text-xs">SQLite + Prisma</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
