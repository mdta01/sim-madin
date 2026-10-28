"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/constants"
import { CalendarDays, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react"

export function TahunAjaranView() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet("/api/admin/tahun-ajaran")
      setData(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSetActive = async (id: string) => {
    if (!confirm("Jadikan tahun ajaran ini sebagai aktif? Tahun ajaran lain akan dinonaktifkan.")) return
    try {
      await apiPut(`/api/admin/tahun-ajaran/${id}`, { isActive: true })
      toast({ title: "Berhasil", description: "Tahun ajaran aktif diperbarui" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus tahun ajaran ini? Semua data terkait akan ikut terhapus.")) return
    try {
      await apiDelete(`/api/admin/tahun-ajaran/${id}`)
      toast({ title: "Berhasil", description: "Tahun ajaran dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Tahun Ajaran & Semester"
        description="Kelola tahun ajaran dan semester madrasah"
        icon={<CalendarDays className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah TA</Button>}
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Belum ada tahun ajaran" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead className="min-w-[200px]">Nama</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-center">Semester</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((ta) => (
                    <TableRow key={ta.id}>
                      <TableCell className="font-mono text-xs">{ta.code}</TableCell>
                      <TableCell className="font-medium text-sm">{ta.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(ta.startDate)} - {formatDate(ta.endDate)}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{ta._count?.semesters || 0}</Badge></TableCell>
                      <TableCell className="text-center">
                        {ta.isActive ? <StatusBadge status="AKTIF" /> : <Badge variant="outline">Nonaktif</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!ta.isActive && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleSetActive(ta.id)} title="Jadikan Aktif">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(ta); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(ta.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <TaForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} />
    </div>
  )
}

function TaForm({ open, onOpenChange, editing, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        startDate: editing.startDate ? new Date(editing.startDate).toISOString().split("T")[0] : "",
        endDate: editing.endDate ? new Date(editing.endDate).toISOString().split("T")[0] : "",
      })
    } else {
      const year = new Date().getFullYear()
      setForm({
        code: `${year}/${year + 1}`,
        name: `Tahun Ajaran ${year}/${year + 1}`,
        startDate: `${year}-07-15`,
        endDate: `${year + 1}-06-14`,
        isActive: false,
        createSemesters: true,
      })
    }
  }, [editing, open])

  const handleSave = async () => {
    if (!form.code || !form.name || !form.startDate || !form.endDate) {
      toast({ title: "Validasi gagal", description: "Semua field wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/tahun-ajaran/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Tahun ajaran diperbarui" })
      } else {
        await apiPost("/api/admin/tahun-ajaran", form)
        toast({ title: "Berhasil", description: "Tahun ajaran baru ditambahkan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit Tahun Ajaran" : "Tambah Tahun Ajaran"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Kode *</Label>
            <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="2025/2026" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nama *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Mulai *</Label>
            <Input type="date" value={form.startDate || ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Selesai *</Label>
            <Input type="date" value={form.endDate || ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          {!editing && (
            <div className="sm:col-span-2 flex items-center gap-2 mt-2">
              <input type="checkbox" id="createSem" checked={form.createSemesters !== false} onChange={(e) => setForm({ ...form, createSemesters: e.target.checked })} className="rounded" />
              <Label htmlFor="createSem" className="text-xs cursor-pointer">Buat otomatis Semester Ganjil & Genap</Label>
            </div>
          )}
          {editing && (
            <div className="sm:col-span-2 flex items-center gap-2 mt-2">
              <input type="checkbox" id="isActive" checked={form.isActive || false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <Label htmlFor="isActive" className="text-xs cursor-pointer">Jadikan tahun ajaran aktif</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
