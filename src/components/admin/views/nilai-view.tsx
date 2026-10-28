"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiDelete } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { NILAI_TYPES, formatDate } from "@/lib/constants"
import { Award, Plus, Trash2, Save } from "lucide-react"

export function NilaiView() {
  const [nilai, setNilai] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kelasFilter, setKelasFilter] = useState("")
  const [mapelFilter, setMapelFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [inputMode, setInputMode] = useState(false)
  const [inputForm, setInputForm] = useState<any>({ type: "HARIAN" })
  const [inputNilai, setInputNilai] = useState<Record<string, number>>({})
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (kelasFilter) params.kelasId = kelasFilter
      if (mapelFilter) params.mapelId = mapelFilter
      if (typeFilter) params.type = typeFilter
      const [nilaiRes, kelasRes, mapelRes, guruRes] = await Promise.all([
        apiGet("/api/admin/nilai", params),
        apiGet("/api/admin/kelas"),
        apiGet("/api/admin/mapel"),
        apiGet("/api/admin/guru"),
      ])
      setNilai(nilaiRes.data)
      setKelasList(kelasRes.data)
      setMapelList(mapelRes.data)
      setGuruList(guruRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [kelasFilter, mapelFilter, typeFilter])

  useEffect(() => { load() }, [load])

  const startInput = async () => {
    if (!kelasFilter || !mapelFilter) {
      toast({ title: "Lengkapi filter", description: "Pilih kelas dan mapel untuk input nilai", variant: "destructive" })
      return
    }
    const santriRes = await apiGet("/api/admin/santri", { kelasId: kelasFilter, status: "AKTIF" })
    setSantriList(santriRes.data)
    // Prefill
    const map: Record<string, number> = {}
    for (const s of santriRes.data) {
      const existing = nilai.find(n => n.santriId === s.id && n.mapelId === mapelFilter && n.type === (inputForm.type || "HARIAN"))
      map[s.id] = existing?.score ?? 0
    }
    setInputNilai(map)
    setInputMode(true)
  }

  const handleSaveInput = async () => {
    if (!inputForm.type) {
      toast({ title: "Pilih jenis nilai", variant: "destructive" })
      return
    }
    try {
      const promises = Object.entries(inputNilai)
        .filter(([_, score]) => score !== undefined && score !== null && score > 0)
        .map(([santriId, score]) =>
          apiPost("/api/admin/nilai", {
            santriId, kelasId: kelasFilter, mapelId: mapelFilter,
            type: inputForm.type, score, guruId: inputForm.guruId,
          })
        )
      await Promise.all(promises)
      toast({ title: "Berhasil", description: `${promises.length} nilai disimpan` })
      setInputMode(false)
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus nilai ini?")) return
    try {
      await apiDelete(`/api/admin/nilai/${id}`)
      toast({ title: "Berhasil", description: "Nilai dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Data Nilai"
        description="Input dan kelola nilai santri per mata pelajaran"
        icon={<Award className="h-5 w-5" />}
        actions={<Button onClick={startInput}><Plus className="h-4 w-4 mr-1" /> Input Nilai</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mapelFilter} onValueChange={(v) => setMapelFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Mapel</SelectItem>
            {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[160px] h-9"><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            {NILAI_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            nilai.length === 0 ? <EmptyState icon={<Award className="h-5 w-5" />} title="Belum ada nilai" description="Pilih kelas & mapel lalu input nilai" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Santri</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-center">Nilai</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Guru</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nilai.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{n.santri?.name?.[0]}</AvatarFallback></Avatar>
                          <div>
                            <p className="text-sm font-medium">{n.santri?.name}</p>
                            <p className="text-[11px] text-muted-foreground">{n.santri?.nis}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{n.mapel?.name}</TableCell>
                      <TableCell><Badge variant="outline">{n.type}</Badge></TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono font-bold text-base ${n.score >= (n.mapel?.kkm || 70) ? "text-emerald-600" : "text-red-600"}`}>{n.score}</span>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(n.assessmentDate)}</TableCell>
                      <TableCell className="text-xs">{n.guru?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
            <DialogTitle>Input Nilai</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="space-y-1">
              <Label className="text-xs">Jenis Nilai</Label>
              <Select value={inputForm.type} onValueChange={(v) => { setInputForm({ ...inputForm, type: v }); /* reset prefill */ const map: Record<string, number> = {}; for (const s of santriList) { const existing = nilai.find(n => n.santriId === s.id && n.mapelId === mapelFilter && n.type === v); map[s.id] = existing?.score ?? 0; } setInputNilai(map); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NILAI_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Guru Pengampu</Label>
              <Select value={inputForm.guruId} onValueChange={(v) => setInputForm({ ...inputForm, guruId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                <SelectContent>
                  {guruList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {santriList.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded border bg-card">
                <Avatar className="h-7 w-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{s.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.nis}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputNilai[s.id] ?? 0}
                  onChange={(e) => setInputNilai(prev => ({ ...prev, [s.id]: Number(e.target.value) }))}
                  className="w-20 h-8 text-center font-mono"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInputMode(false)}>Batal</Button>
            <Button onClick={handleSaveInput}><Save className="h-4 w-4 mr-1" /> Simpan Nilai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
