"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  KELULUSAN_STATUS,
  SYARAT_KELULUSAN,
  DOKUMEN_KELULUSAN,
  GENDER_LABELS,
  PREDIKAT_OPTIONS,
  formatDate,
  type BadgeVariant,
} from "@/lib/constants"
import {
  GraduationCap,
  Users,
  Pencil,
  Trash2,
  FileText,
  Award,
  Save,
  CheckCircle2,
  UserCheck,
  CalendarDays,
} from "lucide-react"

// ----------------------------------------------------------------------------
// Helper: badge variant mapping (constants menyimpan "success"/"warning" dst,
// yang juga didukung oleh Badge shadcn).
// ----------------------------------------------------------------------------
function badgeVariant(v: BadgeVariant): any {
  return v as any
}

// ----------------------------------------------------------------------------
// MAIN VIEW — 2 tabs: Kelulusan & Alumni
// ----------------------------------------------------------------------------
export function AlumniView() {
  const [tab, setTab] = useState("kelulusan")
  return (
    <div>
      <PageHeader
        title="Kelulusan & Alumni"
        description="Proses kelulusan santri dan tracking data alumni madrasah"
        icon={<GraduationCap className="h-5 w-5" />}
      />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="kelulusan">
            <CheckCircle2 className="h-3.5 w-3.5" /> Kelulusan
          </TabsTrigger>
          <TabsTrigger value="alumni">
            <Users className="h-3.5 w-3.5" /> Alumni
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kelulusan" className="mt-4">
          <KelulusanTab />
        </TabsContent>
        <TabsContent value="alumni" className="mt-4">
          <AlumniTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Stat Card helper
// ----------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string
  value: string | number
  icon?: React.ReactNode
  tone?: "default" | "emerald" | "amber"
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
      ? "text-amber-600"
      : ""
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TAB 1 — KELULUSAN
// ============================================================================
function KelulusanTab() {
  const [santriList, setSantriList] = useState<any[]>([])
  const [stats, setStats] = useState<{
    totalAlumni: number
    totalLulus: number
    lulusTahunIni: number
  }>({ totalAlumni: 0, totalLulus: 0, lulusTahunIni: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = { status: "AKTIF" }
      if (search) params.search = search
      const [santriRes, alumniRes] = await Promise.all([
        apiGet("/api/admin/santri", params),
        apiGet("/api/admin/alumni"),
      ])
      setSantriList(santriRes.data || [])
      if (alumniRes.stats) setStats(alumniRes.stats)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const handleProses = (santri: any) => {
    setSelectedSantri(santri)
    setDialogOpen(true)
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard
          label="Santri Aktif"
          value={santriList.length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Total Alumni"
          value={stats.totalAlumni}
          icon={<GraduationCap className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          label="Lulus Tahun Ini"
          value={stats.lulusTahunIni}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="amber"
        />
      </div>

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama atau NIS santri aktif..."
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : santriList.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Tidak ada santri aktif"
              description="Semua santri sudah diproses kelulusannya atau belum ada data santri aktif."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nama Santri</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>L/P</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {santriList.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{s.name}</p>
                        {s.birthPlace && (
                          <p className="text-[11px] text-muted-foreground">
                            {s.birthPlace}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {s.nis || "-"}
                      </TableCell>
                      <TableCell>{s.kelas?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {GENDER_LABELS[s.gender] || s.gender}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleProses(s)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Proses
                          Kelulusan
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <KelulusanForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        santri={selectedSantri}
        onSuccess={load}
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Kelulusan Form Dialog
// ----------------------------------------------------------------------------
function KelulusanForm({
  open,
  onOpenChange,
  santri,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  santri: any | null
  onSuccess: () => void
}) {
  const currentYear = new Date().getFullYear()
  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    if (santri) {
      setForm({
        santriId: santri.id,
        tahunLulus: currentYear,
        statusKelulusan: "LULUS",
        nilaiAkhir: "",
        predikatAkhir: "",
        syaratNilaiLengkap: false,
        syaratAbsensiCukup: false,
        syaratTagihanLunas: false,
        syaratUjianAkhir: false,
        suratKeteranganLulus: false,
        sertifikat: false,
        piagam: false,
        tanggalLulus: today,
        catatan: "",
        telepon: santri.phone || "",
      })
    }
  }, [santri, open, currentYear, today])

  const toggleSyarat = (key: string, checked: boolean) => {
    setForm((f: any) => ({ ...f, [key]: checked }))
  }

  const handleSave = async () => {
    if (!form.santriId || !form.tahunLulus) {
      toast({
        title: "Validasi gagal",
        description: "Santri dan Tahun Lulus wajib diisi",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        santriId: form.santriId,
        tahunLulus: Number(form.tahunLulus),
        statusKelulusan: form.statusKelulusan,
        nilaiAkhir: form.nilaiAkhir === "" ? null : Number(form.nilaiAkhir),
        predikatAkhir: form.predikatAkhir || null,
        syaratNilaiLengkap: !!form.syaratNilaiLengkap,
        syaratAbsensiCukup: !!form.syaratAbsensiCukup,
        syaratTagihanLunas: !!form.syaratTagihanLunas,
        syaratUjianAkhir: !!form.syaratUjianAkhir,
        suratKeteranganLulus: !!form.suratKeteranganLulus,
        sertifikat: !!form.sertifikat,
        piagam: !!form.piagam,
        tanggalLulus: form.tanggalLulus || null,
        catatan: form.catatan || null,
        telepon: form.telepon || null,
      }
      const res = await apiPost<any>("/api/admin/alumni", payload)
      toast({
        title: "Berhasil",
        description:
          res.message ||
          `${santri?.name} berhasil diproses kelulusannya (Status: LULUS).`,
      })
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!santri) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proses Kelulusan</DialogTitle>
        </DialogHeader>

        {/* Santri info */}
        <div className="mb-3 p-3 rounded-md border bg-muted/20 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {santri.name?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{santri.name}</p>
            <p className="text-xs text-muted-foreground">
              NIS: {santri.nis || "-"} • Kelas: {santri.kelas?.name || "-"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
          {/* Tahun Lulus */}
          <div className="space-y-1">
            <Label className="text-xs">Tahun Lulus *</Label>
            <Input
              type="number"
              value={form.tahunLulus ?? ""}
              onChange={(e) =>
                setForm({ ...form, tahunLulus: e.target.value })
              }
            />
          </div>

          {/* Status Kelulusan */}
          <div className="space-y-1">
            <Label className="text-xs">Status Kelulusan</Label>
            <Select
              value={form.statusKelulusan}
              onValueChange={(v) =>
                setForm({ ...form, statusKelulusan: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KELULUSAN_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nilai Akhir */}
          <div className="space-y-1">
            <Label className="text-xs">Nilai Akhir</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.nilaiAkhir ?? ""}
              onChange={(e) =>
                setForm({ ...form, nilaiAkhir: e.target.value })
              }
              placeholder="0 - 100"
            />
          </div>

          {/* Predikat Akhir */}
          <div className="space-y-1">
            <Label className="text-xs">Predikat Akhir</Label>
            <Select
              value={form.predikatAkhir || ""}
              onValueChange={(v) =>
                setForm({ ...form, predikatAkhir: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih predikat" />
              </SelectTrigger>
              <SelectContent>
                {PREDIKAT_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tanggal Lulus */}
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Tanggal Lulus</Label>
            <Input
              type="date"
              value={form.tanggalLulus ?? ""}
              onChange={(e) =>
                setForm({ ...form, tanggalLulus: e.target.value })
              }
            />
          </div>

          {/* Syarat Kelulusan */}
          <div className="sm:col-span-2 mt-2 pt-3 border-t">
            <Label className="text-xs font-medium">
              Persyaratan Kelulusan
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {SYARAT_KELULUSAN.map((s) => (
                <label
                  key={s.value}
                  className="flex items-start gap-2 cursor-pointer hover:bg-muted/40 p-2 rounded border"
                >
                  <Checkbox
                    checked={!!form[s.value]}
                    onCheckedChange={(c) => toggleSyarat(s.value, !!c)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dokumen Kelulusan */}
          <div className="sm:col-span-2 mt-2 pt-3 border-t">
            <Label className="text-xs font-medium">Dokumen Kelulusan</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {DOKUMEN_KELULUSAN.map((d) => (
                <label
                  key={d.value}
                  className="flex items-start gap-2 cursor-pointer hover:bg-muted/40 p-2 rounded border"
                >
                  <Checkbox
                    checked={!!form[d.value]}
                    onCheckedChange={(c) => toggleSyarat(d.value, !!c)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Catatan</Label>
            <Textarea
              rows={3}
              value={form.catatan ?? ""}
              onChange={(e) =>
                setForm({ ...form, catatan: e.target.value })
              }
              placeholder="Catatan tambahan terkait kelulusan santri..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              "Menyimpan..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" /> Proses Kelulusan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// TAB 2 — ALUMI (tracking)
// ============================================================================
function AlumniTab() {
  const [data, setData] = useState<any[]>([])
  const [stats, setStats] = useState<{
    totalAlumni: number
    totalLulus: number
    lulusTahunIni: number
  }>({ totalAlumni: 0, totalLulus: 0, lulusTahunIni: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [tahunFilter, setTahunFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (search) params.search = search
      if (tahunFilter) params.tahunLulus = tahunFilter
      if (statusFilter) params.statusKelulusan = statusFilter
      const res = await apiGet("/api/admin/alumni", params)
      setData(res.data || [])
      if (res.stats) setStats(res.stats)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, tahunFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  // Daftar tahun unik dari data untuk filter dropdown
  const tahunOptions = Array.from(
    new Set(data.map((a) => a.tahunLulus).filter(Boolean))
  ).sort((a, b) => b - a)

  const handleEdit = (alumni: any) => {
    setEditing(alumni)
    setEditOpen(true)
  }

  const handlePrintSurat = (id: string) => {
    window.open(`/api/admin/alumni/${id}/surat-lulus`, "_blank")
  }

  const handlePrintSertifikat = (id: string) => {
    window.open(`/api/admin/alumni/${id}/sertifikat`, "_blank")
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await apiDelete<any>(
        `/api/admin/alumni/${deleteTarget.id}`
      )
      toast({
        title: "Berhasil",
        description:
          res.message ||
          `Data alumni ${deleteTarget.santri?.name || ""} dihapus. Santri dikembalikan ke status AKTIF.`,
      })
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard
          label="Total Alumni"
          value={stats.totalAlumni}
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatCard
          label="Total Lulus"
          value={stats.totalLulus}
          icon={<UserCheck className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          label="Lulus Tahun Ini"
          value={stats.lulusTahunIni}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="amber"
        />
      </div>

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama atau NIS alumni..."
        filters={
          <>
            <Select
              value={tahunFilter}
              onValueChange={(v) => setTahunFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Semua Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {tahunOptions.map((t) => (
                  <SelectItem key={t} value={String(t)}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(KELULUSAN_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="h-5 w-5" />}
              title="Belum ada data alumni"
              description="Proses kelulusan santri dari tab Kelulusan untuk membuat data alumni."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nama</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Tahun Lulus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nilai</TableHead>
                    <TableHead>Predikat</TableHead>
                    <TableHead className="min-w-[140px]">
                      Pendidikan Lanjutan
                    </TableHead>
                    <TableHead>Pekerjaan</TableHead>
                    <TableHead>Domisili</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((a) => {
                    const status = KELULUSAN_STATUS[a.statusKelulusan]
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <p className="font-medium text-sm">
                            {a.santri?.name || "-"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.santri?.birthPlace}
                            {a.santri?.birthDate
                              ? `, ${formatDate(a.santri.birthDate)}`
                              : ""}
                          </p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {a.santri?.nis || "-"}
                        </TableCell>
                        <TableCell>{a.tahunLulus || "-"}</TableCell>
                        <TableCell>
                          {status ? (
                            <Badge variant={badgeVariant(status.variant)}>
                              {status.label}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {a.statusKelulusan}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {a.nilaiAkhir != null ? (
                            <span className="font-mono text-sm">
                              {Number(a.nilaiAkhir).toFixed(2)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {a.predikatAkhir ? (
                            <Badge variant="outline">{a.predikatAkhir}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.pendidikanLanjutan || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.pekerjaan || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.domisiliKota || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit Data Alumni"
                              onClick={() => handleEdit(a)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Cetak Surat Lulus"
                              onClick={() => handlePrintSurat(a.id)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Cetak Sertifikat"
                              onClick={() => handlePrintSertifikat(a.id)}
                            >
                              <Award className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title="Hapus Alumni (revert ke AKTIF)"
                              onClick={() => setDeleteTarget(a)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlumniEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={editing}
        onSuccess={load}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Alumni?</AlertDialogTitle>
            <AlertDialogDescription>
              Data alumni untuk{" "}
              <strong>{deleteTarget?.santri?.name || "santri ini"}</strong>{" "}
              akan dihapus. Status santri akan dikembalikan menjadi{" "}
              <strong>AKTIF</strong>. Data santri (nilai, absensi, tagihan, dll)
              tetap tersimpan dan tidak ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus &amp; Kembalikan ke AKTIF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Alumni Edit Dialog — edit data tracking alumni (lanjutan, pekerjaan, kontak, dll)
// ----------------------------------------------------------------------------
function AlumniEditDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: any | null
  onSuccess: () => void
}) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        pendidikanLanjutan: editing.pendidikanLanjutan || "",
        pekerjaan: editing.pekerjaan || "",
        telepon: editing.telepon || "",
        email: editing.email || "",
        domisiliKota: editing.domisiliKota || "",
        domisiliAlamat: editing.domisiliAlamat || "",
        aktivitasAlumni: editing.aktivitasAlumni || "",
        catatan: editing.catatan || "",
      })
    }
  }, [editing, open])

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await apiPut(`/api/admin/alumni/${editing.id}`, form)
      toast({
        title: "Berhasil",
        description: "Data alumni diperbarui",
      })
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!editing) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Data Alumni</DialogTitle>
        </DialogHeader>

        {/* Alumni info */}
        <div className="mb-3 p-3 rounded-md border bg-muted/20 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {editing.santri?.name?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{editing.santri?.name}</p>
            <p className="text-xs text-muted-foreground">
              NIS: {editing.santri?.nis || "-"} • Lulus: {editing.tahunLulus}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Pendidikan Lanjutan</Label>
            <Input
              value={form.pendidikanLanjutan ?? ""}
              onChange={(e) =>
                setForm({ ...form, pendidikanLanjutan: e.target.value })
              }
              placeholder="Mis. MTs Negeri 1, SMP Al-Azhar"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pekerjaan</Label>
            <Input
              value={form.pekerjaan ?? ""}
              onChange={(e) =>
                setForm({ ...form, pekerjaan: e.target.value })
              }
              placeholder="Mis. Wiraswasta, Pelajar"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">No. Telepon Alumni</Label>
            <Input
              value={form.telepon ?? ""}
              onChange={(e) =>
                setForm({ ...form, telepon: e.target.value })
              }
              placeholder="08xxx atau 628xxx"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email Alumni</Label>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              placeholder="alumni@email.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Domisili Kota</Label>
            <Input
              value={form.domisiliKota ?? ""}
              onChange={(e) =>
                setForm({ ...form, domisiliKota: e.target.value })
              }
              placeholder="Mis. Jakarta, Bandung"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Domisili Alamat</Label>
            <Input
              value={form.domisiliAlamat ?? ""}
              onChange={(e) =>
                setForm({ ...form, domisiliAlamat: e.target.value })
              }
              placeholder="Alamat lengkap"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Aktivitas Alumni</Label>
            <Input
              value={form.aktivitasAlumni ?? ""}
              onChange={(e) =>
                setForm({ ...form, aktivitasAlumni: e.target.value })
              }
              placeholder="Mis. Kuliah, Wirausaha, Kegiatan Dakwah"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Catatan</Label>
            <Textarea
              rows={3}
              value={form.catatan ?? ""}
              onChange={(e) =>
                setForm({ ...form, catatan: e.target.value })
              }
              placeholder="Catatan admin tentang alumni..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              "Menyimpan..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" /> Simpan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
