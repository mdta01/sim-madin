"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiDelete } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatRupiah, formatDate, PAYMENT_METHODS } from "@/lib/constants"
import { Wallet, Plus, Trash2, Receipt as ReceiptIcon } from "lucide-react"

export function PembayaranView() {
  const [payments, setPayments] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [tagihanList, setTagihanList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [methodFilter, setMethodFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (statusFilter) params.status = statusFilter
      if (methodFilter) params.method = methodFilter
      const [pRes, sRes] = await Promise.all([
        apiGet("/api/admin/pembayaran", params),
        apiGet("/api/admin/santri", { status: "AKTIF" }),
      ])
      setPayments(pRes.data)
      setSantriList(sRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, methodFilter])

  useEffect(() => { load() }, [load])

  const filteredData = payments.filter(p => {
    if (search && !p.santri?.name?.toLowerCase().includes(search.toLowerCase()) && !p.invoiceNo?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pembayaran ini? Tagihan terkait akan dikembalikan.")) return
    try {
      await apiDelete(`/api/admin/pembayaran/${id}`)
      toast({ title: "Berhasil", description: "Pembayaran dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const summary = {
    total: payments.length,
    verified: payments.filter(p => p.status === "VERIFIED").length,
    pending: payments.filter(p => p.status === "PENDING").length,
    totalAmount: payments.filter(p => p.status === "VERIFIED").reduce((sum, p) => sum + p.amount, 0),
  }

  return (
    <div>
      <PageHeader
        title="Data Pembayaran"
        description="Catat dan kelola pembayaran tagihan santri"
        icon={<Wallet className="h-5 w-5" />}
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Catat Pembayaran</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Transaksi</p><p className="text-lg font-bold">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Terverifikasi</p><p className="text-lg font-bold text-emerald-600">{summary.verified}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold text-amber-600">{summary.pending}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Pemasukan</p><p className="text-sm font-bold text-emerald-600">{formatRupiah(summary.totalAmount)}</p></CardContent></Card>
      </div>

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama santri atau no invoice..."
        filters={
          <>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="VERIFIED">Terverifikasi</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Metode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            filteredData.length === 0 ? <EmptyState icon={<Wallet className="h-5 w-5" />} title="Belum ada pembayaran" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono">Invoice</TableHead>
                    <TableHead className="min-w-[180px]">Santri</TableHead>
                    <TableHead>Jenis Tagihan</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.invoiceNo}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{p.santri?.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.santri?.nis}</p>
                      </TableCell>
                      <TableCell className="text-sm">{p.tagihan?.jenisTagihan?.name || "-"}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{formatRupiah(p.amount)}</TableCell>
                      <TableCell><Badge variant="outline">{p.paymentMethod}</Badge></TableCell>
                      <TableCell className="text-xs">{formatDate(p.paymentDate, true)}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      <PembayaranForm open={dialogOpen} onOpenChange={setDialogOpen} santriList={santriList} onSuccess={load} />
    </div>
  )
}

function PembayaranForm({ open, onOpenChange, santriList, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; santriList: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ paymentMethod: "TUNAI", status: "VERIFIED" })
  const [tagihanList, setTagihanList] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && form.santriId) {
      apiGet("/api/admin/tagihan", { santriId: form.santriId }).then((r) => {
        setTagihanList(r.data.filter((t: any) => t.status !== "LUNAS"))
      })
    } else if (open) {
      setTagihanList([])
    }
  }, [form.santriId, open])

  const handleSave = async () => {
    if (!form.santriId || !form.amount || !form.paymentMethod) {
      toast({ title: "Validasi gagal", description: "Santri, Nominal, dan Metode wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await apiPost("/api/admin/pembayaran", form)
      toast({ title: "Berhasil", description: "Pembayaran dicatat" })
      onOpenChange(false)
      setForm({ paymentMethod: "TUNAI", status: "VERIFIED" })
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
        <DialogHeader><DialogTitle>Catat Pembayaran</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Santri *</Label>
            <Select value={form.santriId} onValueChange={(v) => setForm({ ...form, santriId: v, tagihanId: undefined })}>
              <SelectTrigger><SelectValue placeholder="Pilih Santri" /></SelectTrigger>
              <SelectContent>
                {santriList.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} - {s.nis}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.santriId && tagihanList.length > 0 && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Tagihan (opsional)</Label>
              <Select value={form.tagihanId} onValueChange={(v) => {
                const t = tagihanList.find(x => x.id === v)
                setForm({ ...form, tagihanId: v, amount: t ? (t.amount - t.paidAmount) : form.amount })
              }}>
                <SelectTrigger><SelectValue placeholder="Pilih Tagihan (untuk update otomatis)" /></SelectTrigger>
                <SelectContent>
                  {tagihanList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.jenisTagihan?.name} - Sisa {formatRupiah(t.amount - t.paidAmount)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Nominal *</Label>
            <Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Metode Pembayaran *</Label>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal</Label>
            <Input type="date" value={form.paymentDate ? new Date(form.paymentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VERIFIED">Terverifikasi</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Catatan</Label>
            <Input value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
