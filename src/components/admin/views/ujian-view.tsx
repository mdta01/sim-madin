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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { UJIAN_TYPES, formatDate } from "@/lib/constants"
import { FileQuestion, Plus, Pencil, Trash2, Eye, Save, Library, Users, Award, Trophy, Loader2, ExternalLink, Printer } from "lucide-react"

export function UjianView() {
  const [data, setData] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [mapelFilter, setMapelFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailUjian, setDetailUjian] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (search) params.search = search
      if (mapelFilter) params.mapelId = mapelFilter
      if (statusFilter) params.status = statusFilter
      const [res, mapelRes, kelasRes, guruRes] = await Promise.all([
        apiGet("/api/admin/ujian", params),
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
  }, [search, mapelFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Yakin ingin menghapus ujian "${title}"?`)) return
    try {
      await apiDelete(`/api/admin/ujian/${id}`)
      toast({ title: "Berhasil", description: "Ujian dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Ujian"
        description="Jadwal ujian UTS/UAS/Quiz + peserta + nilai + leger"
        icon={<FileQuestion className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Ujian</Button>}
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari judul ujian..."
        filters={
          <>
            <Select value={mapelFilter} onValueChange={(v) => setMapelFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="upcoming">Akan Datang</SelectItem>
                <SelectItem value="ongoing">Sedang Berlangsung</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<FileQuestion className="h-5 w-5" />} title="Belum ada ujian" description="Buat ujian pertama untuk kelas & mapel." /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Judul Ujian</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Peserta/Nilai</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{u.title}</p>
                        {u.description && <p className="text-xs text-muted-foreground truncate max-w-[250px]">{u.description}</p>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{UJIAN_TYPES.find(t => t.value === u.type)?.label || u.type}</Badge></TableCell>
                      <TableCell className="text-sm">{u.mapel?.name}</TableCell>
                      <TableCell className="text-sm">{u.kelas?.name}</TableCell>
                      <TableCell className="text-xs">
                        <div>{formatDate(u.startTime, true)}</div>
                        <div className="text-muted-foreground">{u.durationMnt} mnt</div>
                      </TableCell>
                      <TableCell>
                        {u.status === "UPCOMING" ? <Badge variant="warning">Akan Datang</Badge> :
                         u.status === "ONGOING" ? <Badge variant="success">Berlangsung</Badge> :
                         <Badge variant="secondary">Selesai</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="text-[10px]">{u._count?.peserta || 0} peserta</Badge>
                          <Badge variant="outline" className="text-[10px]">{u._count?.nilai || 0} dinilai</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Detail & kelola" onClick={() => { setDetailUjian(u); setDetailOpen(true) }}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(u); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(u.id, u.title)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <UjianForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={load}
        mapelList={mapelList}
        kelasList={kelasList}
        guruList={guruList}
      />

      <UjianDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        ujian={detailUjian}
        onSuccess={load}
      />
    </div>
  )
}

function UjianForm({ open, onOpenChange, editing, onSuccess, mapelList, kelasList, guruList }: any) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        startTime: editing.startTime ? new Date(editing.startTime).toISOString().slice(0, 16) : "",
        endTime: editing.endTime ? new Date(editing.endTime).toISOString().slice(0, 16) : "",
      })
    } else {
      const now = new Date()
      const later = new Date(now.getTime() + 2 * 3600000)
      setForm({
        type: "UTS",
        durationMnt: 90,
        maxScore: 100,
        isPublished: false,
        isOnline: false,
        startTime: now.toISOString().slice(0, 16),
        endTime: later.toISOString().slice(0, 16),
      })
    }
  }, [editing, open])

  const handleSave = async () => {
    if (!form.title || !form.type || !form.mapelId || !form.kelasId || !form.startTime || !form.endTime) {
      toast({ title: "Validasi gagal", description: "Semua field wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/ujian/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Ujian diperbarui" })
      } else {
        await apiPost("/api/admin/ujian", form)
        toast({ title: "Berhasil", description: "Ujian baru dibuat" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit Ujian" : "Tambah Ujian"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Judul Ujian *</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="UTS Ganjil 2025/2026 - Fiqih Kelas 5" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe Ujian *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UJIAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Durasi (menit)</Label>
            <Input type="number" value={form.durationMnt || 90} onChange={(e) => setForm({ ...form, durationMnt: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mapel *</Label>
            <Select value={form.mapelId} onValueChange={(v) => setForm({ ...form, mapelId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
              <SelectContent>
                {mapelList.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kelas *</Label>
            <Select value={form.kelasId} onValueChange={(v) => setForm({ ...form, kelasId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map((k: any) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Waktu Mulai *</Label>
            <Input type="datetime-local" value={form.startTime || ""} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Waktu Selesai *</Label>
            <Input type="datetime-local" value={form.endTime || ""} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Skor Maksimal</Label>
            <Input type="number" value={form.maxScore || 100} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Passing Score (KKM)</Label>
            <Input type="number" value={form.passingScore ?? ""} onChange={(e) => setForm({ ...form, passingScore: e.target.value ? Number(e.target.value) : null })} placeholder="Default: KKM mapel" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Guru Pengampu</Label>
            <Select value={form.guruId || "none"} onValueChange={(v) => setForm({ ...form, guruId: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {guruList.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ruang Ujian</Label>
            <Input value={form.ruang || ""} onChange={(e) => setForm({ ...form, ruang: e.target.value })} placeholder="Aula Utama" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Pengawas</Label>
            <Input value={form.pengawas || ""} onChange={(e) => setForm({ ...form, pengawas: e.target.value })} placeholder="Ust. Ahmad, Ust. Salim" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Materi ujian, aturan, dll" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} id="ujian-publish" />
            <Label htmlFor="ujian-publish" className="text-sm cursor-pointer">Publikasikan ke wali/santri</Label>
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

function UjianDetailDialog({ open, onOpenChange, ujian, onSuccess }: any) {
  const [activeTab, setActiveTab] = useState("soal")

  if (!ujian) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ujian.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {UJIAN_TYPES.find(t => t.value === ujian.type)?.label} • {ujian.mapel?.name} • {ujian.kelas?.name}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="soal"><Library className="h-4 w-4 mr-1" /> Soal</TabsTrigger>
            <TabsTrigger value="peserta"><Users className="h-4 w-4 mr-1" /> Peserta</TabsTrigger>
            <TabsTrigger value="nilai"><Award className="h-4 w-4 mr-1" /> Nilai</TabsTrigger>
            <TabsTrigger value="leger"><Trophy className="h-4 w-4 mr-1" /> Leger</TabsTrigger>
          </TabsList>

          <TabsContent value="soal" className="mt-3">
            <UjianSoalTab ujianId={ujian.id} />
          </TabsContent>

          <TabsContent value="peserta" className="mt-3">
            <UjianPesertaTab ujianId={ujian.id} />
          </TabsContent>

          <TabsContent value="nilai" className="mt-3">
            <UjianNilaiTab ujianId={ujian.id} maxScore={ujian.maxScore} onSuccess={onSuccess} />
          </TabsContent>

          <TabsContent value="leger" className="mt-3">
            <UjianLegerTab ujianId={ujian.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function UjianSoalTab({ ujianId }: { ujianId: string }) {
  const [soalLinks, setSoalLinks] = useState<any[]>([])
  const [bankSoalList, setBankSoalList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedSoal, setSelectedSoal] = useState<string[]>([])
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [linksRes, bankRes] = await Promise.all([
        apiGet(`/api/admin/ujian/${ujianId}/soal`),
        apiGet("/api/admin/bank-soal"),
      ])
      setSoalLinks(linksRes.data)
      setBankSoalList(bankRes.data)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [ujianId, toast])

  useEffect(() => { load() }, [load])

  const handleAssign = async () => {
    if (selectedSoal.length === 0) {
      toast({ title: "Validasi", description: "Pilih minimal 1 soal" })
      return
    }
    try {
      const res = await apiPost(`/api/admin/ujian/${ujianId}/soal`, { soalIds: selectedSoal })
      toast({ title: "Berhasil", description: `${res.count} soal ditambahkan` })
      setAssignOpen(false)
      setSelectedSoal([])
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleRemove = async (linkId: string) => {
    if (!confirm("Hapus soal ini dari ujian?")) return
    try {
      await apiDelete(`/api/admin/ujian/${ujianId}/soal?linkId=${linkId}`)
      toast({ title: "Berhasil", description: "Soal dihapus dari ujian" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  if (loading) return <LoadingState />

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{soalLinks.length} soal di ujian ini</p>
        <Button size="sm" onClick={() => setAssignOpen(true)}><Plus className="h-4 w-4 mr-1" /> Tambah Soal</Button>
      </div>
      {soalLinks.length === 0 ? (
        <EmptyState icon={<Library className="h-5 w-5" />} title="Belum ada soal" description="Tambahkan soal dari Bank Soal" />
      ) : (
        <div className="space-y-2">
          {soalLinks.map((link) => (
            <Card key={link.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <Badge variant="secondary" className="text-xs">#{link.urutan}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-mono">{link.bankSoal.code}</Badge>
                    <Badge variant="outline" className="text-[10px]">{link.bankSoal.type}</Badge>
                    {link.bankSoal.difficulty && (
                      <Badge variant={link.bankSoal.difficulty === "MUDAH" ? "success" : link.bankSoal.difficulty === "SULIT" ? "destructive" : "warning"} className="text-[10px]">
                        {link.bankSoal.difficulty}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{link.bankSoal.question}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(link.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pilih Soal dari Bank Soal</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {bankSoalList.filter(s => !soalLinks.some(l => l.bankSoalId === s.id)).map((s) => (
              <label key={s.id} className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-accent/30">
                <input
                  type="checkbox"
                  checked={selectedSoal.includes(s.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedSoal([...selectedSoal, s.id])
                    else setSelectedSoal(selectedSoal.filter(id => id !== s.id))
                  }}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{s.code}</span>
                    <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
                  </div>
                  <p className="text-sm truncate">{s.question}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Batal</Button>
            <Button onClick={handleAssign} disabled={selectedSoal.length === 0}>
              Tambah {selectedSoal.length > 0 ? `(${selectedSoal.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UjianPesertaTab({ ujianId }: { ujianId: string }) {
  const [peserta, setPeserta] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet(`/api/admin/ujian/${ujianId}/peserta`)
      setPeserta(res.data)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [ujianId, toast])

  useEffect(() => { load() }, [load])

  const handleAssignAll = async () => {
    try {
      const res = await apiPost(`/api/admin/ujian/${ujianId}/peserta`, { all: true, isHadir: true })
      toast({ title: "Berhasil", description: `${res.count} peserta ditambahkan` })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleToggleHadir = async (santriId: string, isHadir: boolean) => {
    try {
      await apiPost(`/api/admin/ujian/${ujianId}/peserta`, { santriId, isHadir: !isHadir })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  if (loading) return <LoadingState />

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{peserta.filter(p => p.isAssigned !== false).length} peserta terdaftar</p>
        <Button size="sm" onClick={handleAssignAll}><Users className="h-4 w-4 mr-1" /> Tambah Semua Santri Kelas</Button>
      </div>
      {peserta.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title="Belum ada peserta" />
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {peserta.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {p.santri?.name?.[0] || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">{p.santri?.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{p.santri?.nis}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.isHadir === null || p.isHadir === undefined ? (
                  <Badge variant="outline" className="text-[10px]">Belum di-set</Badge>
                ) : p.isHadir ? (
                  <Badge variant="success" className="text-[10px]">Hadir</Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">Absen</Badge>
                )}
                {p.isAssigned !== false && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleToggleHadir(p.santriId, p.isHadir)}>
                    Toggle
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UjianNilaiTab({ ujianId, maxScore, onSuccess }: any) {
  const [nilaiData, setNilaiData] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet(`/api/admin/ujian/${ujianId}/nilai`)
      setNilaiData(res.data)
      setStats(res.stats)
      const init: Record<string, string> = {}
      res.data.forEach((p: any) => {
        if (p.nilai) init[p.santriId] = String(p.nilai.score)
      })
      setEntries(init)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [ujianId, toast])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    const payload = Object.entries(entries)
      .filter(([, v]) => v !== "" && v !== null)
      .map(([santriId, v]) => ({ santriId, score: Number(v) }))
    if (payload.length === 0) {
      toast({ title: "Info", description: "Tidak ada nilai untuk disimpan" })
      return
    }
    setSaving(true)
    try {
      const res = await apiPost(`/api/admin/ujian/${ujianId}/nilai`, { entries: payload })
      toast({ title: "Berhasil", description: `${res.count} nilai tersimpan` })
      load()
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-lg font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Dinilai</p><p className="text-lg font-bold text-green-600">{stats.graded}</p></CardContent></Card>
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Rata-rata</p><p className="text-lg font-bold text-blue-600">{stats.avgScore}</p></CardContent></Card>
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Lulus</p><p className="text-lg font-bold text-green-600">{stats.lulus}</p></CardContent></Card>
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Tidak Lulus</p><p className="text-lg font-bold text-red-600">{stats.tidakLulus}</p></CardContent></Card>
        </div>
      )}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto mb-3">
        {nilaiData.map((p) => (
          <div key={p.id} className="flex items-center gap-2 p-2 border rounded">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {p.santri?.name?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.santri?.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{p.santri?.nis}</p>
            </div>
            <Input
              type="number"
              min={0}
              max={maxScore}
              value={entries[p.santriId] || ""}
              onChange={(e) => setEntries({ ...entries, [p.santriId]: e.target.value })}
              placeholder="-"
              className="w-20 h-8"
            />
            <span className="text-xs text-muted-foreground shrink-0">/ {maxScore}</span>
            {p.isGraded && <Badge variant="success" className="text-[10px]">Sudah dinilai</Badge>}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Menyimpan..." : `Simpan ${Object.values(entries).filter(v => v).length} Nilai`}
        </Button>
      </div>
    </div>
  )
}

function UjianLegerTab({ ujianId }: { ujianId: string }) {
  const [leger, setLeger] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [ujianInfo, setUjianInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGet(`/api/admin/ujian/${ujianId}/leger`)
      setLeger(res.data)
      setStats(res.stats)
      setUjianInfo(res.ujian)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [ujianId, toast])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingState />

  return (
    <div>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Total Peserta</p><p className="text-lg font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Rata-rata</p><p className="text-lg font-bold text-blue-600">{stats.avgScore}</p></CardContent></Card>
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Tertinggi</p><p className="text-lg font-bold text-green-600">{stats.maxScore}</p></CardContent></Card>
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">Terendah</p><p className="text-lg font-bold text-orange-600">{stats.minScore}</p></CardContent></Card>
          <Card><CardContent className="p-2"><p className="text-[10px] text-muted-foreground">% Lulus</p><p className="text-lg font-bold text-green-600">{stats.persentaseLulus}%</p></CardContent></Card>
        </div>
      )}
      {leger.length === 0 ? (
        <EmptyState icon={<Trophy className="h-5 w-5" />} title="Belum ada nilai" description="Input nilai di tab Nilai terlebih dahulu" />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Rank</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-center">NIS</TableHead>
                <TableHead className="text-center">Nilai</TableHead>
                <TableHead className="text-center">Predikat</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leger.map((l) => (
                <TableRow key={l.santriId}>
                  <TableCell className="text-center">
                    <Badge variant={l.rank === 1 ? "default" : l.rank <= 3 ? "secondary" : "outline"}>
                      #{l.rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{l.santriName}</TableCell>
                  <TableCell className="text-center text-xs font-mono">{l.nis}</TableCell>
                  <TableCell className="text-center font-bold text-lg">{l.score}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={l.score >= 90 ? "success" : l.score >= 70 ? "secondary" : "destructive"}>
                      {l.score >= 90 ? "A" : l.score >= 80 ? "B" : l.score >= 70 ? "C" : l.score >= 60 ? "D" : "E"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={l.isLulus ? "success" : "destructive"} className="text-xs">
                      {l.isLulus ? "Lulus" : "Remedial"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
