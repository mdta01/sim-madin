"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiDelete } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { DAYS } from "@/lib/constants"
import { CalendarClock, Plus, Trash2, CalendarDays } from "lucide-react"

export function JadwalView() {
  const [jadwal, setJadwal] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kelasFilter, setKelasFilter] = useState("")
  const [dayFilter, setDayFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<any>({ dayOfWeek: 1, startTime: "07:00", endTime: "08:00" })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [jadwalRes, kelasRes, guruRes, mapelRes] = await Promise.all([
        apiGet("/api/admin/jadwal", kelasFilter ? { kelasId: kelasFilter } : {}),
        apiGet("/api/admin/kelas"),
        apiGet("/api/admin/guru"),
        apiGet("/api/admin/mapel"),
      ])
      setJadwal(jadwalRes.data)
      setKelasList(kelasRes.data)
      setGuruList(guruRes.data)
      setMapelList(mapelRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [kelasFilter])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.kelasId || !form.mapelId || !form.guruId || !form.dayOfWeek || !form.startTime || !form.endTime) {
      toast({ title: "Validasi gagal", description: "Semua field wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await apiPost("/api/admin/jadwal", form)
      toast({ title: "Berhasil", description: "Jadwal ditambahkan" })
      setDialogOpen(false)
      setForm({ dayOfWeek: 1, startTime: "07:00", endTime: "08:00" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus jadwal ini?")) return
    try {
      await apiDelete(`/api/admin/jadwal/${id}`)
      toast({ title: "Berhasil", description: "Jadwal dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  // Group jadwal by day
  const filteredJadwal = dayFilter ? jadwal.filter(j => j.dayOfWeek === Number(dayFilter)) : jadwal
  const byDay = DAYS.map(d => ({
    ...d,
    items: filteredJadwal.filter(j => j.dayOfWeek === d.value).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }))

  return (
    <div>
      <PageHeader
        title="Jadwal Pelajaran"
        description="Atur jadwal pelajaran per kelas"
        icon={<CalendarClock className="h-5 w-5" />}
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Tambah Jadwal</Button>}
      />
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dayFilter} onValueChange={(v) => setDayFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[160px] h-9"><SelectValue placeholder="Semua Hari" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Hari</SelectItem>
            {DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingState /> :
        error ? <ErrorState message={error} onRetry={load} /> :
        jadwal.length === 0 ? <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Belum ada jadwal" description="Tambahkan jadwal pertama Anda" /> :
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {byDay.map((day) => (
            <Card key={day.value}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {day.label}</span>
                  <Badge variant="secondary" className="text-xs">{day.items.length} jadwal</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {day.items.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Tidak ada jadwal</p> : (
                  day.items.map((j) => (
                    <div key={j.id} className="p-2.5 rounded border bg-card group hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="font-mono text-[10px]">{j.startTime}-{j.endTime}</Badge>
                          </div>
                          <p className="font-medium text-sm truncate">{j.mapel?.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{j.kelas?.code} • {j.guru?.name}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDelete(j.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      }

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tambah Jadwal Pelajaran</DialogTitle></DialogHeader>
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
              <Label className="text-xs">Mata Pelajaran *</Label>
              <Select value={form.mapelId} onValueChange={(v) => setForm({ ...form, mapelId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                <SelectContent>
                  {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Guru *</Label>
              <Select value={form.guruId} onValueChange={(v) => setForm({ ...form, guruId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                <SelectContent>
                  {guruList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hari *</Label>
              <Select value={String(form.dayOfWeek || "")} onValueChange={(v) => setForm({ ...form, dayOfWeek: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Pilih Hari" /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Jam Mulai *</Label>
              <Input type="time" value={form.startTime || ""} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Jam Selesai *</Label>
              <Input type="time" value={form.endTime || ""} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
