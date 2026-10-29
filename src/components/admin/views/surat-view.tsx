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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  SURAT_TYPES,
  SURAT_STATUS,
  DOKUMEN_TYPES,
  formatDate,
  type BadgeVariant,
} from "@/lib/constants"
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Printer,
  FileCheck,
  Award,
  IdCard,
  ClipboardList,
  CalendarClock,
  Sparkles,
  Lock,
  ExternalLink,
} from "lucide-react"

// ----------------------------------------------------------------------------
// Icon map untuk kartu dokumen (lucide)
// ----------------------------------------------------------------------------
const DOKUMEN_ICONS: Record<string, React.ReactNode> = {
  SERTIFIKAT: <Award className="h-6 w-6" />,
  PIAGAM: <FileCheck className="h-6 w-6" />,
  KARTU_SANTRI: <IdCard className="h-6 w-6" />,
  KARTU_UJIAN: <CalendarClock className="h-6 w-6" />,
  BERITA_ACARA: <ClipboardList className="h-6 w-6" />,
}

// ----------------------------------------------------------------------------
// Helper: badge variant mapping (constants menyimpan "success"/"warning" dst,
// yang juga didukung oleh Badge shadcn).
// ----------------------------------------------------------------------------
function badgeVariant(v: BadgeVariant): any {
  return v as any
}

// ----------------------------------------------------------------------------
// Helper: auto-generate isi surat dari data santri/guru berdasarkan tipe.
// Dipakai saat santri dipilih & content textarea kosong (dapat di-edit manual).
// ----------------------------------------------------------------------------
function generateSuratContent(type: string, santri: any, guru: any, periodeMulai?: string, periodeSelesai?: string): string {
  if (!santri && !guru) return ""
  const today = new Date()
  const dateStr = formatDate(today)
  const namaMadrasah = "Madrasah Diniyah Al-Hidayah"

  const santriBlock = santri
    ? [
        `Nama: ${santri.name}`,
        `NIS: ${santri.nis || "-"}`,
        santri.kelas?.name ? `Kelas: ${santri.kelas.name}` : null,
        santri.birthPlace ? `Tempat/Tgl Lahir: ${santri.birthPlace}${santri.birthDate ? `, ${formatDate(santri.birthDate)}` : ""}` : null,
      ].filter(Boolean).join("\n")
    : ""

  const guruBlock = guru
    ? [`Nama: ${guru.name}`, guru.nip ? `NIP: ${guru.nip}` : null].filter(Boolean).join("\n")
    : ""

  switch (type) {
    case "AKTIF":
      return `Yang bertanda tangan di bawah ini, Kepala ${namaMadrasah}, menerangkan dengan sesungguhnya bahwa:\n\n${santriBlock}\n\nAdalah benar-benar santri yang masih aktif mengikuti pembelajaran di ${namaMadrasah} pada tahun ajaran berjalan.\n\nDemikian surat keterangan aktif ini dibuat untuk dapat dipergunakan sebagaimana mestinya.\n\n${dateStr}`
    case "IZIN":
      return `Yang bertanda tangan di bawah ini, Kepala ${namaMadrasah}, memberikan izin kepada:\n\n${santriBlock || guruBlock}\n\nuntuk tidak mengikuti kegiatan pembelajaran${periodeMulai ? ` mulai ${formatDate(periodeMulai)}` : ""}${periodeSelesai ? ` sampai ${formatDate(periodeSelesai)}` : ""}.\n\nDemikian surat izin ini dibuat untuk dapat dipergunakan sebagaimana mestinya.\n\n${dateStr}`
    case "TUGAS":
      return `Yang bertanda tangan di bawah ini, Kepala ${namaMadrasah}, dengan ini menugaskan kepada:\n\n${guruBlock || santriBlock}\n\nuntuk melaksanakan tugas sebagaimana mestinya${periodeMulai ? ` mulai ${formatDate(periodeMulai)}` : ""}${periodeSelesai ? ` sampai ${formatDate(periodeSelesai)}` : ""}.\n\nDemikian surat tugas ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab.\n\n${dateStr}`
    case "UNDANGAN":
      return `Dengan hormat,\n\nKami mengundang wali dari santri:\n\n${santriBlock}\n\nuntuk hadir pada kegiatan yang akan diselenggarakan oleh ${namaMadrasah}${periodeMulai ? ` pada ${formatDate(periodeMulai)}` : ""}.\n\nDemikian undangan ini kami sampaikan. Atas perhatian dan kehadirannya kami ucapkan terima kasih.\n\n${dateStr}`
    case "KETERANGAN":
      return `Yang bertanda tangan di bawah ini, Kepala ${namaMadrasah}, menerangkan bahwa:\n\n${santriBlock || guruBlock}\n\nadalah benar warga ${namaMadrasah}.\n\nDemikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.\n\n${dateStr}`
    case "KEPUTUSAN":
      return `KEPUTUSAN KEPALA ${namaMadrasah.toUpperCase()}\n\nNomor: .../KEP/${today.getFullYear()}\n\nKepala ${namaMadrasah}, menetapkan:\n\n${santriBlock || guruBlock}\n\nDemikian keputusan ini dibuat untuk dapat dilaksanakan sebagaimana mestinya.\n\n${dateStr}`
    case "KELULUSAN":
      return `Yang bertanda tangan di bawah ini, Kepala ${namaMadrasah}, menerangkan bahwa:\n\n${santriBlock}\n\ndinyatakan LULUS dari ${namaMadrasah} pada tahun ${today.getFullYear()}.\n\nDemikian surat keterangan kelulusan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.\n\n${dateStr}`
    default:
      return ""
  }
}

