"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
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
import { MAPEL_CATEGORIES } from "@/lib/constants"
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react"

export function MapelView() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
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
      if (categoryFilter) params.category = categoryFilter
      const res = await apiGet("/api/admin/mapel", params)
      setData(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus mata pelajaran ini?")) return
    try {
      await apiDelete(`/api/admin/mapel/${id}`)
      toast({ title: "Berhasil", description: "Mapel telah dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Mata Pelajaran"
        description="Daftar mata pelajaran madrasah diniyah"
        icon={<BookOpen className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Mapel</Button>}
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama mapel..."
        filters={
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {MAPEL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<BookOpen className="h-5 w-5" />} title="Belum ada data mapel" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead className="min-w-[200px]">Nama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">KKM</TableHead>
                    <TableHead className="text-center">Durasi</TableHead>
                    <TableHead className="text-center">Jml Jadwal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.code}</TableCell>
                      <TableCell className="font-medium text-sm">{m.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{MAPEL_CATEGORIES.find(c => c.value === m.category)?.label || m.category}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{m.kkm}</Badge></TableCell>
                      <TableCell className="text-center text-sm">{m.durationMnt} mnt</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{m._count?.jadwal || 0}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(m); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <MapelForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} />
    </div>
  )
}

function MapelForm({ open, onOpenChange, editing, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ kkm: 70, durationMnt: 60, sortOrder: 0, isActive: true, category: "DINIYAH" })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.code || !form.name || !form.category) {
      toast({ title: "Validasi gagal", description: "Kode, Nama, dan Kategori wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/mapel/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Mapel diperbarui" })
      } else {
        await apiPost("/api/admin/mapel", form)
        toast({ title: "Berhasil", description: "Mapel baru ditambahkan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Kode *</Label>
            <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="QURAN" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kategori *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAPEL_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nama *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi</Label>
            <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">KKM</Label>
            <Input type="number" value={form.kkm || ""} onChange={(e) => setForm({ ...form, kkm: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Durasi (menit)</Label>
            <Input type="number" value={form.durationMnt || ""} onChange={(e) => setForm({ ...form, durationMnt: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Urutan</Label>
            <Input type="number" value={form.sortOrder || 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
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
