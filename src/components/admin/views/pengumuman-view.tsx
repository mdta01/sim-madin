"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
import { Breadcrumb } from "@/components/admin/shared/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AUDIENCE_TYPES, formatDate } from "@/lib/constants"
import { Megaphone, Plus, Pencil, Trash2, ArrowLeft, Eye, Calendar, Users } from "lucide-react"

export function PengumumanView() {
  const selectedId = useAdminStore((s) => s.selectedEntityId)
  if (selectedId) return <PengumumanDetail id={selectedId} />
  return <PengumumanList />
}

function PengumumanList() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [audienceFilter, setAudienceFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (audienceFilter) params.audience = audienceFilter
      const res = await apiGet("/api/admin/pengumuman", params)
      setData(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [audienceFilter])

  useEffect(() => { load() }, [load])

  const filteredData = data.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pengumuman ini?")) return
    try {
      await apiDelete(`/api/admin/pengumuman/${id}`)
      toast({ title: "Berhasil", description: "Pengumuman dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Pengumuman"
        description="Kelola pengumuman untuk seluruh pengguna aplikasi"
        icon={<Megaphone className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Buat Pengumuman</Button>}
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari judul atau isi..."
        filters={
          <Select value={audienceFilter} onValueChange={(v) => setAudienceFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Semua Target" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Target</SelectItem>
              {AUDIENCE_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            filteredData.length === 0 ? <EmptyState icon={<Megaphone className="h-5 w-5" />} title="Belum ada pengumuman" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[280px]">Judul</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Prioritas</TableHead>
                    <TableHead>Dipublikasi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectEntity(p.id)}>
                      <TableCell>
                        <p className="font-medium text-sm">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{p.content}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline">{AUDIENCE_TYPES.find(a => a.value === p.audience)?.label || p.audience}</Badge></TableCell>
                      <TableCell><StatusBadge status={p.priority} /></TableCell>
                      <TableCell className="text-xs">{formatDate(p.publishedAt, true)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(p); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <PengumumanForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} />
    </div>
  )
}

function PengumumanForm({ open, onOpenChange, editing, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ audience: "ALL", priority: "NORMAL", isPublished: true })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ audience: "ALL", priority: "NORMAL", isPublished: true })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.title || !form.content || !form.audience) {
      toast({ title: "Validasi gagal", description: "Judul, Konten, dan Target wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/pengumuman/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Pengumuman diperbarui" })
      } else {
        await apiPost("/api/admin/pengumuman", form)
        toast({ title: "Berhasil", description: "Pengumuman dibuat" })
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
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Edit Pengumuman" : "Buat Pengumuman Baru"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Judul *</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Audiens *</Label>
            <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCE_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prioritas</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="PENTING">Penting</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Konten *</Label>
            <Textarea value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Berakhir (opsional)</Label>
            <Input type="date" value={form.expiresAt ? new Date(form.expiresAt).toISOString().split("T")[0] : ""} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </div>
          <div className="flex items-end gap-2">
            <input type="checkbox" id="isPub" checked={form.isPublished !== false} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="rounded" />
            <Label htmlFor="isPub" className="text-xs cursor-pointer">Publikasikan segera</Label>
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

function PengumumanDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet(`/api/admin/pengumuman/${id}`)
      setData(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingState className="py-20" />
  if (error || !data) return <ErrorState message={error || "Data tidak ditemukan"} onRetry={load} />

  return (
    <div className="max-w-3xl mx-auto">
      <Breadcrumb items={[{ label: "Pengumuman", onClick: () => selectEntity(null) }, { label: data.title }]} />
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{data.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{AUDIENCE_TYPES.find(a => a.value === data.audience)?.label || data.audience}</Badge>
                <StatusBadge status={data.priority} />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => selectEntity(null)}><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Kembali</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-b pb-3">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(data.publishedAt, true)}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {data.createdBy?.name || "Sistem"}</span>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.content}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
