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
import {
  QURAN_TYPES, KITAB_TYPES, PERKEMBANGAN_STATUS, AKHLAK_ASPEK, AKHLAK_PREDIKAT,
  PEMBINAAN_TYPES, PEMBINAAN_CATEGORIES, PEMBINAAN_SEVERITY, PEMBINAAN_STATUS,
  PERIODE_OPTIONS, formatDate,
} from "@/lib/constants"
import {
  Heart, Plus, Pencil, Trash2, BookOpen, Library, Star, AlertTriangle, MessageSquare, Loader2,
} from "lucide-react"

export function PerkembanganView() {
  const [activeTab, setActiveTab] = useState("quran")

  return (
    <div>
      <PageHeader
        title="Perkembangan Santri"
        description="Tahsin, hafalan, akhlak, pembinaan — sesuai roadmap V4"
        icon={<Heart className="h-5 w-5" />}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 mb-4">
          <TabsTrigger value="quran"><BookOpen className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Al-Qur'an</span></TabsTrigger>
          <TabsTrigger value="kitab"><Library className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Kitab</span></TabsTrigger>
          <TabsTrigger value="akhlak"><Star className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Akhlak</span></TabsTrigger>
          <TabsTrigger value="pembinaan"><AlertTriangle className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Pembinaan</span></TabsTrigger>
          <TabsTrigger value="catatan-wali"><MessageSquare className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Catatan Wali</span></TabsTrigger>
        </TabsList>

        <TabsContent value="quran"><QuranTab /></TabsContent>
        <TabsContent value="kitab"><KitabTab /></TabsContent>
        <TabsContent value="akhlak"><AkhlakTab /></TabsContent>
        <TabsContent value="pembinaan"><PembinaanTab /></TabsContent>
        <TabsContent value="catatan-wali"><CatatanWaliTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Tab 1: Al-Qur'an (Tahsin, Tilawah, Hafalan)
// ============================================================================
function QuranTab() {
  const [data, setData] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (typeFilter) params.type = typeFilter
      const [res, santriRes] = await Promise.all([
        apiGet("/api/admin/perkembangan/quran", params),
        apiGet("/api/admin/santri"),
      ])
      const filtered = search
        ? res.data.filter((q: any) => q.santri?.name?.toLowerCase().includes(search.toLowerCase()) || q.surah?.toLowerCase().includes(search.toLowerCase()))
        : res.data
      setData(filtered)
      setSantriList(santriRes.data)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, toast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus data ini?")) return
    try {
      await apiDelete(`/api/admin/perkembangan/quran/${id}`)
      toast({ title: "Berhasil", description: "Data dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari santri/surah..."
          filters={
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {QURAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          }
          actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>}
        />
        {loading ? <LoadingState /> : (
          data.length === 0 ? <EmptyState icon={<BookOpen className="h-5 w-5" />} title="Belum ada data" /> :
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Santri</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Surah/Juz</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-sm font-medium">{q.santri?.name}</TableCell>
                    <TableCell><Badge variant="outline">{QURAN_TYPES.find(t => t.value === q.type)?.label || q.type}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {q.surah && <span>{q.surah}</span>}
                      {q.juz && <span className="text-muted-foreground"> Juz {q.juz}</span>}
                      {q.ayatFrom && <span className="text-xs"> :{q.ayatFrom}-{q.ayatTo || q.ayatFrom}</span>}
                    </TableCell>
                    <TableCell className="text-center font-bold">{q.score ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={PERKEMBANGAN_STATUS[q.status]?.variant || "outline"} className="text-xs">
                        {PERKEMBANGAN_STATUS[q.status]?.label || q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(q.pertemuanDate)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(q); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(q.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <QuranForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} santriList={santriList} />
      </CardContent>
    </Card>
  )
}

function QuranForm({ open, onOpenChange, editing, onSuccess, santriList }: any) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ type: "TAHSIN", status: "PROGRESS" })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.santriId || !form.type) {
      toast({ title: "Validasi", description: "Santri & Tipe wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/perkembangan/quran/${editing.id}`, form)
      } else {
        await apiPost("/api/admin/perkembangan/quran", form)
      }
      toast({ title: "Berhasil", description: "Data disimpan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Perkembangan Al-Qur'an</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Santri *</Label>
            <Select value={form.santriId} onValueChange={(v) => setForm({ ...form, santriId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Santri" /></SelectTrigger>
              <SelectContent>
                {santriList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QURAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Surah</Label>
            <Input value={form.surah || ""} onChange={(e) => setForm({ ...form, surah: e.target.value })} placeholder="Al-Falaq" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Juz</Label>
            <Input type="number" value={form.juz || ""} onChange={(e) => setForm({ ...form, juz: e.target.value ? Number(e.target.value) : null })} placeholder="30" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ayat Dari</Label>
            <Input type="number" value={form.ayatFrom || ""} onChange={(e) => setForm({ ...form, ayatFrom: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ayat Sampai</Label>
            <Input type="number" value={form.ayatTo || ""} onChange={(e) => setForm({ ...form, ayatTo: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nilai (0-100)</Label>
            <Input type="number" min={0} max={100} value={form.score ?? ""} onChange={(e) => setForm({ ...form, score: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PERKEMBANGAN_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Target</Label>
            <Input value={form.target || ""} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="Hafal 5 surat juz 30 per semester" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Catatan Guru</Label>
            <Textarea value={form.catatan || ""} onChange={(e) => setForm({ ...form, catatan: e.target.value })} rows={2} />
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

// ============================================================================
// Tab 2: Kitab (Hafalan, Kelancaran, Pemahaman)
// ============================================================================
function KitabTab() {
  const [data, setData] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (typeFilter) params.type = typeFilter
      const [res, santriRes] = await Promise.all([
        apiGet("/api/admin/perkembangan/kitab", params),
        apiGet("/api/admin/santri"),
      ])
      const filtered = search
        ? res.data.filter((k: any) => k.santri?.name?.toLowerCase().includes(search.toLowerCase()) || k.kitabName?.toLowerCase().includes(search.toLowerCase()))
        : res.data
      setData(filtered)
      setSantriList(santriRes.data)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, toast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus data ini?")) return
    try {
      await apiDelete(`/api/admin/perkembangan/kitab/${id}`)
      toast({ title: "Berhasil", description: "Data dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari santri/kitab..."
          filters={
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {KITAB_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          }
          actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>}
        />
        {loading ? <LoadingState /> : (
          data.length === 0 ? <EmptyState icon={<Library className="h-5 w-5" />} title="Belum ada data" /> :
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Santri</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kitab</TableHead>
                  <TableHead>Halaman/Bab</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="text-sm font-medium">{k.santri?.name}</TableCell>
                    <TableCell><Badge variant="outline">{KITAB_TYPES.find(t => t.value === k.type)?.label || k.type}</Badge></TableCell>
                    <TableCell className="text-sm">{k.kitabName}</TableCell>
                    <TableCell className="text-xs">{k.halaman || "-"}</TableCell>
                    <TableCell className="text-center font-bold">{k.score ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={PERKEMBANGAN_STATUS[k.status]?.variant || "outline"} className="text-xs">
                        {PERKEMBANGAN_STATUS[k.status]?.label || k.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(k.pertemuanDate)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(k); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(k.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <KitabForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} santriList={santriList} />
      </CardContent>
    </Card>
  )
}

function KitabForm({ open, onOpenChange, editing, onSuccess, santriList }: any) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ type: "HAFALAN", status: "PROGRESS" })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.santriId || !form.type || !form.kitabName) {
      toast({ title: "Validasi", description: "Santri, Tipe, dan Nama Kitab wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/perkembangan/kitab/${editing.id}`, form)
      } else {
        await apiPost("/api/admin/perkembangan/kitab", form)
      }
      toast({ title: "Berhasil", description: "Data disimpan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Perkembangan Kitab</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Santri *</Label>
            <Select value={form.santriId} onValueChange={(v) => setForm({ ...form, santriId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Santri" /></SelectTrigger>
              <SelectContent>
                {santriList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KITAB_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Nama Kitab *</Label>
            <Input value={form.kitabName || ""} onChange={(e) => setForm({ ...form, kitabName: e.target.value })} placeholder="Matan Jurumiyyah" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Halaman/Bab</Label>
            <Input value={form.halaman || ""} onChange={(e) => setForm({ ...form, halaman: e.target.value })} placeholder="Hal. 5-10 / Bab 1" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nilai (0-100)</Label>
            <Input type="number" min={0} max={100} value={form.score ?? ""} onChange={(e) => setForm({ ...form, score: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PERKEMBANGAN_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target</Label>
            <Input value={form.target || ""} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="Hafal bab 1-5" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Catatan Guru</Label>
            <Textarea value={form.catatan || ""} onChange={(e) => setForm({ ...form, catatan: e.target.value })} rows={2} />
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

// ============================================================================
// Tab 3: Akhlak (6 aspek penilaian)
// ============================================================================
function AkhlakTab() {
  const [data, setData] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [res, santriRes] = await Promise.all([
        apiGet("/api/admin/perkembangan/akhlak"),
        apiGet("/api/admin/santri"),
      ])
      const filtered = search
        ? res.data.filter((a: any) => a.santri?.name?.toLowerCase().includes(search.toLowerCase()))
        : res.data
      setData(filtered)
      setSantriList(santriRes.data)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus penilaian ini?")) return
    try {
      await apiDelete(`/api/admin/perkembangan/akhlak/${id}`)
      toast({ title: "Berhasil", description: "Penilaian dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari santri..."
          actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Penilaian</Button>}
        />
        {loading ? <LoadingState /> : (
          data.length === 0 ? <EmptyState icon={<Star className="h-5 w-5" />} title="Belum ada penilaian akhlak" /> :
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Santri</TableHead>
                  <TableHead className="text-center">Adab Guru</TableHead>
                  <TableHead className="text-center">Adab OT</TableHead>
                  <TableHead className="text-center">Adab Teman</TableHead>
                  <TableHead className="text-center">Disiplin</TableHead>
                  <TableHead className="text-center">Bersih</TableHead>
                  <TableHead className="text-center">T. Jawab</TableHead>
                  <TableHead className="text-center">Rata²</TableHead>
                  <TableHead>Predikat</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-medium">{a.santri?.name}</TableCell>
                    <TableCell className="text-center text-xs">{a.adabGuru}</TableCell>
                    <TableCell className="text-center text-xs">{a.adabOrangTua}</TableCell>
                    <TableCell className="text-center text-xs">{a.adabTeman}</TableCell>
                    <TableCell className="text-center text-xs">{a.kedisiplinan}</TableCell>
                    <TableCell className="text-center text-xs">{a.kebersihan}</TableCell>
                    <TableCell className="text-center text-xs">{a.tanggungJawab}</TableCell>
                    <TableCell className="text-center font-bold">{a.rataRata}</TableCell>
                    <TableCell>
                      <Badge variant={AKHLAK_PREDIKAT[a.predikat]?.variant || "outline"} className="text-xs">
                        {AKHLAK_PREDIKAT[a.predikat]?.label || a.predikat}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.periode}<br/>{formatDate(a.periodeDate)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(a); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <AkhlakForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} santriList={santriList} />
      </CardContent>
    </Card>
  )
}

function AkhlakForm({ open, onOpenChange, editing, onSuccess, santriList }: any) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) {
      setForm({ ...editing })
    } else {
      setForm({
        santriId: "", adabGuru: 0, adabOrangTua: 0, adabTeman: 0,
        kedisiplinan: 0, kebersihan: 0, tanggungJawab: 0,
        periode: "BULANAN",
      })
    }
  }, [editing, open])

  const handleSave = async () => {
    if (!form.santriId) {
      toast({ title: "Validasi", description: "Santri wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/perkembangan/akhlak/${editing.id}`, form)
      } else {
        await apiPost("/api/admin/perkembangan/akhlak", form)
      }
      toast({ title: "Berhasil", description: "Penilaian akhlak disimpan" })
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const scores = [
    Number(form.adabGuru) || 0,
    Number(form.adabOrangTua) || 0,
    Number(form.adabTeman) || 0,
    Number(form.kedisiplinan) || 0,
    Number(form.kebersihan) || 0,
    Number(form.tanggungJawab) || 0,
  ]
  const rataRata = Math.round((scores.reduce((a, b) => a + b, 0) / 6) * 10) / 10

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Penilaian Akhlak</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Santri *</Label>
            <Select value={form.santriId} onValueChange={(v) => setForm({ ...form, santriId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Santri" /></SelectTrigger>
              <SelectContent>
                {santriList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {AKHLAK_ASPEK.map((asp) => (
            <div key={asp.value} className="space-y-1">
              <Label className="text-xs">{asp.label} (0-100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form[asp.value] ?? 0}
                onChange={(e) => setForm({ ...form, [asp.value]: Number(e.target.value) })}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs">Periode</Label>
            <Select value={form.periode} onValueChange={(v) => setForm({ ...form, periode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODE_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rata-rata (auto)</Label>
            <div className="flex items-center gap-2 h-9 px-3 bg-muted rounded-md">
              <span className="font-bold text-base">{rataRata}</span>
              <Badge variant={AKHLAK_PREDIKAT[
                rataRata >= 90 ? "SANGAT_BAIK" : rataRata >= 75 ? "BAIK" : rataRata >= 60 ? "CUKUP" : "KURANG"
              ]?.variant || "outline"} className="text-xs">
                {AKHLAK_PREDIKAT[
                  rataRata >= 90 ? "SANGAT_BAIK" : rataRata >= 75 ? "BAIK" : rataRata >= 60 ? "CUKUP" : "KURANG"
                ]?.label}
              </Badge>
            </div>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Catatan</Label>
            <Textarea value={form.catatan || ""} onChange={(e) => setForm({ ...form, catatan: e.target.value })} rows={2} placeholder="Catatan khusus tentang akhlak santri..." />
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

// ============================================================================
// Tab 4: Pembinaan (Pelanggaran, Tindakan, Catatan)
// ============================================================================
function PembinaanTab() {
  const [data, setData] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (typeFilter) params.type = typeFilter
      if (statusFilter) params.status = statusFilter
      const [res, santriRes] = await Promise.all([
        apiGet("/api/admin/perkembangan/pembinaan", params),
        apiGet("/api/admin/santri"),
      ])
      const filtered = search
        ? res.data.filter((p: any) => p.santri?.name?.toLowerCase().includes(search.toLowerCase()) || p.title?.toLowerCase().includes(search.toLowerCase()))
        : res.data
      setData(filtered)
      setSantriList(santriRes.data)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter, toast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus data ini?")) return
    try {
      await apiDelete(`/api/admin/perkembangan/pembinaan/${id}`)
      toast({ title: "Berhasil", description: "Data dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari santri/judul..."
          filters={
            <>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  {PEMBINAAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(PEMBINAAN_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          }
          actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>}
        />
        {loading ? <LoadingState /> : (
          data.length === 0 ? <EmptyState icon={<AlertTriangle className="h-5 w-5" />} title="Belum ada data pembinaan" /> :
          <div className="space-y-2">
            {data.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm">{p.title}</p>
                        <Badge variant="outline" className="text-[10px]">{PEMBINAAN_TYPES.find(t => t.value === p.type)?.label || p.type}</Badge>
                        {p.category && <Badge variant="secondary" className="text-[10px]">{PEMBINAAN_CATEGORIES.find(c => c.value === p.category)?.label || p.category}</Badge>}
                        <Badge variant={PEMBINAAN_SEVERITY[p.severity]?.variant || "outline"} className="text-[10px]">
                          {PEMBINAAN_SEVERITY[p.severity]?.label || p.severity}
                        </Badge>
                        <Badge variant={PEMBINAAN_STATUS[p.status]?.variant || "outline"} className="text-[10px]">
                          {PEMBINAAN_STATUS[p.status]?.label || p.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.santri?.name} • {formatDate(p.createdAt, true)}</p>
                      <p className="text-sm mt-1">{p.description}</p>
                      {p.tindakan && <p className="text-xs mt-1 italic text-primary">Tindakan: {p.tindakan}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(p); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <PembinaanForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} santriList={santriList} />
      </CardContent>
    </Card>
  )
}

function PembinaanForm({ open, onOpenChange, editing, onSuccess, santriList }: any) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ type: "PELANGGARAN", severity: "RINGAN", status: "OPEN" })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.santriId || !form.type || !form.title || !form.description) {
      toast({ title: "Validasi", description: "Santri, Tipe, Judul, dan Deskripsi wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/perkembangan/pembinaan/${editing.id}`, form)
      } else {
        await apiPost("/api/admin/perkembangan/pembinaan", form)
      }
      toast({ title: "Berhasil", description: "Data disimpan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Pembinaan</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Santri *</Label>
            <Select value={form.santriId} onValueChange={(v) => setForm({ ...form, santriId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Santri" /></SelectTrigger>
              <SelectContent>
                {santriList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PEMBINAAN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kategori</Label>
            <Select value={form.category || "none"} onValueChange={(v) => setForm({ ...form, category: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {PEMBINAAN_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Judul *</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Terlambat masuk kelas" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Deskripsi *</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Detail kejadian..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tingkat Keparahan</Label>
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PEMBINAAN_SEVERITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PEMBINAAN_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Tindakan yang Diambil</Label>
            <Input value={form.tindakan || ""} onChange={(e) => setForm({ ...form, tindakan: e.target.value })} placeholder="Diberi teguran lisan + surat pemanggilan wali" />
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

// ============================================================================
// Tab 5: Catatan Wali Kelas (periodik)
// ============================================================================
function CatatanWaliTab() {
  const [data, setData] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [res, santriRes] = await Promise.all([
        apiGet("/api/admin/perkembangan/catatan-wali"),
        apiGet("/api/admin/santri"),
      ])
      const filtered = search
        ? res.data.filter((c: any) => c.santri?.name?.toLowerCase().includes(search.toLowerCase()))
        : res.data
      setData(filtered)
      setSantriList(santriRes.data)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus catatan ini?")) return
    try {
      await apiDelete(`/api/admin/perkembangan/catatan-wali/${id}`)
      toast({ title: "Berhasil", description: "Catatan dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari santri..."
          actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Catatan</Button>}
        />
        {loading ? <LoadingState /> : (
          data.length === 0 ? <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="Belum ada catatan wali kelas" /> :
          <div className="space-y-2">
            {data.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-sm">{c.santri?.name}</p>
                        <Badge variant="outline" className="text-[10px]">{PERIODE_OPTIONS.find(p => p.value === c.periode)?.label || c.periode}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(c.periodeDate, true)}</span>
                      </div>
                      <p className="text-sm mt-1">{c.catatan}</p>
                      {c.rekomendasi && <p className="text-xs mt-1 italic text-primary">Rekomendasi: {c.rekomendasi}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(c); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <CatatanWaliForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} santriList={santriList} />
      </CardContent>
    </Card>
  )
}

function CatatanWaliForm({ open, onOpenChange, editing, onSuccess, santriList }: any) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ periode: "BULANAN" })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.santriId || !form.catatan || !form.periode) {
      toast({ title: "Validasi", description: "Santri, Catatan, dan Periode wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/perkembangan/catatan-wali/${editing.id}`, form)
      } else {
        await apiPost("/api/admin/perkembangan/catatan-wali", form)
      }
      toast({ title: "Berhasil", description: "Catatan disimpan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Catatan Wali Kelas</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Santri *</Label>
            <Select value={form.santriId} onValueChange={(v) => setForm({ ...form, santriId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Santri" /></SelectTrigger>
              <SelectContent>
                {santriList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Periode *</Label>
            <Select value={form.periode} onValueChange={(v) => setForm({ ...form, periode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODE_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Periode</Label>
            <Input type="date" value={form.periodeDate ? new Date(form.periodeDate).toISOString().slice(0, 10) : ""} onChange={(e) => setForm({ ...form, periodeDate: e.target.value })} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Catatan *</Label>
            <Textarea value={form.catatan || ""} onChange={(e) => setForm({ ...form, catatan: e.target.value })} rows={4} placeholder="Catatan perkembangan santri periode ini..." />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Rekomendasi untuk Wali Santri</Label>
            <Textarea value={form.rekomendasi || ""} onChange={(e) => setForm({ ...form, rekomendasi: e.target.value })} rows={2} placeholder="Saran untuk orang tua/wali santri..." />
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
