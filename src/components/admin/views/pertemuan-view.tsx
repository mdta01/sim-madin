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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatDate, STATUS_STYLES } from "@/lib/constants"
import { CalendarCheck, Plus, Pencil, Trash2, Eye, Save, ClipboardCheck, Award, CheckCircle2, Sparkles, Loader2, FolderOpen, ExternalLink } from "lucide-react"

const ABSENSI_OPTIONS = [
  { value: "HADIR", label: "Hadir", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "SAKIT", label: "Sakit", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "IZIN", label: "Izin", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "ALFA", label: "Alfa", color: "bg-red-100 text-red-800 border-red-300" },
]

export function PertemuanView() {
  const [data, setData] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [mapelFilter, setMapelFilter] = useState("")
  const [kelasFilter, setKelasFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailPertemuan, setDetailPertemuan] = useState<any | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (search) params.search = search
      if (mapelFilter) params.mapelId = mapelFilter
      if (kelasFilter) params.kelasId = kelasFilter
      const [res, mapelRes, kelasRes, guruRes] = await Promise.all([
        apiGet("/api/admin/pertemuan", params),
        apiGet("/api/admin/mapel"),
        apiGet("/api/admin/kelas"),
        apiGet("/api/admin/guru"),
      ])
      setData(res.data)
      setMapelList(mapelRes.data)
      setKelasList(kelasRes.data)
      setGuruList(guruRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, mapelFilter, kelasFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus pertemuan ini?")) return
    try {
      await apiDelete(`/api/admin/pertemuan/${id}`)
      toast({ title: "Berhasil", description: "Pertemuan dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleDetail = (p: any) => {
    setDetailPertemuan(p)
    setDetailOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Pertemuan & Absensi"
        description="Sesi kelas per pertemuan + absensi + nilai harian terstruktur"
        icon={<CalendarCheck className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => setGenerateOpen(true)}>
              <Sparkles className="h-4 w-4 mr-1" /> Generate dari Jadwal
            </Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Pertemuan</Button>
          </>
        }
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari topik pertemuan..."
        filters={
          <>
            <Select value={mapelFilter} onValueChange={(v) => setMapelFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="Belum ada pertemuan" description="Buat pertemuan pertama untuk kelas & mapel." /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">#</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Topik</TableHead>
                    <TableHead>Guru</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-center"><Badge variant="secondary">{p.pertemuanKe}</Badge></TableCell>
                      <TableCell className="text-sm">{formatDate(p.date)}</TableCell>
                      <TableCell className="text-sm">{p.kelas?.name}</TableCell>
                      <TableCell className="text-sm">{p.mapel?.name}</TableCell>
                      <TableCell className="text-sm">{p.topic || <span className="text-muted-foreground italic">Tanpa topik</span>}</TableCell>
                      <TableCell className="text-sm">{p.guru?.name || "-"}</TableCell>
                      <TableCell>
                        {p.isCompleted
                          ? <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Selesai</Badge>
                          : <Badge variant="warning">Belum</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Buka absensi & nilai" onClick={() => handleDetail(p)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(p); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      <PertemuanForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={load}
        mapelList={mapelList}
        kelasList={kelasList}
        guruList={guruList}
      />

      <PertemuanDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        pertemuan={detailPertemuan}
        onSuccess={load}
      />

      <GeneratePertemuanDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onSuccess={load}
        kelasList={kelasList}
        mapelList={mapelList}
      />
    </div>
  )
}

function PertemuanForm({ open, onOpenChange, editing, onSuccess, mapelList, kelasList, guruList }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: any | null
  onSuccess: () => void
  mapelList: any[]
  kelasList: any[]
  guruList: any[]
}) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        date: editing.date ? new Date(editing.date).toISOString().slice(0, 10) : "",
      })
    } else {
      setForm({
        pertemuanKe: 1,
        date: new Date().toISOString().slice(0, 10),
        isCompleted: false,
      })
    }
  }, [editing, open])

  const handleSave = async () => {
    if (!form.kelasId || !form.mapelId || !form.date || !form.pertemuanKe) {
      toast({ title: "Validasi gagal", description: "Kelas, Mapel, Tanggal, dan Pertemuan ke- wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/pertemuan/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Pertemuan diperbarui" })
      } else {
        await apiPost("/api/admin/pertemuan", form)
        toast({ title: "Berhasil", description: "Pertemuan baru dibuat" })
      }
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit Pertemuan" : "Tambah Pertemuan"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Kelas *</Label>
            <Select value={form.kelasId} onValueChange={(v) => setForm({ ...form, kelasId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mata Pelajaran *</Label>
            <Select value={form.mapelId} onValueChange={(v) => setForm({ ...form, mapelId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
              <SelectContent>
                {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal *</Label>
            <Input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pertemuan Ke- *</Label>
            <Input type="number" min={1} value={form.pertemuanKe || 1} onChange={(e) => setForm({ ...form, pertemuanKe: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Guru Pengampu</Label>
            <Select value={form.guruId || "none"} onValueChange={(v) => setForm({ ...form, guruId: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {guruList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Topik Pertemuan</Label>
            <Input value={form.topic || ""} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Mis: Hukum Bacaan Nun Mati" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi / Catatan</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Materi yang diajarkan, metode, dll" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PertemuanDetailDialog({ open, onOpenChange, pertemuan, onSuccess }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  pertemuan: any | null
  onSuccess: () => void
}) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("absensi")
  const [absensiEntries, setAbsensiEntries] = useState<Record<string, { status: string; note?: string }>>({})
  const [nilaiEntries, setNilaiEntries] = useState<Record<string, { score: string; notes?: string }>>({})
  const [savingAbsensi, setSavingAbsensi] = useState(false)
  const [savingNilai, setSavingNilai] = useState(false)
  const { toast } = useToast()

  const loadDetail = useCallback(async () => {
    if (!pertemuan) return
    setLoading(true)
    try {
      const [absensiRes, nilaiRes] = await Promise.all([
        apiGet(`/api/admin/pertemuan/${pertemuan.id}`),
        apiGet(`/api/admin/pertemuan/${pertemuan.id}/nilai`),
      ])
      setDetail(absensiRes.data)
      // Init absensi entries from existing data
      const absInit: Record<string, { status: string; note?: string }> = {}
      absensiRes.data.santriList?.forEach((s: any) => {
        absInit[s.id] = {
          status: s.absensi?.status || "HADIR",
          note: s.absensi?.note || "",
        }
      })
      setAbsensiEntries(absInit)
      // Init nilai entries
      const nilaiInit: Record<string, { score: string; notes?: string }> = {}
      nilaiRes.data.santriList?.forEach((s: any) => {
        nilaiInit[s.id] = {
          score: s.nilai ? String(s.nilai.score) : "",
          notes: s.nilai?.notes || "",
        }
      })
      setNilaiEntries(nilaiInit)
    } catch (e: any) {
      toast({ title: "Gagal memuat", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [pertemuan])

  useEffect(() => {
    if (open && pertemuan) loadDetail()
  }, [open, pertemuan, loadDetail])

  const setAbsensiStatus = (santriId: string, status: string) => {
    setAbsensiEntries((prev) => ({
      ...prev,
      [santriId]: { ...prev[santriId], status },
    }))
  }

  const setNilaiScore = (santriId: string, score: string) => {
    setNilaiEntries((prev) => ({
      ...prev,
      [santriId]: { ...prev[santriId], score },
    }))
  }

  const saveAbsensi = async () => {
    setSavingAbsensi(true)
    try {
      const entries = Object.entries(absensiEntries).map(([santriId, v]) => ({
        santriId,
        status: v.status,
        note: v.note || null,
      }))
      await apiPut(`/api/admin/pertemuan/${pertemuan.id}/absensi`, {
        entries,
        guruId: pertemuan.guruId,
        markCompleted: true,
      })
      toast({ title: "Berhasil", description: `${entries.length} absensi tersimpan & pertemuan ditandai selesai` })
      onSuccess()
      loadDetail()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSavingAbsensi(false)
    }
  }

  const saveNilai = async () => {
    setSavingNilai(true)
    try {
      const entries = Object.entries(nilaiEntries)
        .filter(([, v]) => v.score !== "" && v.score !== null)
        .map(([santriId, v]) => ({
          santriId,
          score: Number(v.score),
          notes: v.notes || null,
        }))
      if (entries.length === 0) {
        toast({ title: "Info", description: "Tidak ada nilai untuk disimpan" })
        return
      }
      await apiPut(`/api/admin/pertemuan/${pertemuan.id}/nilai`, {
        entries,
        guruId: pertemuan.guruId,
      })
      toast({ title: "Berhasil", description: `${entries.length} nilai tersimpan` })
      onSuccess()
      loadDetail()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSavingNilai(false)
    }
  }

  const markAllHadir = () => {
    const updated: Record<string, { status: string; note?: string }> = {}
    Object.keys(absensiEntries).forEach((id) => {
      updated[id] = { ...absensiEntries[id], status: "HADIR" }
    })
    setAbsensiEntries(updated)
  }

  if (!pertemuan) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Pertemuan #{pertemuan.pertemuanKe} — {pertemuan.kelas?.name} • {pertemuan.mapel?.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{formatDate(pertemuan.date)} {pertemuan.topic ? `• ${pertemuan.topic}` : ""}</p>
        </DialogHeader>

        {detail?.absensiStats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Hadir</p><p className="text-base font-bold text-green-600">{detail.absensiStats.hadir}</p></CardContent></Card>
            <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Sakit</p><p className="text-base font-bold text-yellow-600">{detail.absensiStats.sakit}</p></CardContent></Card>
            <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Izin</p><p className="text-base font-bold text-blue-600">{detail.absensiStats.izin}</p></CardContent></Card>
            <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Alfa</p><p className="text-base font-bold text-red-600">{detail.absensiStats.alfa}</p></CardContent></Card>
            <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Belum Absen</p><p className="text-base font-bold text-muted-foreground">{detail.absensiStats.belum}</p></CardContent></Card>
          </div>
        )}

        {loading ? <LoadingState /> : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="absensi"><ClipboardCheck className="h-4 w-4 mr-1" /> Absensi</TabsTrigger>
              <TabsTrigger value="nilai"><Award className="h-4 w-4 mr-1" /> Nilai Harian</TabsTrigger>
              <TabsTrigger value="materi"><FolderOpen className="h-4 w-4 mr-1" /> Materi</TabsTrigger>
            </TabsList>

            <TabsContent value="absensi" className="space-y-2 mt-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Klik status untuk mengubah. Tombol "Tandai Semua Hadir" untuk aksi cepat.</p>
                <Button size="sm" variant="outline" onClick={markAllHadir}>Tandai Semua Hadir</Button>
              </div>
              {detail?.santriList?.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 font-semibold text-xs">
                      {s.name?.[0] || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.nis}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {ABSENSI_OPTIONS.map((opt) => {
                      const current = absensiEntries[s.id]?.status
                      const isActive = current === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setAbsensiStatus(s.id, opt.value)}
                          className={`px-2 py-1 rounded text-xs border transition-colors ${isActive ? opt.color + " font-semibold" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div className="sticky bottom-0 bg-background py-3 border-t mt-3">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
                  <Button onClick={saveAbsensi} disabled={savingAbsensi}>
                    <Save className="h-4 w-4 mr-1" /> {savingAbsensi ? "Menyimpan..." : "Simpan Absensi & Tandai Selesai"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="nilai" className="space-y-2 mt-3">
              <p className="text-sm text-muted-foreground">
                Nilai harian per pertemuan. Skor 0-100 (akan dibandingkan dengan KKM mapel: {detail?.mapel?.kkm || 70}).
                Kosongkan jika santri tidak ada nilai pada pertemuan ini.
              </p>
              {detail?.santriList?.map((s: any) => {
                const existingNilai = s.nilai
                const kkm = detail?.mapel?.kkm || 70
                const score = nilaiEntries[s.id]?.score
                const numScore = score ? Number(score) : null
                const isAboveKKM = numScore !== null && numScore >= kkm
                const isBelowKKM = numScore !== null && numScore < kkm
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 font-semibold text-xs">
                        {s.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{s.nis}</p>
                      </div>
                      {existingNilai && (
                        <Badge variant={isAboveKKM ? "success" : isBelowKKM ? "destructive" : "secondary"} className="text-[10px]">
                          Tersimpan: {existingNilai.score}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={nilaiEntries[s.id]?.score || ""}
                        onChange={(e) => setNilaiScore(s.id, e.target.value)}
                        placeholder="-"
                        className="w-20 h-8"
                      />
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </div>
                )
              })}
              <div className="sticky bottom-0 bg-background py-3 border-t mt-3">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
                  <Button onClick={saveNilai} disabled={savingNilai}>
                    <Save className="h-4 w-4 mr-1" /> {savingNilai ? "Menyimpan..." : "Simpan Nilai Harian"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* V2 #8: Tab Materi — list materi yang relevan untuk pertemuan ini */}
            <TabsContent value="materi" className="space-y-2 mt-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">
                  Materi yang dipublikasikan untuk {pertemuan.kelas?.name} • {pertemuan.mapel?.name} • Pertemuan #{pertemuan.pertemuanKe}
                </p>
              </div>
              {detail?.relatedMateri && detail.relatedMateri.length > 0 ? (
                detail.relatedMateri.map((m: any) => {
                  const typeLabel = { DOKUMEN: "Dokumen", FOTO: "Foto", VIDEO: "Video", LINK: "Link", AUDIO: "Audio" }[m.type] || m.type
                  return (
                    <Card key={m.id}>
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                          <FolderOpen className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium text-sm">{m.title}</p>
                            <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                            {m.pertemuan === pertemuan.pertemuanKe && (
                              <Badge variant="secondary" className="text-[10px]">Pertemuan ini</Badge>
                            )}
                            {m.pertemuan === null && (
                              <Badge variant="outline" className="text-[10px]">Umum</Badge>
                            )}
                          </div>
                          {m.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{m.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            {m.guru?.name ? `Oleh: ${m.guru.name} • ` : ""}
                            Diterbitkan: {formatDate(m.publishedAt)}
                          </p>
                        </div>
                        {(m.fileUrl || m.externalUrl) && (
                          <a
                            href={m.externalUrl || m.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Buka
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <EmptyState
                      icon={<FolderOpen className="h-5 w-5" />}
                      title="Belum ada materi untuk pertemuan ini"
                      description={`Publikasikan materi di menu "Materi Pembelajaran" dengan men-set pertemuan ke-${pertemuan.pertemuanKe} untuk mapel ini.`}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GeneratePertemuanDialog({ open, onOpenChange, onSuccess, kelasList, mapelList }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
  kelasList: any[]
  mapelList: any[]
}) {
  const [weekStart, setWeekStart] = useState<string>(new Date().toISOString().slice(0, 10))
  const [kelasId, setKelasId] = useState<string>("all")
  const [mapelId, setMapelId] = useState<string>("all")
  const [dryRun, setDryRun] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!weekStart) {
      toast({ title: "Validasi", description: "Tanggal mulai minggu wajib diisi", variant: "destructive" })
      return
    }
    setGenerating(true)
    setResult(null)
    try {
      const payload: any = { weekStartDate: weekStart, dryRun }
      if (kelasId !== "all") payload.kelasId = kelasId
      if (mapelId !== "all") payload.mapelId = mapelId

      const res = await apiPost("/api/admin/pertemuan/generate-from-jadwal", payload)
      setResult(res)

      if (!dryRun && res.created?.length > 0) {
        toast({
          title: "Berhasil",
          description: `${res.created.length} pertemuan dibuat, ${res.skipped?.length || 0} dilewati`,
        })
        onSuccess()
      } else if (dryRun) {
        toast({
          title: "Preview siap",
          description: `${res.created?.length || 0} pertemuan akan dibuat. Hapus centang "Preview" untuk eksekusi.`,
        })
      } else {
        toast({
          title: "Tidak ada perubahan",
          description: res.skipped?.length > 0
            ? `Semua ${res.skipped.length} pertemuan sudah ada untuk minggu ini`
            : "Tidak ada jadwal yang cocok untuk filter ini",
        })
      }
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setResult(null) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Generate Pertemuan dari Jadwal
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Auto-create pertemuan untuk minggu tertentu berdasarkan Jadwal Pelajaran yang sudah ada di TA/Semester aktif.
            Setiap jadwal akan jadi 1 pertemuan dengan nomor urut otomatis.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tanggal di Minggu Target *</Label>
              <Input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Bisa tanggal apa saja di minggu target. Sistem akan auto-adjust ke hari Senin minggu itu.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Filter Kelas (opsional)</Label>
                <Select value={kelasId} onValueChange={setKelasId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Filter Mapel (opsional)</Label>
                <Select value={mapelId} onValueChange={setMapelId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mapel</SelectItem>
                    {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded border-input"
              />
              <span>Preview dulu (rekomendasi) — tidak menyimpan, hanya lihat apa yang akan dibuat</span>
            </label>
          </div>

          {result && (
            <div className="border rounded-md p-3 bg-muted/30 space-y-2 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div><p className="text-muted-foreground">Dibuat</p><p className="font-bold text-green-600">{result.created?.length || 0}</p></div>
                <div><p className="text-muted-foreground">Dilewati</p><p className="font-bold text-blue-600">{result.skipped?.length || 0}</p></div>
                <div><p className="text-muted-foreground">Error</p><p className="font-bold text-red-600">{result.errors?.length || 0}</p></div>
              </div>
              {result.created?.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs font-medium">Pertemuan {dryRun ? "yang akan dibuat" : "yang dibuat"}:</p>
                  {result.created.slice(0, 8).map((c: any, i: number) => (
                    <div key={i} className="text-xs flex justify-between gap-2">
                      <span className="truncate">{c.kelas} • {c.mapel}</span>
                      <span className="text-muted-foreground">#{c.pertemuanKe} • {c.date}</span>
                    </div>
                  ))}
                  {result.created.length > 8 && <p className="text-[10px] text-muted-foreground">+ {result.created.length - 8} lainnya...</p>}
                </div>
              )}
              {result.skipped?.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs font-medium text-blue-700">Dilewati (sudah ada):</p>
                  {result.skipped.slice(0, 4).map((s: any, i: number) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      • {s.kelas} • {s.mapel} ({s.date})
                    </div>
                  ))}
                  {result.skipped.length > 4 && <p className="text-[10px] text-muted-foreground">+ {result.skipped.length - 4} lainnya...</p>}
                </div>
              )}
              {result.errors?.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs font-medium text-red-700">Error:</p>
                  {result.errors.slice(0, 3).map((e: any, i: number) => (
                    <div key={i} className="text-xs text-red-700">• {e.kelas} • {e.mapel}: {e.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {generating ? "Memproses..." : dryRun ? "Preview" : "Generate Sekarang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
