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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { DAYS } from "@/lib/constants"
import { formatDate } from "@/lib/constants"
import { UserCog, Plus, Pencil, Trash2, ArrowLeft, Phone, Mail, Calendar, Briefcase, BookOpen, School, ClipboardList } from "lucide-react"

export function GuruView() {
  const selectedId = useAdminStore((s) => s.selectedEntityId)
  if (selectedId) return <GuruDetail id={selectedId} />
  return <GuruList />
}

function GuruList() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const res = await apiGet("/api/admin/guru", params)
      setData(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data guru ini?")) return
    try {
      await apiDelete(`/api/admin/guru/${id}`)
      toast({ title: "Berhasil", description: "Guru telah dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Data Guru"
        description="Kelola data guru dan wali kelas"
        icon={<UserCog className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Guru</Button>}
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama, NIP, no HP..."
        filters={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="AKTIF">Aktif</SelectItem>
              <SelectItem value="CUTI">Cuti</SelectItem>
              <SelectItem value="KELUAR">Keluar</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<UserCog className="h-5 w-5" />} title="Belum ada data guru" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Guru</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Spesialisasi</TableHead>
                    <TableHead>Wali Kelas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((g) => (
                    <TableRow key={g.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectEntity(g.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{g.name[0]}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-medium text-sm">{g.name}</p>
                            <p className="text-[11px] text-muted-foreground">{g.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{g.nip || "-"}</TableCell>
                      <TableCell className="text-sm">{g.specialization || "-"}</TableCell>
                      <TableCell>
                        {g.kelasWali && g.kelasWali.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {g.kelasWali.map((k: any) => <Badge key={k.id} variant="secondary" className="text-xs">{k.code}</Badge>)}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell><StatusBadge status={g.status} /></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(g); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <GuruForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSuccess={load} />
    </div>
  )
}

function GuruForm({ open, onOpenChange, editing, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm({
      ...editing,
      birthDate: editing.birthDate ? new Date(editing.birthDate).toISOString().split("T")[0] : "",
      joinDate: editing.joinDate ? new Date(editing.joinDate).toISOString().split("T")[0] : "",
    })
    else setForm({ gender: "L", status: "AKTIF" })
  }, [editing, open])

  const handleSave = async () => {
    if (!form.name || !form.gender) {
      toast({ title: "Validasi gagal", description: "Nama dan Jenis Kelamin wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/guru/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Data guru diperbarui" })
      } else {
        await apiPost("/api/admin/guru", form)
        toast({ title: "Berhasil", description: "Guru baru ditambahkan" })
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Guru" : "Tambah Guru Baru"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nama Lengkap *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ustadz/Ustadzah ..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jenis Kelamin *</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Laki-laki</SelectItem>
                <SelectItem value="P">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">NIP</Label>
            <Input value={form.nip || ""} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">NUPTK</Label>
            <Input value={form.nuptk || ""} onChange={(e) => setForm({ ...form, nuptk: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">No. HP</Label>
            <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Spesialisasi</Label>
            <Input value={form.specialization || ""} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Tajwid, Fiqih, dll" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tempat Lahir</Label>
            <Input value={form.birthPlace || ""} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Lahir</Label>
            <Input type="date" value={form.birthDate || ""} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Bergabung</Label>
            <Input type="date" value={form.joinDate || ""} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AKTIF">Aktif</SelectItem>
                <SelectItem value="CUTI">Cuti</SelectItem>
                <SelectItem value="KELUAR">Keluar</SelectItem>
              </SelectContent>
            </Select>
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

function GuruDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet(`/api/admin/guru/${id}`)
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
      <Breadcrumb items={[{ label: "Data Guru", onClick: () => selectEntity(null) }, { label: data.name }]} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <Avatar className="h-20 w-20"><AvatarFallback className="bg-primary/10 text-primary text-2xl">{data.name[0]}</AvatarFallback></Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline">{data.nip || "Tanpa NIP"}</Badge>
            <StatusBadge status={data.status} />
            {data.specialization && <Badge variant="secondary">{data.specialization}</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={() => selectEntity(null)}><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Informasi Pribadi</p>
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="No. HP" value={data.phone || "-"} />
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={data.email || "-"} />
            <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Tanggal Lahir" value={data.birthDate ? `${data.birthPlace}, ${formatDate(data.birthDate)}` : "-"} />
            <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Bergabung Sejak" value={data.joinDate ? formatDate(data.joinDate) : "-"} />
            <InfoRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Alamat" value={data.address || "-"} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Statistik Mengajar</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded bg-muted/50">
                <School className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="font-bold text-lg">{data.kelasWali?.length || 0}</p>
                <p className="text-[11px] text-muted-foreground">Wali Kelas</p>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <BookOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="font-bold text-lg">{data.jadwal?.length || 0}</p>
                <p className="text-[11px] text-muted-foreground">Jadwal</p>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <ClipboardList className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="font-bold text-lg">{data._count?.nilai || 0}</p>
                <p className="text-[11px] text-muted-foreground">Input Nilai</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.kelasWali && data.kelasWali.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Kelas yang Diampu sebagai Wali Kelas</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.kelasWali.map((k: any) => (
                <button key={k.id} onClick={() => selectEntity(k.id, "kelas")} className="text-left">
                  <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">{k.name}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.jadwal && data.jadwal.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Jadwal Mengajar</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hari</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.jadwal.map((j: any) => (
                    <TableRow key={j.id}>
                      <TableCell className="text-sm">{DAYS.find((d) => d.value === j.dayOfWeek)?.label || "-"}</TableCell>
                      <TableCell className="text-xs font-mono">{j.startTime} - {j.endTime}</TableCell>
                      <TableCell className="text-sm">{j.kelas?.name}</TableCell>
                      <TableCell className="text-sm">{j.mapel?.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
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