// ============================================================================
// MAIN VIEW
// ============================================================================
export function SuratView() {
  const [tab, setTab] = useState("surat")
  return (
    <div>
      <PageHeader
        title="Surat & Dokumen"
        description="Cetak surat otomatis, kartu santri/ujian, berita acara, dan dokumen lainnya"
        icon={<FileText className="h-5 w-5" />}
      />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="surat">
            <FileText className="h-3.5 w-3.5" /> Surat
          </TabsTrigger>
          <TabsTrigger value="dokumen">
            <ClipboardList className="h-3.5 w-3.5" /> Dokumen
          </TabsTrigger>
        </TabsList>
        <TabsContent value="surat" className="mt-4">
          <SuratTab />
        </TabsContent>
        <TabsContent value="dokumen" className="mt-4">
          <DokumenTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// TAB 1 — SURAT
// ============================================================================
function SuratTab() {
  const [data, setData] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (search) params.search = search
      if (typeFilter) params.type = typeFilter
      if (statusFilter) params.status = statusFilter
      const [res, santriRes, guruRes] = await Promise.all([
        apiGet("/api/admin/surat", params),
        apiGet("/api/admin/santri"),
        apiGet("/api/admin/guru"),
      ])
      setData(res.data || [])
      setSantriList(santriRes.data || [])
      setGuruList(guruRes.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id: string, nomor: string) => {
    if (!confirm(`Yakin ingin menghapus surat "${nomor}"?`)) return
    try {
      await apiDelete(`/api/admin/surat/${id}`)
      toast({ title: "Berhasil", description: "Surat dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handlePrintPdf = (id: string) => {
    window.open(`/api/admin/surat/${id}/pdf`, "_blank")
  }

  // Resolve nama penerima (santri atau guru)
  const resolvePenerima = (s: any): string => {
    if (s.santri) return s.santri.name
    if (s.guru) return s.guru.name
    if (s.penerimaNama) return s.penerimaNama
    return "-"
  }

  return (
    <div>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nomor surat / judul..."
        filters={
          <>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {SURAT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
                {Object.entries(SURAT_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Buat Surat
          </Button>
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
              icon={<FileText className="h-5 w-5" />}
              title="Belum ada surat"
              description="Klik 'Buat Surat' untuk membuat surat pertama."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Nomor Surat</TableHead>
                    <TableHead className="min-w-[200px]">Judul</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((s) => {
                    const tipe = SURAT_TYPES.find((t) => t.value === s.type)
                    const status = SURAT_STATUS[s.status]
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <span className="font-mono text-xs">{s.nomorSurat || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{s.title}</p>
                          {s.tempat && (
                            <p className="text-xs text-muted-foreground">{s.tempat}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tipe?.label || s.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{resolvePenerima(s)}</TableCell>
                        <TableCell>
                          {status ? (
                            <Badge variant={badgeVariant(status.variant)}>
                              {status.label}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{s.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.tanggalSurat ? formatDate(s.tanggalSurat) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Cetak PDF"
                              onClick={() => handlePrintPdf(s.id)}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit"
                              onClick={() => {
                                setEditing(s)
                                setDialogOpen(true)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title="Hapus"
                              onClick={() => handleDelete(s.id, s.nomorSurat || s.title)}
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

      <SuratForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        santriList={santriList}
        guruList={guruList}
        onSuccess={load}
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Surat Form Dialog
// ----------------------------------------------------------------------------
function SuratForm({
  open,
  onOpenChange,
  editing,
  santriList,
  guruList,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: any | null
  santriList: any[]
  guruList: any[]
  onSuccess: () => void
}) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Inisialisasi form ketika dialog dibuka
  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        ...editing,
        tanggalSurat: editing.tanggalSurat
          ? new Date(editing.tanggalSurat).toISOString().split("T")[0]
          : "",
        periodeMulai: editing.periodeMulai
          ? new Date(editing.periodeMulai).toISOString().split("T")[0]
          : "",
        periodeSelesai: editing.periodeSelesai
          ? new Date(editing.periodeSelesai).toISOString().split("T")[0]
          : "",
      })
    } else {
      setForm({
        type: "AKTIF",
        status: "DRAFT",
        tanggalSurat: new Date().toISOString().split("T")[0],
      })
    }
  }, [editing, open])

  // Auto-fill content ketika santri/guru dipilih (hanya jika content kosong)
  const handleSantriChange = (santriId: string) => {
    const santri = santriList.find((s) => s.id === santriId)
    const next = { ...form, santriId }
    if (santri && (!form.content || form.content.trim() === "")) {
      next.content = generateSuratContent(
        form.type,
        santri,
        guruList.find((g) => g.id === form.guruId),
        form.periodeMulai,
        form.periodeSelesai,
      )
    }
    setForm(next)
  }

  const handleGuruChange = (guruId: string) => {
    const guru = guruList.find((g) => g.id === guruId)
    const next = { ...form, guruId }
    if (guru && (!form.content || form.content.trim() === "")) {
      next.content = generateSuratContent(
        form.type,
        santriList.find((s) => s.id === form.santriId),
        guru,
        form.periodeMulai,
        form.periodeSelesai,
      )
    }
    setForm(next)
  }

  // Regenerate content secara manual (tombol "Auto-generate")
  const handleRegenerate = () => {
    const santri = santriList.find((s) => s.id === form.santriId)
    const guru = guruList.find((g) => g.id === form.guruId)
    if (!santri && !guru) {
      toast({
        title: "Pilih penerima dulu",
        description: "Pilih santri atau guru terlebih dahulu.",
        variant: "destructive",
      })
      return
    }
    const content = generateSuratContent(
      form.type,
      santri,
      guru,
      form.periodeMulai,
      form.periodeSelesai,
    )
    setForm({ ...form, content })
    toast({ title: "Isi surat dihasilkan", description: "Masih dapat diedit manual." })
  }

  const handleSave = async () => {
    if (!form.type || !form.title) {
      toast({
        title: "Validasi gagal",
        description: "Tipe dan judul surat wajib diisi.",
        variant: "destructive",
      })
      return
    }
    if (form.type === "TUGAS" && !form.guruId) {
      toast({
        title: "Validasi gagal",
        description: "Surat Tugas wajib memilih guru penerima.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/surat/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Surat diperbarui" })
      } else {
        await apiPost("/api/admin/surat", form)
        toast({ title: "Berhasil", description: "Surat baru dibuat" })
      }
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const showGuru = form.type === "TUGAS"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Surat" : "Buat Surat Baru"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Tipe Surat *</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SURAT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {SURAT_TYPES.find((t) => t.value === form.type)?.desc}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Judul Surat *</Label>
            <Input
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Mis. Surat Keterangan Aktif - Ahmad"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Santri Penerima</Label>
            <Select
              value={form.santriId || "none"}
              onValueChange={(v) => handleSantriChange(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Santri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {santriList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.nis ? `(${s.nis})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Guru Penerima {showGuru ? "*" : "(opsional)"}</Label>
            <Select
              value={form.guruId || "none"}
              onValueChange={(v) => handleGuruChange(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Guru" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {guruList.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Surat</Label>
            <Input
              type="date"
              value={form.tanggalSurat || ""}
              onChange={(e) => setForm({ ...form, tanggalSurat: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tempat</Label>
            <Input
              value={form.tempat || ""}
              onChange={(e) => setForm({ ...form, tempat: e.target.value })}
              placeholder="Mis. Bekasi"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Periode Mulai</Label>
            <Input
              type="date"
              value={form.periodeMulai || ""}
              onChange={(e) => setForm({ ...form, periodeMulai: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Periode Selesai</Label>
            <Input
              type="date"
              value={form.periodeSelesai || ""}
              onChange={(e) => setForm({ ...form, periodeSelesai: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={form.status || "DRAFT"}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SURAT_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Isi Surat</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                className="h-7 text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" /> Auto-generate
              </Button>
            </div>
            <Textarea
              value={form.content || ""}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={10}
              placeholder="Isi surat akan terisi otomatis saat santri/guru dipilih. Anda dapat mengeditnya secara manual."
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Isi auto-generate hanya akan menimpa textarea jika masih kosong. Klik
              "Auto-generate" untuk regenerasi manual.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// TAB 2 — DOKUMEN
// ============================================================================
function DokumenTab() {
  const [dialogType, setDialogType] = useState<string | null>(null)

  const handleClick = (type: string) => {
    setDialogType(type)
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOKUMEN_TYPES.map((d) => {
          const isComingSoon = d.value === "SERTIFIKAT" || d.value === "PIAGAM"
          return (
            <Card
              key={d.value}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isComingSoon ? "opacity-70" : "hover:border-primary/50"
              }`}
              onClick={() => !isComingSoon && handleClick(d.value)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    {DOKUMEN_ICONS[d.value]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{d.label}</h3>
                      {isComingSoon && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Lock className="h-2.5 w-2.5 mr-0.5" /> Segera
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {dialogType && (
        <DokumenSelectDialog
          key={dialogType}
          type={dialogType}
          onClose={() => setDialogType(null)}
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Dokumen Select Dialog — untuk kartu santri / berita acara / kartu ujian
// Komponen di-remount (via key) setiap kali `type` berubah, sehingga state
// internal (selectedSantri/selectedUjian) otomatis ter-reset.
// ----------------------------------------------------------------------------
function DokumenSelectDialog({
  type,
  onClose,
}: {
  type: string
  onClose: () => void
}) {
  const [santriList, setSantriList] = useState<any[]>([])
  const [ujianList, setUjianList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSantri, setSelectedSantri] = useState<string>("")
  const [selectedUjian, setSelectedUjian] = useState<string>("")
  const { toast } = useToast()

  // Load data pendukung sesuai tipe dokumen
  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (type === "KARTU_SANTRI") {
        const res = await apiGet("/api/admin/santri")
        setSantriList(res.data || [])
      } else if (type === "BERITA_ACARA" || type === "KARTU_UJIAN") {
        const res = await apiGet("/api/admin/ujian")
        setUjianList(res.data || [])
      }
    } catch (e: any) {
      toast({ title: "Gagal memuat data", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [type, toast])

  useEffect(() => {
    load()
  }, [load])

  const titleMap: Record<string, string> = {
    KARTU_SANTRI: "Cetak Kartu Santri",
    BERITA_ACARA: "Cetak Berita Acara Ujian",
    KARTU_UJIAN: "Cetak Kartu Ujian",
  }

  const handlePreview = () => {
    if (type === "KARTU_SANTRI") {
      if (!selectedSantri) {
        toast({ title: "Pilih santri", description: "Pilih santri terlebih dahulu.", variant: "destructive" })
        return
      }
      window.open(`/api/admin/dokumen/kartu-santri/${selectedSantri}`, "_blank")
    } else if (type === "BERITA_ACARA") {
      if (!selectedUjian) {
        toast({ title: "Pilih ujian", description: "Pilih ujian terlebih dahulu.", variant: "destructive" })
        return
      }
      window.open(`/api/admin/dokumen/berita-acara/${selectedUjian}`, "_blank")
    } else if (type === "KARTU_UJIAN") {
      if (!selectedUjian) {
        toast({ title: "Pilih ujian", description: "Pilih ujian terlebih dahulu.", variant: "destructive" })
        return
      }
      // Redirect ke endpoint kartu-pdf ujian (per-ujian, semua peserta)
      window.open(`/api/admin/ujian/${selectedUjian}/kartu-pdf`, "_blank")
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titleMap[type] || "Pilih Dokumen"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <LoadingState />
        ) : (
          <div className="space-y-3 py-2">
            {type === "KARTU_SANTRI" && (
              <div className="space-y-1">
                <Label className="text-xs">Pilih Santri</Label>
                <Select value={selectedSantri} onValueChange={setSelectedSantri}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cari & pilih santri..." />
                  </SelectTrigger>
                  <SelectContent>
                    {santriList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.nis ? `(${s.nis})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Kartu identitas santri digital akan dibuka di tab baru.
                </p>
              </div>
            )}

            {(type === "BERITA_ACARA" || type === "KARTU_UJIAN") && (
              <div className="space-y-1">
                <Label className="text-xs">Pilih Ujian</Label>
                <Select value={selectedUjian} onValueChange={setSelectedUjian}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ujian..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ujianList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {type === "BERITA_ACARA"
                    ? "Berita acara ujian akan dibuka di tab baru."
                    : "Kartu ujian untuk semua peserta akan dibuka di tab baru."}
                </p>
              </div>
            )}

            {type === "KARTU_SANTRI" && santriList.length === 0 && (
              <EmptyState
                icon={<IdCard className="h-5 w-5" />}
                title="Belum ada data santri"
                description="Tambahkan santri terlebih dahulu."
              />
            )}
            {(type === "BERITA_ACARA" || type === "KARTU_UJIAN") && ujianList.length === 0 && (
              <EmptyState
                icon={<CalendarClock className="h-5 w-5" />}
                title="Belum ada ujian"
                description="Buat ujian terlebih dahulu di menu Ujian."
              />
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handlePreview} disabled={loading}>
            <ExternalLink className="h-4 w-4 mr-1" /> Buka Dokumen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
