"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Breadcrumb } from "@/components/admin/shared/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Users, Plus, Pencil, Trash2, ArrowLeft, Phone, Mail, Briefcase, MapPin, GraduationCap } from "lucide-react"

export function WaliView() {
  const selectedId = useAdminStore((s) => s.selectedEntityId)
  if (selectedId) return <WaliDetail id={selectedId} />
  return <WaliList />
}

function WaliList() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet("/api/admin/wali", search ? { search } : {})
      setData(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data wali ini?")) return
    try {
      await apiDelete(`/api/admin/wali/${id}`)
      toast({ title: "Berhasil", description: "Wali telah dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Data Wali Santri"
        description="Satu wali dapat memiliki beberapa anak santri"
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Wali
          </Button>
        }
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama, no HP, email..."
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<Users className="h-5 w-5" />} title="Belum ada data wali" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Wali</TableHead>
                    <TableHead>No. HP</TableHead>
                    <TableHead>Pekerjaan</TableHead>
                    <TableHead>Hubungan</TableHead>
                    <TableHead className="text-center">Jml Santri</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((w) => (
                    <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectEntity(w.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{w.name[0]}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-medium text-sm">{w.name}</p>
                            <p className="text-[11px] text-muted-foreground">{w.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{w.phone}</TableCell>
                      <TableCell className="text-sm">{w.occupation || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{w.relationship}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{w._count?.santri || 0}</Badge></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(w); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <WaliForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} />
    </div>
  )
}

function WaliForm({ open, onOpenChange, editing, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ relationship: "AYAH" })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.name || !form.phone) {
      toast({ title: "Validasi gagal", description: "Nama dan No. HP wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/wali/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Data wali diperbarui" })
      } else {
        await apiPost("/api/admin/wali", form)
        toast({ title: "Berhasil", description: "Wali baru ditambahkan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit Wali" : "Tambah Wali Santri"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nama Lengkap *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">No. HP *</Label>
            <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">NIK</Label>
            <Input value={form.nik || ""} onChange={(e) => setForm({ ...form, nik: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hubungan</Label>
            <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AYAH">Ayah</SelectItem>
                <SelectItem value="IBU">Ibu</SelectItem>
                <SelectItem value="WALI">Wali</SelectItem>
                <SelectItem value="KAKEK">Kakek</SelectItem>
                <SelectItem value="NENEK">Nenek</SelectItem>
                <SelectItem value="PAMAN">Paman</SelectItem>
                <SelectItem value="BIBI">Bibi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Pekerjaan</Label>
            <Input value={form.occupation || ""} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Alamat</Label>
            <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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

function WaliDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet(`/api/admin/wali/${id}`)
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
    <div>
      <Breadcrumb items={[{ label: "Data Wali", onClick: () => selectEntity(null) }, { label: data.name }]} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <Avatar className="h-20 w-20"><AvatarFallback className="bg-primary/10 text-primary text-2xl">{data.name[0]}</AvatarFallback></Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <Badge variant="secondary" className="mt-1">{data.relationship}</Badge>
        </div>
        <Button variant="outline" onClick={() => selectEntity(null)}><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Informasi Kontak</p>
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="No. HP" value={data.phone} />
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={data.email || "-"} />
            <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Alamat" value={data.address || "-"} />
            <InfoRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Pekerjaan" value={data.occupation || "-"} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Anak Santri ({data.santri?.length || 0})</p>
            {data.santri?.length === 0 ? <EmptyState title="Belum ada anak terdaftar" /> : (
              <div className="space-y-2">
                {data.santri.map((s: any) => (
                  <button key={s.id} onClick={() => selectEntity(s.id, "santri")} className="w-full flex items-center gap-2 p-2 rounded border bg-card hover:bg-muted/30 text-left">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{s.name[0]}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.nis} • {s.kelas?.name || "Tanpa Kelas"}</p>
                    </div>
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>
    </div>
  )
}
