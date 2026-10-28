"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiDelete } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/constants"
import { ClipboardCheck, Plus, Trash2, Save } from "lucide-react"

const STATUS_OPTIONS = [
  { value: "HADIR", label: "Hadir" },
  { value: "SAKIT", label: "Sakit" },
  { value: "IZIN", label: "Izin" },
  { value: "ALFA", label: "Alfa" },
]

export function AbsensiView() {
  const [absensi, setAbsensi] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kelasFilter, setKelasFilter] = useState("")
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0])
  const [statusFilter, setStatusFilter] = useState("")
  const [inputMode, setInputMode] = useState(false)
  const [inputData, setInputData] = useState<Record<string, { status: string; note: string }>>({})
  const [santriList, setInputSantriList] = useState<any[]>([])
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = { date: dateFilter }
      if (kelasFilter) params.kelasId = kelasFilter
      if (statusFilter) params.status = statusFilter
      const [absRes, kelasRes] = await Promise.all([
        apiGet("/api/admin/absensi", params),
        apiGet("/api/admin/kelas"),
      ])
      setAbsensi(absRes.data)
      setKelasList(kelasRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [kelasFilter, dateFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const startInput = async () => {
    if (!kelasFilter) {
      toast({ title: "Pilih kelas dulu", description: "Pilih kelas untuk input absensi", variant: "destructive" })
      return
    }
    // Fetch santri of kelas
    const santriRes = await apiGet("/api/admin/santri", { kelasId: kelasFilter, status: "AKTIF" })
    setInputSantriList(santriRes.data)
    // Prefill with existing absensi
    const map: Record<string, { status: string; note: string }> = {}
    for (const s of santriRes.data) {
      const existing = absensi.find(a => a.santriId === s.id)
      map[s.id] = { status: existing?.status || "HADIR", note: existing?.note || "" }
    }
    setInputData(map)
    setInputMode(true)
  }

  const handleSaveInput = async () => {
    const entries = Object.entries(inputData).map(([santriId, v]) => ({
      santriId, status: v.status, note: v.note || undefined,
    }))
    try {
      const res = await apiPost("/api/admin/absensi", {
        entries,
        kelasId: kelasFilter,
        date: dateFilter,
      })
      toast({ title: "Berhasil", description: `${res.count} absensi disimpan` })
      setInputMode(false)
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus absensi ini?")) return
    try {
      await apiDelete(`/api/admin/absensi/${id}`)
      toast({ title: "Berhasil", description: "Absensi dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  // Summary
  const summary = {
    hadir: absensi.filter(a => a.status === "HADIR").length,
    sakit: absensi.filter(a => a.status === "SAKIT").length,
    izin: absensi.filter(a => a.status === "IZIN").length,
    alfa: absensi.filter(a => a.status === "ALFA").length,
  }

  return (
    <div>
      <PageHeader
        title="Data Absensi"
        description="Rekap dan input absensi harian santri"
        icon={<ClipboardCheck className="h-5 w-5" />}
        actions={
          <Button onClick={startInput}><Plus className="h-4 w-4 mr-1" /> Input Absensi</Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Hadir</p>
          <p className="text-xl font-bold text-emerald-600">{summary.hadir}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Sakit</p>
          <p className="text-xl font-bold text-amber-600">{summary.sakit}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Izin</p>
          <p className="text-xl font-bold text-blue-600">{summary.izin}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Alfa</p>
          <p className="text-xl font-bold text-red-600">{summary.alfa}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full sm:w-[180px] h-9" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[140px] h-9"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            absensi.length === 0 ? <EmptyState icon={<ClipboardCheck className="h-5 w-5" />} title="Belum ada absensi" description="Pilih kelas & tanggal lalu input absensi" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Santri</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absensi.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{a.santri?.name?.[0]}</AvatarFallback></Avatar>
                          <div>
                            <p className="text-sm font-medium">{a.santri?.name}</p>
                            <p className="text-[11px] text-muted-foreground">{a.santri?.nis}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{a.kelas?.name || "-"}</TableCell>
                      <TableCell className="text-xs">{formatDate(a.date)}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-xs">{a.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      {/* Input Dialog */}
      <Dialog open={inputMode} onOpenChange={setInputMode}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Input Absensi - {formatDate(dateFilter)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground mb-3">Pilih status untuk setiap santri. Data akan otomatis diperbarui jika sudah ada.</p>
            {santriList.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded border bg-card">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{s.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.nis}</p>
                </div>
                <div className="flex gap-1">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setInputData(prev => ({ ...prev, [s.id]: { ...prev[s.id], status: opt.value } }))}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        inputData[s.id]?.status === opt.value
                          ? opt.value === "HADIR" ? "bg-emerald-100 text-emerald-700"
                            : opt.value === "SAKIT" ? "bg-amber-100 text-amber-700"
                            : opt.value === "IZIN" ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInputMode(false)}>Batal</Button>
            <Button onClick={handleSaveInput}><Save className="h-4 w-4 mr-1" /> Simpan Absensi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
