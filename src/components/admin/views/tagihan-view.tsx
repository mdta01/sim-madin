"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiDelete, apiPut } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
import { Breadcrumb } from "@/components/admin/shared/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatRupiah, formatDate, JENIS_TAGIHAN_CATEGORY } from "@/lib/constants"
import { Receipt, Plus, Trash2, ArrowLeft, Wand2, Tag, Download } from "lucide-react"

export function TagihanView() {
  const [tab, setTab] = useState("tagihan")
  if (tab === "jenis") return <JenisTagihanTab onBack={() => setTab("tagihan")} />
  return <TagihanTab onGoJenis={() => setTab("jenis")} />
}

function TagihanTab({ onGoJenis }: { onGoJenis: () => void }) {
  const [tagihan, setTagihan] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [jenisList, setJenisList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [kelasFilter, setKelasFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (kelasFilter) params.kelasId = kelasFilter
      if (statusFilter) params.status = statusFilter
      const [tRes, kRes, jRes] = await Promise.all([
        apiGet("/api/admin/tagihan", params),
        apiGet("/api/admin/kelas"),
        apiGet("/api/admin/jenis-tagihan"),
      ])
      setTagihan(tRes.data)
      setKelasList(kRes.data)
      setJenisList(jRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [kelasFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const filteredData = tagihan.filter(t => {
    if (search && !t.santri?.name?.toLowerCase().includes(search.toLowerCase()) && !t.santri?.nis?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus tagihan ini?")) return
    try {
      await apiDelete(`/api/admin/tagihan/${id}`)
      toast({ title: "Berhasil", description: "Tagihan dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  // Summary
  const summary = {
    total: tagihan.length,
    lunas: tagihan.filter(t => t.status === "LUNAS").length,
    cicil: tagihan.filter(t => t.status === "CICIL").length,
    belum: tagihan.filter(t => t.status === "BELUM_BAYAR").length,
    totalOutstanding: tagihan.reduce((sum, t) => sum + (t.amount - t.paidAmount), 0),
  }

  return (
    <div>
      <PageHeader
        title="Data Tagihan"
        description="Kelola tagihan santri (Syahriyah, Ujian, dll)"
        icon={<Receipt className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={onGoJenis}><Tag className="h-4 w-4 mr-1" /> Jenis Tagihan</Button>
            <Button variant="secondary" onClick={() => setBulkOpen(true)}><Wand2 className="h-4 w-4 mr-1" /> Generate Massal</Button>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Tagihan</p><p className="text-lg font-bold">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Lunas</p><p className="text-lg font-bold text-emerald-600">{summary.lunas}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Tunggakan</p><p className="text-lg font-bold text-red-600">{summary.cicil + summary.belum}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-sm font-bold text-red-600">{formatRupiah(summary.totalOutstanding)}</p></CardContent></Card>
      </div>

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama atau NIS santri..."
        filters={
          <>
            <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="LUNAS">Lunas</SelectItem>
                <SelectItem value="CICIL">Cicil</SelectItem>
                <SelectItem value="BELUM_BAYAR">Belum Bayar</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            filteredData.length === 0 ? <EmptyState icon={<Receipt className="h-5 w-5" />} title="Belum ada tagihan" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Santri</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="text-right">Terbayar</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{t.santri?.name}</p>
                        <p className="text-[11px] text-muted-foreground">{t.santri?.nis} • {t.kelas?.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.jenisTagihan?.name}</Badge>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatRupiah(t.amount)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">{formatRupiah(t.paidAmount)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-600">{formatRupiah(t.amount - t.paidAmount)}</TableCell>
                      <TableCell className="text-xs">{t.dueDate ? formatDate(t.dueDate) : "-"}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      <TagihanForm open={dialogOpen} onOpenChange={setDialogOpen} jenisList={jenisList} onSuccess={load} />
      <BulkGenerateDialog open={bulkOpen} onOpenChange={setBulkOpen} kelasList={kelasList} jenisList={jenisList} onSuccess={load} />
    </div>
  )
}

function TagihanForm({ open, onOpenChange, jenisList, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; jenisList: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ status: "BELUM_BAYAR" })
  const [santriList, setSantriList] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      apiGet("/api/admin/santri", { status: "AKTIF" }).then((r) => setSantriList(r.data)).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (open && jenisList.length > 0 && !form.jenisTagihanId) {
      setForm({ ...form, jenisTagihanId: jenisList[0].id, amount: jenisList[0].defaultAmount })
    }
  }, [jenisList, open])

  const handleSave = async () => {
    if (!form.santriId || !form.jenisTagihanId || !form.amount) {
      toast({ title: "Validasi gagal", description: "Santri, Jenis, dan Nominal wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const santri = santriList.find(s => s.id === form.santriId)
      await apiPost("/api/admin/tagihan", { ...form, kelasId: santri?.kelasId })
      toast({ title: "Berhasil", description: "Tagihan dibuat" })
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
        <DialogHeader><DialogTitle>Tambah Tagihan</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Santri *</Label>
            <Select value={form.santriId} onValueChange={(v) => setForm({ ...form, santriId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Santri" /></SelectTrigger>
              <SelectContent>
                {santriList.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} - {s.nis}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jenis Tagihan *</Label>
            <Select value={form.jenisTagihanId} onValueChange={(v) => {
              const j = jenisList.find(x => x.id === v)
              setForm({ ...form, jenisTagihanId: v, amount: j?.defaultAmount || form.amount })
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {jenisList.map((j) => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nominal *</Label>
            <Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi</Label>
            <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Syahriyah Januari 2025" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jatuh Tempo</Label>
            <Input type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
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

function BulkGenerateDialog({ open, onOpenChange, kelasList, jenisList, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; kelasList: any[]; jenisList: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ bulk: true })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && jenisList.length > 0 && !form.jenisTagihanId) {
      setForm({ ...form, jenisTagihanId: jenisList[0].id, amount: jenisList[0].defaultAmount })
    }
  }, [jenisList, open])

  const handleSave = async () => {
    if (!form.kelasId || !form.jenisTagihanId || !form.amount) {
      toast({ title: "Validasi gagal", description: "Kelas, Jenis, dan Nominal wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await apiPost("/api/admin/tagihan", form)
      toast({ title: "Berhasil", description: `${res.count} tagihan dibuat` })
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
        <DialogHeader><DialogTitle>Generate Tagihan Massal</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Buat tagihan otomatis untuk semua santri di sebuah kelas.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Kelas *</Label>
            <Select value={form.kelasId} onValueChange={(v) => setForm({ ...form, kelasId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jenis Tagihan *</Label>
            <Select value={form.jenisTagihanId} onValueChange={(v) => {
              const j = jenisList.find(x => x.id === v)
              setForm({ ...form, jenisTagihanId: v, amount: j?.defaultAmount || form.amount })
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {jenisList.map((j) => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nominal *</Label>
            <Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi</Label>
            <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jatuh Tempo</Label>
            <Input type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}><Wand2 className="h-4 w-4 mr-1" /> {saving ? "Generating..." : "Generate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function JenisTagihanTab({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try { setLoading(true); const res = await apiGet("/api/admin/jenis-tagihan"); setData(res.data) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus jenis tagihan ini?")) return
    try { await apiDelete(`/api/admin/jenis-tagihan/${id}`); toast({ title: "Berhasil", description: "Jenis dihapus" }); load() }
    catch (e: any) { toast({ title: "Gagal", description: e.message, variant: "destructive" }) }
  }

  return (
    <div>
      <PageHeader
        title="Jenis Tagihan"
        description="Master jenis tagihan (Syahriyah, Ujian, dll)"
        icon={<Tag className="h-5 w-5" />}
        actions={<>
          <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
        </>}
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            data.length === 0 ? <EmptyState icon={<Tag className="h-5 w-5" />} title="Belum ada jenis tagihan" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead className="min-w-[200px]">Nama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Nominal Default</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono text-xs">{j.code}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{j.name}</p>
                        {j.description && <p className="text-[11px] text-muted-foreground">{j.description}</p>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{JENIS_TAGIHAN_CATEGORY.find(c => c.value === j.category)?.label || j.category}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatRupiah(j.defaultAmount)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(j); setDialogOpen(true) }}>Edit</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(j.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      <JenisTagihanForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} />
    </div>
  )
}

function JenisTagihanForm({ open, onOpenChange, editing, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ category: "RUTIN", isActive: true })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ category: "RUTIN", isActive: true })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.code || !form.name || !form.defaultAmount) {
      toast({ title: "Validasi gagal", description: "Kode, Nama, dan Nominal wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const { id, createdAt, updatedAt, ...rest } = form
        await apiPut(`/api/admin/jenis-tagihan/${editing.id}`, { ...rest, defaultAmount: Number(form.defaultAmount) })
        toast({ title: "Berhasil", description: "Jenis tagihan diperbarui" })
      } else {
        await apiPost("/api/admin/jenis-tagihan", { ...form, defaultAmount: Number(form.defaultAmount) })
        toast({ title: "Berhasil", description: "Jenis tagihan ditambahkan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit Jenis Tagihan" : "Tambah Jenis Tagihan"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Kode *</Label>
            <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SYAHRIYAH" disabled={!!editing} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kategori *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {JENIS_TAGIHAN_CATEGORY.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nama *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nominal Default *</Label>
            <Input type="number" value={form.defaultAmount || ""} onChange={(e) => setForm({ ...form, defaultAmount: Number(e.target.value) })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi</Label>
            <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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

// Need apiPut for jenis tagihan
