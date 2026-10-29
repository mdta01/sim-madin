"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { TUGAS_TYPES, PENGUMPULAN_STATUS, formatDate } from "@/lib/constants"
import { ClipboardList, Plus, Pencil, Trash2, Eye, Save, FileText, Loader2, Upload, ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react"

export function TugasView() {
  const [data, setData] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [materiList, setMateriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [mapelFilter, setMapelFilter] = useState("")
  const [kelasFilter, setKelasFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTugas, setDetailTugas] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (search) params.search = search
      if (mapelFilter) params.mapelId = mapelFilter
      if (kelasFilter) params.kelasId = kelasFilter
      if (statusFilter) params.status = statusFilter
      const [res, mapelRes, kelasRes, guruRes] = await Promise.all([
        apiGet("/api/admin/tugas", params),
        apiGet("/api/admin/mapel"),
        apiGet("/api/admin/kelas"),
        apiGet("/api/admin/guru"),
      ])
      setData(res.data)
      setMapelList(mapelRes.data)
      setKelasList(kelasRes.data)
      setGuruList(guruRes.data)
      // Lazy load materi for dropdown
      apiGet("/api/admin/materi").then((r) => setMateriList(r.data)).catch(() => {})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, mapelFilter, kelasFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus tugas ini? Pengumpulan yang sudah ada tetap aman.")) return
    try {
      await apiDelete(`/api/admin/tugas/${id}`)
      toast({ title: "Berhasil", description: "Tugas telah dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleDetail = async (tugas: any) => {
    setDetailTugas(tugas)
    setDetailOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Tugas & Pengumpulan"
        description="Buat tugas untuk santri, kelola pengumpulan & penilaian"
        icon={<ClipboardList className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Tugas</Button>}
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari judul tugas..."
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
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="overdue">Lewat Tenggat</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="Belum ada tugas" description="Buat tugas pertama untuk santri." /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Judul Tugas</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Tenggat</TableHead>
                    <TableHead>Pengumpulan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((t) => {
                    const isOverdue = t.isOverdue
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{t.title}</p>
                          {t.description && <p className="text-xs text-muted-foreground truncate max-w-[280px]">{t.description}</p>}
                        </TableCell>
                        <TableCell className="text-sm">{t.mapel?.name}</TableCell>
                        <TableCell className="text-sm">{t.kelas?.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{TUGAS_TYPES.find(tp => tp.value === t.type)?.label || t.type}</Badge></TableCell>
                        <TableCell className="text-xs">
                          <div className={isOverdue ? "text-destructive font-medium" : ""}>
                            {formatDate(t.dueDate, true)}
                          </div>
                          {isOverdue ? <span className="text-destructive text-[10px]">Lewat tenggat</span> : null}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{t._count?.submissions || 0} kumpul</Badge>
                        </TableCell>
                        <TableCell>
                          {isOverdue ? <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Lewat</Badge> :
                           <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Aktif</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Lihat pengumpulan" onClick={() => handleDetail(t)}><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(t); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      <TugasForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={load}
        mapelList={mapelList}
        kelasList={kelasList}
        guruList={guruList}
        materiList={materiList}
      />

      <PengumpulanDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        tugas={detailTugas}
        onSuccess={load}
      />
    </div>
  )
}

function TugasForm({ open, onOpenChange, editing, onSuccess, mapelList, kelasList, guruList, materiList }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: any | null
  onSuccess: () => void
  mapelList: any[]
  kelasList: any[]
  guruList: any[]
  materiList: any[]
}) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        dueDate: editing.dueDate ? new Date(editing.dueDate).toISOString().slice(0, 16) : "",
      })
    } else {
      setForm({
        type: "INDIVIDU",
        maxScore: 100,
        isPublished: true,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
      })
    }
  }, [editing, open])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimum 5 MB", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("prefix", "tugas")
      const res = await apiPost<{ url: string }>("/api/admin/upload", formData)
      setForm((f: any) => ({ ...f, fileUrl: res.url }))
      toast({ title: "File terunggah", description: file.name })
    } catch (err: any) {
      toast({ title: "Upload gagal", description: err.message, variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (!form.title || !form.mapelId || !form.kelasId || !form.dueDate) {
      toast({ title: "Validasi gagal", description: "Judul, Mapel, Kelas, dan Tenggat wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/tugas/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Tugas diperbarui" })
      } else {
        await apiPost("/api/admin/tugas", form)
        toast({ title: "Berhasil", description: "Tugas baru ditambahkan" })
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Tugas" : "Tambah Tugas Baru"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Judul Tugas *</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mis: Hafalan Surat Al-Falaq" />
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
            <Label className="text-xs">Kelas *</Label>
            <Select value={form.kelasId} onValueChange={(v) => setForm({ ...form, kelasId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe Tugas</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TUGAS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
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
          <div className="space-y-1">
            <Label className="text-xs">Tenggat Waktu *</Label>
            <Input type="datetime-local" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Skor Maksimal</Label>
            <Input type="number" value={form.maxScore || 100} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Materi Terkait (opsional)</Label>
            <Select value={form.materiId || "none"} onValueChange={(v) => setForm({ ...form, materiId: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Materi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {materiList.map((m) => <SelectItem key={m.id} value={m.id}>{m.title} ({m.mapel?.name})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi / Instruksi</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Instruksi tugas untuk santri, kriteria penilaian..."
              rows={4}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">File Pendukung (opsional, maks 5 MB)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                {uploading ? "Mengunggah..." : "Pilih File"}
              </Button>
              {form.fileUrl && (
                <a href={form.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Lihat file
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2 pt-2">
            <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} id="tugas-publish" />
            <Label htmlFor="tugas-publish" className="text-sm cursor-pointer">Publikasikan ke santri</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PengumpulanDialog({ open, onOpenChange, tugas, onSuccess }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  tugas: any | null
  onSuccess: () => void
}) {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [gradingId, setGradingId] = useState<string | null>(null)
  const [gradeForm, setGradeForm] = useState<any>({})
  const [savingGrade, setSavingGrade] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && tugas) {
      loadSubmissions(tugas.id)
    }
  }, [open, tugas])

  const loadSubmissions = async (tugasId: string) => {
    setLoading(true)
    try {
      const res = await apiGet(`/api/admin/tugas/${tugasId}/pengumpulan`)
      setSubmissions(res.data)
      setStats(res.stats)
    } catch (e: any) {
      toast({ title: "Gagal memuat", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const startGrading = (s: any) => {
    setGradingId(s.id)
    setGradeForm({
      score: s.score ?? "",
      feedback: s.feedback ?? "",
    })
  }

  const saveGrade = async (submissionId: string) => {
    setSavingGrade(true)
    try {
      await apiPut(`/api/admin/pengumpulan/${submissionId}`, {
        score: gradeForm.score === "" ? null : Number(gradeForm.score),
        feedback: gradeForm.feedback,
      })
      toast({ title: "Berhasil", description: "Nilai disimpan" })
      setGradingId(null)
      if (tugas) loadSubmissions(tugas.id)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSavingGrade(false)
    }
  }

  if (!tugas) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pengumpulan: {tugas.title}</DialogTitle>
        </DialogHeader>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Santri</p><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sudah Kumpul</p><p className="text-xl font-bold text-blue-600">{stats.submitted}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sudah Dinilai</p><p className="text-xl font-bold text-green-600">{stats.graded}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Belum Kumpul</p><p className="text-xl font-bold text-orange-600">{stats.notSubmitted}</p></CardContent></Card>
          </div>
        )}

        {loading ? <LoadingState /> : (
          <div className="space-y-2">
            {submissions.map((s) => {
              const statusInfo = PENGUMPULAN_STATUS[s.status] || { label: s.status, variant: "outline" as const }
              const isGrading = gradingId === s.id
              return (
                <Card key={s.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 font-semibold text-sm">
                          {s.santri?.name?.[0] || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{s.santri?.name}</p>
                            <span className="text-xs text-muted-foreground font-mono">{s.santri?.nis}</span>
                            <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
                          </div>
                          {s.submittedAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Dikumpul: {formatDate(s.submittedAt, true)}
                              {s.fileUrl && (
                                <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-2 text-primary hover:underline">
                                  <ExternalLink className="h-3 w-3" /> Lihat file
                                </a>
                              )}
                            </p>
                          )}
                          {s.textAnswer && (
                            <p className="text-xs mt-1 text-muted-foreground italic line-clamp-2">"{s.textAnswer}"</p>
                          )}
                          {s.score !== null && s.score !== undefined && (
                            <p className="text-sm font-semibold mt-1 text-green-600">Nilai: {s.score} / {tugas.maxScore}</p>
                          )}
                          {s.feedback && (
                            <p className="text-xs mt-1 text-muted-foreground">Feedback: {s.feedback}</p>
                          )}
                        </div>
                      </div>
                      {!isGrading && s.status !== "NOT_SUBMITTED" && (
                        <Button size="sm" variant="outline" onClick={() => startGrading(s)}>
                          {s.score !== null && s.score !== undefined ? "Edit Nilai" : "Beri Nilai"}
                        </Button>
                      )}
                    </div>

                    {isGrading && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Nilai (0-{tugas.maxScore})</Label>
                            <Input type="number" min={0} max={tugas.maxScore} value={gradeForm.score} onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })} />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs">Feedback (opsional)</Label>
                            <Input value={gradeForm.feedback} onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })} placeholder="Catatan untuk santri..." />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setGradingId(null)}>Batal</Button>
                          <Button size="sm" onClick={() => saveGrade(s.id)} disabled={savingGrade}>
                            <Save className="h-3.5 w-3.5 mr-1" /> {savingGrade ? "Menyimpan..." : "Simpan Nilai"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
            {submissions.length === 0 && (
              <EmptyState icon={<AlertCircle className="h-5 w-5" />} title="Belum ada pengumpulan" />
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
