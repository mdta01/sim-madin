"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { KOMPETENSI_CATEGORIES } from "@/lib/constants"
import { Target, Plus, Pencil, Trash2, BookOpen } from "lucide-react"

export function KompetensiView() {
  const [data, setData] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [mapelFilter, setMapelFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
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
      if (categoryFilter) params.category = categoryFilter
      const [res, mapelRes] = await Promise.all([
        apiGet("/api/admin/kompetensi", params),
        apiGet("/api/admin/mapel"),
      ])
      setData(res.data)
      setMapelList(mapelRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, mapelFilter, categoryFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Yakin ingin menonaktifkan kompetensi "${code}"?`)) return
    try {
      await apiDelete(`/api/admin/kompetensi/${id}`)
      toast({ title: "Berhasil", description: "Kompetensi dinonaktifkan" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  // Group by mapel for display
  const grouped = data.reduce((acc: Record<string, any[]>, k: any) => {
    const key = k.mapelId
    if (!acc[key]) acc[key] = []
    acc[key].push(k)
    return acc
  }, {})

  return (
    <div>
      <PageHeader
        title="Kompetensi"
        description="Capaian pembelajaran per mata pelajaran (kognitif, psikomotorik, afektif, spiritual)"
        icon={<Target className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Kompetensi</Button>}
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama kompetensi..."
        filters={
          <>
            <Select value={mapelFilter} onValueChange={(v) => setMapelFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {KOMPETENSI_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      {loading ? <LoadingState /> :
        error ? <ErrorState message={error} onRetry={load} /> :
        data.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState icon={<Target className="h-5 w-5" />} title="Belum ada kompetensi" description="Tambahkan capaian pembelajaran per mata pelajaran." />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([mapelId, items]) => {
              const mapel = mapelList.find((m) => m.id === mapelId) || items[0]?.mapel
              return (
                <Card key={mapelId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      {mapel?.name || "Tanpa Mapel"}
                      <Badge variant="secondary" className="text-xs">{items.length} kompetensi</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {items.map((k) => (
                        <div key={k.id} className="border rounded-md p-3 hover:bg-accent/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] font-mono">{k.code}</Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  {KOMPETENSI_CATEGORIES.find(c => c.value === k.category)?.label || k.category}
                                </Badge>
                                {!k.isActive && <Badge variant="destructive" className="text-[10px]">Nonaktif</Badge>}
                              </div>
                              <p className="font-medium text-sm">{k.name}</p>
                              {k.description && (
                                <p className="text-xs text-muted-foreground mt-1">{k.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setEditing(k); setDialogOpen(true) }}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => handleDelete(k.id, k.code)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      }

      <KompetensiForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={load}
        mapelList={mapelList}
      />
    </div>
  )
}

function KompetensiForm({ open, onOpenChange, editing, onSuccess, mapelList }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: any | null
  onSuccess: () => void
  mapelList: any[]
}) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ category: "UMUM", sortOrder: 0, isActive: true })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.code || !form.name || !form.mapelId) {
      toast({ title: "Validasi gagal", description: "Kode, Nama, dan Mapel wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/kompetensi/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Kompetensi diperbarui" })
      } else {
        await apiPost("/api/admin/kompetensi", form)
        toast({ title: "Berhasil", description: "Kompetensi baru ditambahkan" })
      }
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Auto-generate code suggestion
  const suggestCode = () => {
    if (!form.mapelId) return
    const mapel = mapelList.find((m) => m.id === form.mapelId)
    if (!mapel) return
    const prefix = mapel.code?.slice(0, 4).toUpperCase() || "KOMP"
    const random = Math.floor(Math.random() * 999).toString().padStart(3, "0")
    setForm({ ...form, code: `${prefix}-${random}` })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit Kompetensi" : "Tambah Kompetensi"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
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
            <Label className="text-xs">Kategori</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KOMPETENSI_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kode Kompetensi *</Label>
            <div className="flex gap-2">
              <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="QURAN-001" />
              <Button type="button" variant="outline" size="sm" onClick={suggestCode}>Auto</Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Urutan</Label>
            <Input type="number" value={form.sortOrder || 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nama Kompetensi *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis: Mampu membaca Al-Qur'an dengan tajwid yang benar" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Indikator pencapaian, metode evaluasi..." rows={3} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2 pt-1">
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} id="kompetensi-active" />
            <Label htmlFor="kompetensi-active" className="text-sm cursor-pointer">Aktif</Label>
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
