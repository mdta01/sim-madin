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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatRupiah, HONOR_STATUS, HONOR_PERIODE_TYPES } from "@/lib/constants"
import { Banknote, Plus, Pencil, Trash2, FileText, CreditCard, CheckCircle2 } from "lucide-react"

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

const HONOR_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground hover:bg-muted",
  DISETUJUI: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  DIBAYARKAN: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
}

function HonorStatusBadge({ status }: { status: string }) {
  const conf = HONOR_STATUS[status]
  if (!conf) return <Badge variant="outline">{status}</Badge>
  return <Badge className={HONOR_STATUS_COLOR[status] || ""}>{conf.label}</Badge>
}

export function HonorGuruView() {
  const [data, setData] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [kasList, setKasList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [guruFilter, setGuruFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [bayarTarget, setBayarTarget] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (guruFilter) params.guruId = guruFilter
      if (statusFilter) params.status = statusFilter
      const [hRes, gRes, kRes] = await Promise.all([
        apiGet("/api/admin/honor-guru", params),
        apiGet("/api/admin/guru"),
        apiGet("/api/admin/kas"),
      ])
      setData(hRes.data || [])
      setGuruList(gRes.data || [])
      setKasList(kRes.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [guruFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const filteredData = data.filter((h) => {
    if (search) {
      const q = search.toLowerCase()
      return (
        h.guru?.name?.toLowerCase().includes(q) ||
        h.periodeLabel?.toLowerCase().includes(q) ||
        h.periode?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus honor guru ini?")) return
    try {
      await apiDelete(`/api/admin/honor-guru/${id}`)
      toast({ title: "Berhasil", description: "Honor guru dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const openSlip = (id: string) => {
    window.open(`/api/admin/honor-guru/${id}/slip`, "_blank")
  }

  const summary = {
    total: data.length,
    draft: data.filter((h) => h.status === "DRAFT").length,
    disetujui: data.filter((h) => h.status === "DISETUJUI").length,
    dibayar: data.filter((h) => h.status === "DIBAYARKAN").length,
    totalHonor: data.filter((h) => h.status === "DIBAYARKAN").reduce((s, h) => s + h.totalHonor, 0),
  }

  return (
    <div>
      <PageHeader
        title="Honor Guru"
        description="Kelola honor mengajar, insentif, tunjangan & slip honor"
        icon={<Banknote className="h-5 w-5" />}
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Honor
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total Record</p>
          <p className="text-lg font-bold">{summary.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Draft</p>
          <p className="text-lg font-bold text-muted-foreground">{summary.draft}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Disetujui</p>
          <p className="text-lg font-bold text-blue-600">{summary.disetujui}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Dibayar</p>
          <p className="text-lg font-bold text-emerald-600">{summary.dibayar}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total Dibayar</p>
          <p className="text-sm font-bold text-emerald-600">{formatRupiah(summary.totalHonor)}</p>
        </CardContent></Card>
      </div>

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama guru atau periode..."
        filters={
          <>
            <Select value={guruFilter} onValueChange={(v) => setGuruFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Semua Guru" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Guru</SelectItem>
                {guruList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(HONOR_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            filteredData.length === 0 ? <EmptyState icon={<Banknote className="h-5 w-5" />} title="Belum ada honor guru" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Guru</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Honor Mengajar</TableHead>
                    <TableHead className="text-right">Insentif</TableHead>
                    <TableHead className="text-right">Tunjangan</TableHead>
                    <TableHead className="text-right">Potongan</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{h.guru?.name || "-"}</p>
                        <p className="text-[11px] text-muted-foreground">{h.guru?.nip || "Tanpa NIP"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{h.periodeLabel}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{h.periode}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatRupiah(h.honorMengajar)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-600">{formatRupiah(h.insentif)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatRupiah(h.tunjangan)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-red-600">{formatRupiah(h.potongan)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">{formatRupiah(h.totalHonor)}</TableCell>
                      <TableCell><HonorStatusBadge status={h.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Slip Honor" onClick={() => openSlip(h.id)}>
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          {h.status === "DISETUJUI" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Tandai Dibayar" onClick={() => setBayarTarget(h)}>
                              <CreditCard className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => { setEditing(h); setDialogOpen(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Hapus" onClick={() => handleDelete(h.id)}>
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

      <HonorGuruForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        guruList={guruList}
        onSuccess={load}
      />
      <BayarDialog
        target={bayarTarget}
        kasList={kasList}
        onClose={() => setBayarTarget(null)}
        onSuccess={load}
      />
    </div>
  )
}

// ============================================================================
// FORM — Add / Edit Honor Guru
// ============================================================================
function HonorGuruForm({ open, onOpenChange, editing, guruList, onSuccess }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: any | null
  guruList: any[]
  onSuccess: () => void
}) {
  const [form, setForm] = useState<any>({ status: "DRAFT", periodeType: "BULANAN" })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) {
      setForm({ ...editing })
    } else {
      // Default periode to current month
      const d = new Date()
      const periode = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const periodeLabel = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
      setForm({
        status: "DRAFT",
        periodeType: "BULANAN",
        periode,
        periodeLabel,
        honorMengajar: 0,
        insentif: 0,
        tunjangan: 0,
        potongan: 0,
      })
    }
  }, [editing, open])

  // Auto-compute total
  const totalHonor = computeTotal(form)

  const handlePeriodeChange = (value: string) => {
    // value format: "2025-10"
    const [y, m] = value.split("-")
    const monthIdx = Number(m) - 1
    const periodeLabel = monthIdx >= 0 && monthIdx < 12 ? `${MONTHS[monthIdx]} ${y}` : value
    setForm({ ...form, periode: value, periodeLabel })
  }

  const handleSave = async () => {
    if (!form.guruId || !form.periode || !form.periodeLabel) {
      toast({ title: "Validasi gagal", description: "Guru, Periode, dan Label Periode wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        guruId: form.guruId,
        periode: form.periode,
        periodeLabel: form.periodeLabel,
        honorMengajar: Number(form.honorMengajar) || 0,
        insentif: Number(form.insentif) || 0,
        tunjangan: Number(form.tunjangan) || 0,
        potongan: Number(form.potongan) || 0,
        status: form.status || "DRAFT",
        catatan: form.catatan || null,
        periodeType: form.periodeType || "BULANAN",
      }
      if (editing) {
        await apiPut(`/api/admin/honor-guru/${editing.id}`, payload)
        toast({ title: "Berhasil", description: "Honor guru diperbarui" })
      } else {
        await apiPost("/api/admin/honor-guru", payload)
        toast({ title: "Berhasil", description: "Honor guru dibuat" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit Honor Guru" : "Tambah Honor Guru"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Guru *</Label>
            <Select value={form.guruId} onValueChange={(v) => setForm({ ...form, guruId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
              <SelectContent>
                {guruList.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}{g.nip ? ` - ${g.nip}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe Periode</Label>
            <Select value={form.periodeType} onValueChange={(v) => setForm({ ...form, periodeType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HONOR_PERIODE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Periode (YYYY-MM) *</Label>
            <Input
              type="month"
              value={form.periode || ""}
              onChange={(e) => handlePeriodeChange(e.target.value)}
              placeholder="2025-10"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Label Periode *</Label>
            <Input value={form.periodeLabel || ""} onChange={(e) => setForm({ ...form, periodeLabel: e.target.value })} placeholder="Oktober 2025" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Honor Mengajar</Label>
            <Input type="number" value={form.honorMengajar || 0} onChange={(e) => setForm({ ...form, honorMengajar: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Insentif</Label>
            <Input type="number" value={form.insentif || 0} onChange={(e) => setForm({ ...form, insentif: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tunjangan</Label>
            <Input type="number" value={form.tunjangan || 0} onChange={(e) => setForm({ ...form, tunjangan: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Potongan</Label>
            <Input type="number" value={form.potongan || 0} onChange={(e) => setForm({ ...form, potongan: Number(e.target.value) })} />
          </div>
          <div className="space-y-1 sm:col-span-2 p-3 rounded bg-muted/50 border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Honor (auto-computed)</p>
                <p className="text-[11px] text-muted-foreground">Mengajar + Insentif + Tunjangan - Potongan</p>
              </div>
              <p className="text-lg font-bold text-emerald-600 font-mono">{formatRupiah(totalHonor)}</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(HONOR_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Catatan</Label>
            <Input value={form.catatan || ""} onChange={(e) => setForm({ ...form, catatan: e.target.value })} placeholder="Catatan tambahan (opsional)" />
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
// BAYAR DIALOG — Set status DIBAYARKAN + select kasId
// ============================================================================
function BayarDialog({ target, kasList, onClose, onSuccess }: {
  target: any | null
  kasList: any[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [kasId, setKasId] = useState("")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (target) {
      setKasId(target.kasId || kasList[0]?.id || "")
    }
  }, [target, kasList])

  const handleBayar = async () => {
    if (!target) return
    if (!kasId) {
      toast({ title: "Validasi gagal", description: "Pilih kas sumber pembayaran", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await apiPut(`/api/admin/honor-guru/${target.id}`, { status: "DIBAYARKAN", kasId })
      toast({ title: "Berhasil", description: `Honor ${target.guru?.name} ditandai dibayar. Transaksi kas otomatis dibuat.` })
      onClose()
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Bayar Honor Guru</DialogTitle></DialogHeader>
        {target && (
          <div className="space-y-3 py-2">
            <div className="p-3 rounded bg-muted/50 border">
              <p className="text-xs text-muted-foreground">Guru</p>
              <p className="text-sm font-medium">{target.guru?.name}</p>
              <p className="text-xs text-muted-foreground mt-2">Periode</p>
              <p className="text-sm">{target.periodeLabel}</p>
              <p className="text-xs text-muted-foreground mt-2">Total Honor</p>
              <p className="text-sm font-bold text-emerald-600 font-mono">{formatRupiah(target.totalHonor)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bayar dari Kas *</Label>
              <Select value={kasId} onValueChange={setKasId}>
                <SelectTrigger><SelectValue placeholder="Pilih Kas" /></SelectTrigger>
                <SelectContent>
                  {kasList.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name} ({k.code}) — Saldo {formatRupiah(k.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Saldo kas akan dikurangi otomatis. Transaksi pengeluaran akan tercatat di buku kas.
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleBayar} disabled={saving || !kasId}>
            <CreditCard className="h-4 w-4 mr-1" /> {saving ? "Memproses..." : "Konfirmasi Bayar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// HELPERS
// ============================================================================
function computeTotal(form: any): number {
  const mengajar = Number(form.honorMengajar) || 0
  const insentif = Number(form.insentif) || 0
  const tunjangan = Number(form.tunjangan) || 0
  const potongan = Number(form.potongan) || 0
  return mengajar + insentif + tunjangan - potongan
}
