"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  formatRupiah,
  formatDate,
  KAS_TYPES,
  TRANSAKSI_KAS_TYPES,
  TRANSAKSI_KAS_CATEGORIES,
} from "@/lib/constants"
import {
  Landmark,
  Plus,
  Pencil,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  FileBarChart,
  CalendarDays,
} from "lucide-react"

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
]

export function KasView() {
  const [tab, setTab] = useState("kas")
  return (
    <div>
      <PageHeader
        title="Kas & Transaksi"
        description="Kelola kas, rekening, pemasukan & pengeluaran madrasah"
        icon={<Landmark className="h-5 w-5" />}
      />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="kas"><Landmark className="h-3.5 w-3.5" /> Kas & Saldo</TabsTrigger>
          <TabsTrigger value="transaksi"><ArrowDownCircle className="h-3.5 w-3.5" /> Transaksi</TabsTrigger>
          <TabsTrigger value="laporan"><FileBarChart className="h-3.5 w-3.5" /> Laporan</TabsTrigger>
        </TabsList>
        <TabsContent value="kas" className="mt-4"><KasTab /></TabsContent>
        <TabsContent value="transaksi" className="mt-4"><TransaksiTab /></TabsContent>
        <TabsContent value="laporan" className="mt-4"><LaporanTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// TAB 1 — KAS & SALDO
// ============================================================================
function KasTab() {
  const [data, setData] = useState<any[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet("/api/admin/kas")
      setData(res.data || [])
      setTotalBalance(res.totalBalance || 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kas/rekening ini? Saldo akan diarsipkan (non-aktif).")) return
    try {
      await apiDelete(`/api/admin/kas/${id}`)
      toast({ title: "Berhasil", description: "Kas dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Kas
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total Saldo Kas</p>
          <p className="text-lg font-bold text-emerald-600">{formatRupiah(totalBalance)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Jumlah Rekening</p>
          <p className="text-lg font-bold">{data.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Tipe Aktif</p>
          <p className="text-lg font-bold">
            {Array.from(new Set(data.map((k) => k.type))).length} tipe
          </p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<Landmark className="h-5 w-5" />} title="Belum ada kas/rekening" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono">Kode</TableHead>
                    <TableHead className="min-w-[200px]">Nama</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>No. Rekening</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-mono text-xs">{k.code}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{k.name}</p>
                        <p className="text-[11px] text-muted-foreground">{k._count?.transaksi || 0} transaksi</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {KAS_TYPES.find((t) => t.value === k.type)?.label || k.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{k.accountNumber || "-"}</TableCell>
                      <TableCell className="text-sm">{k.bankName || "-"}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatRupiah(k.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(k); setDialogOpen(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(k.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      <KasForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} />
    </div>
  )
}

function KasForm({ open, onOpenChange, editing, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ type: "TUNAI", isActive: true })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm({ ...editing, balance: editing.balance || 0 })
    else setForm({ type: "TUNAI", isActive: true, balance: 0 })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.code || !form.name || !form.type) {
      toast({ title: "Validasi gagal", description: "Kode, Nama, dan Tipe wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code,
        name: form.name,
        type: form.type,
        accountNumber: form.accountNumber || null,
        bankName: form.bankName || null,
        balance: Number(form.balance) || 0,
        isActive: form.isActive !== false,
      }
      if (editing) {
        await apiPut(`/api/admin/kas/${editing.id}`, payload)
        toast({ title: "Berhasil", description: "Kas diperbarui" })
      } else {
        await apiPost("/api/admin/kas", payload)
        toast({ title: "Berhasil", description: "Kas baru ditambahkan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit Kas/Rekening" : "Tambah Kas/Rekening"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Kode *</Label>
            <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="KAS-TUNAI" disabled={!!editing} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KAS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nama *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kas Operasional Madrasah" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">No. Rekening</Label>
            <Input value={form.accountNumber || ""} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="1234567890" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nama Bank</Label>
            <Input value={form.bankName || ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="BSM / BCA / Mandiri" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Saldo Awal</Label>
            <Input type="number" value={form.balance || 0} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} />
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
// TAB 2 — TRANSAKSI
// ============================================================================
function TransaksiTab() {
  const [data, setData] = useState<any[]>([])
  const [kasList, setKasList] = useState<any[]>([])
  const [summary, setSummary] = useState<{ totalPemasukan: number; totalPengeluaran: number; saldo: number }>({ totalPemasukan: 0, totalPengeluaran: 0, saldo: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [kasFilter, setKasFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (kasFilter) params.kasId = kasFilter
      if (typeFilter) params.type = typeFilter
      if (categoryFilter) params.category = categoryFilter
      const [tRes, kRes] = await Promise.all([
        apiGet("/api/admin/kas/transaksi", params),
        apiGet("/api/admin/kas"),
      ])
      setData(tRes.data || [])
      setSummary(tRes.summary || { totalPemasukan: 0, totalPengeluaran: 0, saldo: 0 })
      setKasList(kRes.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [kasFilter, typeFilter, categoryFilter])

  useEffect(() => { load() }, [load])

  const filteredData = data.filter((t) => {
    if (search) {
      const q = search.toLowerCase()
      return (
        t.description?.toLowerCase().includes(q) ||
        t.kas?.name?.toLowerCase().includes(q) ||
        t.kas?.code?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus transaksi ini? Saldo kas akan dikembalikan.")) return
    try {
      await apiDelete(`/api/admin/kas/transaksi/${id}`)
      toast({ title: "Berhasil", description: "Transaksi dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" /> Total Pemasukan</p>
          <p className="text-lg font-bold text-emerald-600">{formatRupiah(summary.totalPemasukan)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" /> Total Pengeluaran</p>
          <p className="text-lg font-bold text-red-600">{formatRupiah(summary.totalPengeluaran)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Saldo Periode</p>
          <p className={`text-lg font-bold ${summary.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatRupiah(summary.saldo)}</p>
        </CardContent></Card>
      </div>

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari deskripsi / kas..."
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Transaksi</Button>}
        filters={
          <>
            <Select value={kasFilter} onValueChange={(v) => setKasFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Semua Kas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kas</SelectItem>
                {kasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {TRANSAKSI_KAS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {TRANSAKSI_KAS_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            filteredData.length === 0 ? <EmptyState icon={<ArrowDownCircle className="h-5 w-5" />} title="Belum ada transaksi" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="min-w-[200px]">Deskripsi</TableHead>
                    <TableHead>Kas</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(t.transaksiDate, true)}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{t.description}</p>
                        {t.reference && <p className="text-[11px] text-muted-foreground font-mono">{t.reference}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{t.kas?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === "PEMASUKAN" ? "default" : "destructive"} className={t.type === "PEMASUKAN" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                          {TRANSAKSI_KAS_TYPES.find((x) => x.value === t.type)?.label || t.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {TRANSAKSI_KAS_CATEGORIES.find((c) => c.value === t.category)?.label || t.category}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${t.type === "PEMASUKAN" ? "text-emerald-600" : "text-red-600"}`}>
                        {t.type === "PEMASUKAN" ? "+" : "-"} {formatRupiah(t.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      <TransaksiForm open={dialogOpen} onOpenChange={setDialogOpen} kasList={kasList} onSuccess={load} />
    </div>
  )
}

function TransaksiForm({ open, onOpenChange, kasList, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; kasList: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ type: "PEMASUKAN", category: "OPERASIONAL" })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setForm({
        type: "PEMASUKAN",
        category: "OPERASIONAL",
        kasId: kasList[0]?.id || "",
        transaksiDate: new Date().toISOString().split("T")[0],
        amount: 0,
      })
    }
  }, [open, kasList])

  const handleSave = async () => {
    if (!form.kasId || !form.type || !form.category || !form.amount || !form.description) {
      toast({ title: "Validasi gagal", description: "Kas, Tipe, Kategori, Nominal, dan Deskripsi wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await apiPost("/api/admin/kas/transaksi", {
        ...form,
        amount: Number(form.amount),
      })
      toast({ title: "Berhasil", description: "Transaksi dicatat" })
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
        <DialogHeader><DialogTitle>Catat Transaksi Kas</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Kas / Rekening *</Label>
            <Select value={form.kasId} onValueChange={(v) => setForm({ ...form, kasId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Kas" /></SelectTrigger>
              <SelectContent>
                {kasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name} ({k.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSAKSI_KAS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kategori *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSAKSI_KAS_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nominal *</Label>
            <Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal</Label>
            <Input type="date" value={form.transaksiDate || ""} onChange={(e) => setForm({ ...form, transaksiDate: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi *</Label>
            <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Honor ustadz X, pembelian ATK, dll" />
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
// TAB 3 — LAPORAN
// ============================================================================
function LaporanTab() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet("/api/admin/kas/laporan", { type: "bulanan", month, year })
      setData(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const pemasukanCategories = useMemo(() => {
    if (!data?.pemasukan?.byCategory) return []
    return TRANSAKSI_KAS_CATEGORIES
      .map((c) => ({ ...c, total: data.pemasukan.byCategory[c.value] || 0 }))
      .filter((c) => c.total > 0)
  }, [data])

  const pengeluaranCategories = useMemo(() => {
    if (!data?.pengeluaran?.byCategory) return []
    return TRANSAKSI_KAS_CATEGORIES
      .map((c) => ({ ...c, total: data.pengeluaran.byCategory[c.value] || 0 }))
      .filter((c) => c.total > 0)
  }, [data])

  const yearOptions = useMemo(() => {
    const current = now.getFullYear()
    const arr: number[] = []
    for (let y = current - 3; y <= current + 1; y++) arr.push(y)
    return arr
  }, [])

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Periode</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? <LoadingState /> :
        error ? <ErrorState message={error} onRetry={load} /> :
        !data ? <EmptyState icon={<FileBarChart className="h-5 w-5" />} title="Tidak ada data laporan" /> :
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" /> Total Pemasukan</p>
              <p className="text-lg font-bold text-emerald-600">{formatRupiah(data.pemasukan.total)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" /> Total Pengeluaran</p>
              <p className="text-lg font-bold text-red-600">{formatRupiah(data.pengeluaran.total)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Surplus / Defisit</p>
              <p className={`text-lg font-bold ${data.surplus >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatRupiah(data.surplus)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Saldo Kas Saat Ini</p>
              <p className="text-lg font-bold">{formatRupiah(data.saldoKas.total)}</p>
            </CardContent></Card>
          </div>

          {/* Pemasukan by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2 text-emerald-700">
                  <ArrowUpCircle className="h-4 w-4" /> Pemasukan per Kategori
                </p>
                {pemasukanCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada pemasukan periode ini</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pemasukanCategories.map((c) => (
                        <TableRow key={c.value}>
                          <TableCell className="text-sm">{c.label}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-emerald-600">{formatRupiah(c.total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="text-sm font-bold">Total</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-emerald-700">{formatRupiah(data.pemasukan.total)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-700">
                  <ArrowDownCircle className="h-4 w-4" /> Pengeluaran per Kategori
                </p>
                {pengeluaranCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada pengeluaran periode ini</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pengeluaranCategories.map((c) => (
                        <TableRow key={c.value}>
                          <TableCell className="text-sm">{c.label}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-red-600">{formatRupiah(c.total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="text-sm font-bold">Total</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-red-700">{formatRupiah(data.pengeluaran.total)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Saldo by Kas */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Landmark className="h-4 w-4" /> Saldo per Kas / Rekening</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kas</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.saldoKas.byKas?.length > 0 ? (
                    <>
                      {data.saldoKas.byKas.map((k: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{k.name}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatRupiah(k.balance)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="text-sm font-bold">Total Saldo</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">{formatRupiah(data.saldoKas.total)}</TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow><TableCell colSpan={2} className="text-xs text-muted-foreground text-center">Belum ada kas terdaftar</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tunggakan */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-700">
                <FileBarChart className="h-4 w-4" /> Tunggakan Santri
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-amber-50 border border-amber-200">
                  <p className="text-xs text-muted-foreground">Jumlah Tagihan Tunggakan</p>
                  <p className="text-lg font-bold text-amber-700">{data.tunggakan.count} tagihan</p>
                </div>
                <div className="p-3 rounded bg-red-50 border border-red-200">
                  <p className="text-xs text-muted-foreground">Total Nilai Tunggakan</p>
                  <p className="text-lg font-bold text-red-700">{formatRupiah(data.tunggakan.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    </div>
  )
}
