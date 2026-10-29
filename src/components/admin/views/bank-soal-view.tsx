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
import { useToast } from "@/hooks/use-toast"
import { SOAL_TYPES, SOAL_DIFFICULTY } from "@/lib/constants"
import { Library, Plus, Pencil, Trash2, FileQuestion } from "lucide-react"

export function BankSoalView() {
  const [data, setData] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [kompetensiList, setKompetensiList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [mapelFilter, setMapelFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (search) params.search = search
      if (mapelFilter) params.mapelId = mapelFilter
      if (typeFilter) params.type = typeFilter
      const [res, mapelRes] = await Promise.all([
        apiGet("/api/admin/bank-soal", params),
        apiGet("/api/admin/mapel"),
      ])
      setData(res.data)
      setMapelList(mapelRes.data)
      apiGet("/api/admin/kompetensi").then((r) => setKompetensiList(r.data)).catch(() => {})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, mapelFilter, typeFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Yakin ingin menonaktifkan soal "${code}"?`)) return
    try {
      await apiDelete(`/api/admin/bank-soal/${id}`)
      toast({ title: "Berhasil", description: "Soal dinonaktifkan" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Bank Soal"
        description="Bank soal PG, isian, essay, praktik per mapel"
        icon={<Library className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Soal</Button>}
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari kode atau pertanyaan..."
        filters={
          <>
            <Select value={mapelFilter} onValueChange={(v) => setMapelFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Tipe Soal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {SOAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<Library className="h-5 w-5" />} title="Belum ada soal" description="Tambahkan soal pertama untuk bank soal." /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Kode</TableHead>
                    <TableHead className="min-w-[300px]">Pertanyaan</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kesulitan</TableHead>
                    <TableHead className="text-center">Dipakai</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.code}</TableCell>
                      <TableCell className="text-sm max-w-[300px]">
                        <p className="truncate">{s.question}</p>
                        {s.tags && <p className="text-[10px] text-muted-foreground mt-0.5">{s.tags}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{s.mapel?.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{SOAL_TYPES.find(t => t.value === s.type)?.label || s.type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={s.difficulty === "MUDAH" ? "success" : s.difficulty === "SULIT" ? "destructive" : "warning"} className="text-xs">
                          {SOAL_DIFFICULTY.find(d => d.value === s.difficulty)?.label || s.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{s._count?.ujianLinks || 0} ujian</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(s); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s.id, s.code)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <BankSoalForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={load}
        mapelList={mapelList}
        kompetensiList={kompetensiList}
      />
    </div>
  )
}

function BankSoalForm({ open, onOpenChange, editing, onSuccess, mapelList, kompetensiList }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: any | null
  onSuccess: () => void
  mapelList: any[]
  kompetensiList: any[]
}) {
  const [form, setForm] = useState<any>({})
  const [options, setOptions] = useState<string[]>(["", "", "", ""])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) {
      setForm(editing)
      try {
        const opts = editing.options ? JSON.parse(editing.options) : ["", "", "", ""]
        setOptions(Array.isArray(opts) && opts.length >= 4 ? opts : [...opts, "", "", "", ""].slice(0, 4))
      } catch { setOptions(["", "", "", ""]) }
    } else {
      setForm({ type: "PG", difficulty: "SEDANG", bobot: 1, isActive: true })
      setOptions(["", "", "", ""])
    }
  }, [editing, open])

  const handleSave = async () => {
    if (!form.code || !form.question || !form.type || !form.mapelId) {
      toast({ title: "Validasi gagal", description: "Kode, Pertanyaan, Tipe, dan Mapel wajib diisi", variant: "destructive" })
      return
    }

    const payload: any = { ...form }
    if (form.type === "PG") {
      payload.options = options.filter(o => o.trim())
      if (payload.options.length < 2) {
        toast({ title: "Validasi", description: "Soal PG wajib minimal 2 opsi", variant: "destructive" })
        return
      }
    }

    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/bank-soal/${editing.id}`, payload)
        toast({ title: "Berhasil", description: "Soal diperbarui" })
      } else {
        await apiPost("/api/admin/bank-soal", payload)
        toast({ title: "Berhasil", description: "Soal baru ditambahkan" })
      }
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const isPG = form.type === "PG"
  const hasCorrectAnswer = form.type === "PG" || form.type === "ISIAN"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Soal" : "Tambah Soal Bank Soal"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Mapel *</Label>
            <Select value={form.mapelId} onValueChange={(v) => setForm({ ...form, mapelId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
              <SelectContent>
                {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kode Soal *</Label>
            <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="FIK-001" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe Soal *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tingkat Kesulitan</Label>
            <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOAL_DIFFICULTY.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Pertanyaan *</Label>
            <Textarea value={form.question || ""} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={3} placeholder="Tulis pertanyaan di sini..." />
          </div>

          {isPG && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Opsi Jawaban (PG) — minimal 2</Label>
              <div className="space-y-1.5">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-xs w-5">{String.fromCharCode(65 + i)}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options]
                        newOpts[i] = e.target.value
                        setOptions(newOpts)
                      }}
                      placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasCorrectAnswer && (
            <div className="space-y-1">
              <Label className="text-xs">Jawaban Benar {form.type === "PG" ? "(A/B/C/D)" : "(teks)"}</Label>
              <Input
                value={form.correctAnswer || ""}
                onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                placeholder={form.type === "PG" ? "A" : "jawaban teks"}
              />
            </div>
          )}

          {(form.type === "ESSAY" || form.type === "PRAKTIK") && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Kunci Jawaban / Rubrik Penilaian</Label>
              <Textarea value={form.answerKey || ""} onChange={(e) => setForm({ ...form, answerKey: e.target.value })} rows={3} placeholder="Rubrik atau kunci jawaban untuk guru..." />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Bobot Soal</Label>
            <Input type="number" step="0.1" value={form.bobot || 1} onChange={(e) => setForm({ ...form, bobot: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kompetensi (opsional)</Label>
            <Select value={form.kompetensiId || "none"} onValueChange={(v) => setForm({ ...form, kompetensiId: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Kompetensi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {kompetensiList.filter(k => !form.mapelId || k.mapelId === form.mapelId).map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.code} — {k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Tags (opsional, koma dipisah)</Label>
            <Input value={form.tags || ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tajwid, nun mati, idgham" />
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
