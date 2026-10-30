"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Breadcrumb } from "@/components/admin/shared/breadcrumb"
import { useConfirmDialog } from "../shared/confirm-dialog"
import { TableSkeleton, ListSkeleton } from "../shared/skeletons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { KELAS_LEVELS } from "@/lib/constants"
import { School, Plus, Pencil, Trash2, ArrowLeft, Users } from "lucide-react"

export function KelasView() {
  const selectedId = useAdminStore((s) => s.selectedEntityId)
  if (selectedId) return <KelasDetail id={selectedId} />
  return <KelasList />
}

function KelasList() {
  const [data, setData] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()
  const selectEntity = useAdminStore((s) => s.selectEntity)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [res, guruRes] = await Promise.all([
        apiGet("/api/admin/kelas"),
        apiGet("/api/admin/guru"),
      ])
      setData(res.data)
      setGuruList(guruRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Hapus kelas?",
      description: `Kelas "${name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Hapus",
      variant: "destructive",
      onConfirm: async () => {
        await apiDelete(`/api/admin/kelas/${id}`)
      },
    })
    if (ok) {
      toast({ title: "Berhasil", description: "Kelas dihapus" })
      load()
    }
  }

  const filteredData = data.filter((k) => {
    if (search && !k.name.toLowerCase().includes(search.toLowerCase()) && !k.code.toLowerCase().includes(search.toLowerCase())) return false
    if (levelFilter && k.level !== levelFilter) return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Data Kelas"
        description="Kelola kelas madrasah beserta wali kelasnya"
        icon={<School className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Kelas</Button>}
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama atau kode kelas..."
        filters={
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Semua Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Level</SelectItem>
              {KELAS_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={6} cols={5} /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            filteredData.length === 0 ? <EmptyState icon={<School className="h-5 w-5" />} title="Belum ada data kelas" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead className="min-w-[200px]">Nama Kelas</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Wali Kelas</TableHead>
                    <TableHead className="text-center">Kapasitas</TableHead>
                    <TableHead className="text-center">Santri</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((k) => (
                    <TableRow key={k.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectEntity(k.id)}>
                      <TableCell className="font-mono text-xs">{k.code}</TableCell>
                      <TableCell className="font-medium text-sm">{k.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{k.level}</Badge></TableCell>
                      <TableCell className="text-sm">{k.waliKelas?.name || "-"}</TableCell>
                      <TableCell className="text-center text-sm">{k.capacity}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{k._count?.santri || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(k); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(k.id, k.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <KelasForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} guruList={guruList} onSuccess={load} />
      {ConfirmDialogComponent}
    </div>
  )
}

function KelasForm({ open, onOpenChange, editing, guruList, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; guruList: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ capacity: 25, sortOrder: 0, isActive: true })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.code || !form.name || !form.level) {
      toast({ title: "Validasi gagal", description: "Kode, Nama, dan Level wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/kelas/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Data kelas diperbarui" })
      } else {
        await apiPost("/api/admin/kelas", form)
        toast({ title: "Berhasil", description: "Kelas baru ditambahkan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit Kelas" : "Tambah Kelas Baru"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Kode *</Label>
            <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MDA-1A" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Level *</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Level" /></SelectTrigger>
              <SelectContent>
                {KELAS_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nama Kelas *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kelas 1 Madrasah Awwaliyah A" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi</Label>
            <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kapasitas</Label>
            <Input type="number" value={form.capacity || ""} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Urutan</Label>
            <Input type="number" value={form.sortOrder || 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Wali Kelas</Label>
            <Select value={form.waliKelasId} onValueChange={(v) => setForm({ ...form, waliKelasId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Wali Kelas" /></SelectTrigger>
              <SelectContent>
                {guruList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
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

function KelasDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet(`/api/admin/kelas/${id}`)
      setData(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return <ListSkeleton items={4} className="py-20" />
  if (error || !data) return <ErrorState message={error || "Data tidak ditemukan"} onRetry={load} />

  return (
    <div>
      <Breadcrumb items={[{ label: "Data Kelas", onClick: () => selectEntity(null) }, { label: data.name }]} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <School className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline">{data.code}</Badge>
            <Badge variant="outline">{data.level}</Badge>
            <Badge variant="secondary"><Users className="h-3 w-3 mr-1" /> {data._count?.santri || 0} santri</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => selectEntity(null)}><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Informasi Kelas</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Kapasitas</p><p className="font-medium">{data.capacity} santri</p></div>
              <div><p className="text-xs text-muted-foreground">Wali Kelas</p><p className="font-medium">{data.waliKelas?.name || "-"}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Santri</p><p className="font-medium">{data.santri?.length || 0}</p></div>
              <div><p className="text-xs text-muted-foreground">Sisa Kapasitas</p><p className="font-medium">{data.capacity - (data.santri?.length || 0)}</p></div>
            </div>
            {data.description && <div className="pt-2 border-t"><p className="text-xs text-muted-foreground">Deskripsi</p><p className="text-sm">{data.description}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Jadwal Pelajaran</CardTitle></CardHeader>
          <CardContent>
            {data.jadwal?.length === 0 ? <EmptyState title="Belum ada jadwal" /> : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-2">
                {data.jadwal.map((j: any) => (
                  <div key={j.id} className="flex items-center gap-2 p-2 rounded border bg-card text-sm">
                    <div className="w-12 text-xs text-muted-foreground">{["", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Ahad"][j.dayOfWeek]}</div>
                    <div className="font-mono text-xs">{j.startTime}-{j.endTime}</div>
                    <div className="flex-1 truncate">{j.mapel?.name}</div>
                    <Badge variant="outline" className="text-xs">{j.guru?.name?.split(" ").slice(0, 2).join(" ") || "-"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Daftar Santri</CardTitle></CardHeader>
        <CardContent>
          {data.santri?.length === 0 ? <EmptyState title="Belum ada santri" /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>L/P</TableHead>
                    <TableHead>Wali</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.santri.map((s: any) => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectEntity(s.id, "santri")}>
                      <TableCell className="font-mono text-xs">{s.nis}</TableCell>
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell><Badge variant="outline">{s.gender}</Badge></TableCell>
                      <TableCell className="text-sm">{s.wali?.name || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
