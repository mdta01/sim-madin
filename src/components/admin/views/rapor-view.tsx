"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
import { PageHeader } from "@/components/admin/shared/page-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
import { Breadcrumb } from "@/components/admin/shared/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { formatDate, NILAI_BOBAT } from "@/lib/constants"
import { FileText, Plus, Wand2, ArrowLeft, Printer, Award, TrendingUp, Loader2, Sparkles, Save, BookOpen } from "lucide-react"

export function RaporView() {
  const selectedId = useAdminStore((s) => s.selectedEntityId)
  if (selectedId) return <RaporDetail id={selectedId} />
  return <RaporList />
}

function RaporList() {
  const [rapor, setRapor] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kelasFilter, setKelasFilter] = useState("")
  const [bulkOpen, setBulkOpen] = useState(false)
  const [noteForm, setNoteForm] = useState("")
  const { toast } = useToast()
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (kelasFilter) params.kelasId = kelasFilter
      const [rRes, kRes] = await Promise.all([
        apiGet("/api/admin/rapor", params),
        apiGet("/api/admin/kelas"),
      ])
      setRapor(rRes.data)
      setKelasList(kRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [kelasFilter])

  useEffect(() => { load() }, [load])

  const handleGenerateKelas = async (kelasId: string) => {
    try {
      const res = await apiPost("/api/admin/rapor", { kelasId, notes: noteForm })
      toast({ title: "Berhasil", description: `${res.count} rapor di-generate` })
      setBulkOpen(false)
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Rapor"
        description="Generate dan kelola rapor santri"
        icon={<FileText className="h-5 w-5" />}
        actions={<Button onClick={() => setBulkOpen(true)}><Wand2 className="h-4 w-4 mr-1" /> Generate Rapor Kelas</Button>}
      />

      <div className="flex gap-3 mb-4">
        <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            rapor.length === 0 ? <EmptyState icon={<FileText className="h-5 w-5" />} title="Belum ada rapor" description="Generate rapor per kelas terlebih dahulu" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Santri</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead className="text-center">Hadir</TableHead>
                    <TableHead className="text-center">S/I/A</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rapor.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectEntity(r.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{r.santri?.name?.[0]}</AvatarFallback></Avatar>
                          <div>
                            <p className="text-sm font-medium">{r.santri?.name}</p>
                            <p className="text-[11px] text-muted-foreground">{r.santri?.nis}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.kelas?.name}</TableCell>
                      <TableCell className="text-sm">{r.semester?.name} {r.tahunAjaran?.code}</TableCell>
                      <TableCell className="text-center text-sm">{r.absensiHadir}</TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="text-amber-600">{r.absensiSakit}</span>/<span className="text-blue-600">{r.absensiIzin}</span>/<span className="text-red-600">{r.absensiAlfa}</span>
                      </TableCell>
                      <TableCell>
                        {r.published ? <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Terbit</Badge> : <Badge variant="outline">Draft</Badge>}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => selectEntity(r.id)}><FileText className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle className="text-base">Generate Rapor Kelas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Pilih kelas untuk generate rapor semua santri di kelas tersebut.</p>
              {kelasList.map((k) => (
                <Button key={k.id} variant="outline" className="w-full justify-start" onClick={() => handleGenerateKelas(k.id)}>
                  {k.name} ({k._count?.santri || 0} santri)
                </Button>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Catatan Wali Kelas (opsional)</Label>
                <Textarea value={noteForm} onChange={(e) => setNoteForm(e.target.value)} rows={2} placeholder="Catatan umum untuk semua santri" />
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setBulkOpen(false)}>Batal</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function RaporDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  // V3: catatan extensions (prestasi, akhlak, saran)
  const [catatanWaliKelas, setCatatanWaliKelas] = useState("")
  const [prestasi, setPrestasi] = useState("")
  const [akhlak, setAkhlak] = useState("")
  const [saran, setSaran] = useState("")
  const [savingCatatan, setSavingCatatan] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [raporRes, catatanRes] = await Promise.all([
        apiGet(`/api/admin/rapor/${id}`),
        apiGet(`/api/admin/rapor/${id}/catatan`).catch(() => ({ data: null })),
      ])
      setData(raporRes.data)
      setNotes(raporRes.data.notes || "")
      // V3: load catatan extensions
      if (catatanRes.data) {
        setCatatanWaliKelas(catatanRes.data.catatanWaliKelas || "")
        setPrestasi(catatanRes.data.prestasi || "")
        setAkhlak(catatanRes.data.akhlak || "")
        setSaran(catatanRes.data.saran || "")
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handlePublish = async () => {
    setSaving(true)
    try {
      await apiPut(`/api/admin/rapor/${id}`, { notes, published: true, publishedAt: new Date().toISOString() })
      toast({ title: "Berhasil", description: "Rapor diterbitkan" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await apiPut(`/api/admin/rapor/${id}`, { notes })
      toast({ title: "Berhasil", description: "Catatan disimpan" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // V3: Generate rapor (auto-compute nilaiAkhir per mapel from all nilai types)
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await apiPost(`/api/admin/rapor/${id}/generate`, { overwrite: true })
      toast({
        title: "Rapor di-generate",
        description: `${res.count} mapel diproses • Rata-rata: ${res.raporStats?.avgNilaiAkhir || 0} • Tuntas: ${res.raporStats?.tuntas || 0}/${res.count}`,
      })
      load()
    } catch (e: any) {
      toast({ title: "Gagal generate", description: e.message, variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  // V3: Save catatan extensions (prestasi, akhlak, saran, catatanWaliKelas)
  const handleSaveCatatan = async () => {
    setSavingCatatan(true)
    try {
      await apiPut(`/api/admin/rapor/${id}/catatan`, {
        catatanWaliKelas,
        prestasi,
        akhlak,
        saran,
      })
      toast({ title: "Berhasil", description: "Catatan & pengembangan disimpan" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSavingCatatan(false)
    }
  }

  if (loading) return <LoadingState className="py-20" />
  if (error || !data) return <ErrorState message={error || "Data tidak ditemukan"} onRetry={load} />

  const { santri, kelas, semester, tahunAjaran, rekapNilai, rataRataKeseluruhan, ranking, totalSantriKelas, absensiHadir, absensiSakit, absensiIzin, absensiAlfa, published } = data

  return (
    <div>
      <Breadcrumb items={[{ label: "Rapor", onClick: () => selectEntity(null) }, { label: `${santri.name} - ${semester.name}` }]} />

      {/* Rapor Header */}
      <Card className="mb-4">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14"><AvatarFallback className="text-xl bg-primary/10 text-primary">{santri.name[0]}</AvatarFallback></Avatar>
              <div>
                <h1 className="text-xl font-bold">{santri.name}</h1>
                <p className="text-sm text-muted-foreground">{santri.nis} • {kelas.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{semester.name} • {tahunAjaran.name}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {published ? <StatusBadge status="LUNAS" /> : <Badge variant="outline">Draft</Badge>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectEntity(null)}><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Kembali</Button>
                {!published && <Button size="sm" onClick={handlePublish} disabled={saving}><Award className="h-3.5 w-3.5 mr-1" /> Terbitkan</Button>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
          <p className="text-xs text-muted-foreground">Rata-rata</p>
          <p className="text-xl font-bold">{rataRataKeseluruhan}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Award className="h-5 w-5 mx-auto mb-1 text-amber-600" />
          <p className="text-xs text-muted-foreground">Ranking</p>
          <p className="text-xl font-bold">{ranking} / {totalSantriKelas}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Hadir</p>
          <p className="text-xl font-bold text-emerald-600">{absensiHadir}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Sakit/Izin/Alfa</p>
          <p className="text-sm font-bold">
            <span className="text-amber-600">{absensiSakit}</span> /
            <span className="text-blue-600"> {absensiIzin}</span> /
            <span className="text-red-600"> {absensiAlfa}</span>
          </p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rekap Nilai — V3: dengan breakdown per jenis + bobot */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Rekap Nilai per Mata Pelajaran</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Rapor komprehensif: gabungan HARIAN (25%) + TUGAS (15%) + UTS (25%) + UAS (25%) + PRAKTIK (10%)
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Generate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rekapNilai?.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-5 w-5" />}
                title="Belum ada nilai"
                description="Belum ada nilai yang diinput. Pastikan guru sudah input nilai harian, tugas, dan ujian."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mata Pelajaran</TableHead>
                      <TableHead>Detail Nilai per Jenis</TableHead>
                      <TableHead className="text-center">Nilai Akhir</TableHead>
                      <TableHead className="text-center">Predikat</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rekapNilai.map((n: any) => (
                      <TableRow key={n.mapelId}>
                        <TableCell className="font-medium text-sm">{n.mapelName}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {n.detail.map((d: any) => {
                              const bobot = NILAI_BOBAT[d.type] || 0
                              const bobotPct = Math.round(bobot * 100)
                              return (
                                <Badge
                                  key={d.type}
                                  variant={d.type === "UTS" || d.type === "UAS" ? "default" : "outline"}
                                  className="text-[10px] font-mono"
                                  title={`Bobot: ${bobotPct}%`}
                                >
                                  {d.type}: {d.nilai}
                                  {bobot > 0 && <span className="opacity-60 ml-0.5">({bobotPct}%)</span>}
                                </Badge>
                              )
                            })}
                          </div>
                          {n.detail.length === 0 && <span className="text-xs text-muted-foreground italic">Belum ada nilai</span>}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-base">{n.rataRata}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={n.rataRata >= 90 ? "default" : n.rataRata >= 70 ? "secondary" : "destructive"}>
                            {n.rataRata >= 90 ? "A" : n.rataRata >= 80 ? "B" : n.rataRata >= 70 ? "C" : n.rataRata >= 60 ? "D" : "E"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {n.tuntas ? <Badge variant="success">Tuntas</Badge> : <Badge variant="destructive">Remedial</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Catatan Wali Kelas + V3 extensions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Catatan & Pengembangan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Catatan Wali Kelas</Label>
              <Textarea value={catatanWaliKelas} onChange={(e) => setCatatanWaliKelas(e.target.value)} rows={3} placeholder="Catatan umum..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prestasi</Label>
              <Input value={prestasi} onChange={(e) => setPrestasi(e.target.value)} placeholder="Juara 1 Tahfidz" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Akhlak & Sikap</Label>
              <Input value={akhlak} onChange={(e) => setAkhlak(e.target.value)} placeholder="Sangat Baik" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Saran Pengembangan</Label>
              <Textarea value={saran} onChange={(e) => setSaran(e.target.value)} rows={2} placeholder="Saran untuk santri..." />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleSaveCatatan} disabled={savingCatatan}>
              <Save className="h-3.5 w-3.5 mr-1" /> Simpan Catatan
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* V3: Komposisi Rapor Info Banner */}
      <Card className="mt-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Rapor Komprehensif — Bukan Hanya Hasil Ujian</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rapor ini mencakup <strong>semua kegiatan akademik</strong> santri selama satu semester:
                Nilai Harian dari pertemuan (25%), Tugas yang dikumpulkan (15%), UTS (25%), UAS (25%), dan Praktik (10%).
                Ujian diinput manual oleh guru setelah ujian dilaksanakan secara nyata di kelas.
                Catatan wali kelas, prestasi, dan akhlak melengkapi rapor untuk gambaran menyeluruh.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* V3: Cetak PDF — sekarang berfungsi */}
      <Card className="mt-4">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Cetak Rapor (PDF)</p>
            <p className="text-xs text-muted-foreground">Format PDF siap cetak — buka di tab baru lalu Ctrl+P</p>
          </div>
          <Button variant="outline" onClick={() => window.open(`/api/admin/rapor/${id}/pdf`, "_blank")}>
            <Printer className="h-4 w-4 mr-1" /> Buka PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
