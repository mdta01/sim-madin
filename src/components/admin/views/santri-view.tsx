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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { GENDER_LABELS, KELAS_LEVELS, formatDate, formatRupiah } from "@/lib/constants"
import { GraduationCap, Plus, Pencil, Trash2, ArrowLeft, User, Users, Phone, MapPin, Calendar, BookOpen, Wallet, FileText, ClipboardCheck } from "lucide-react"
import { PhotoUpload } from "@/components/admin/shared/photo-upload"

export function SantriView() {
  const selectedId = useAdminStore((s) => s.selectedEntityId)
  if (selectedId) return <SantriDetail id={selectedId} />
  return <SantriList />
}

function SantriList() {
  const [data, setData] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [kelasFilter, setKelasFilter] = useState("")
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
      if (kelasFilter) params.kelasId = kelasFilter
      if (statusFilter) params.status = statusFilter
      const [res, kelasRes] = await Promise.all([
        apiGet("/api/admin/santri", params),
        apiGet("/api/admin/kelas"),
      ])
      setData(res.data)
      setKelasList(kelasRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, kelasFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data santri ini? (soft delete)")) return
    try {
      await apiDelete(`/api/admin/santri/${id}`)
      toast({ title: "Berhasil", description: "Santri telah dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Data Santri"
        description="Kelola seluruh data santri madrasah"
        icon={<GraduationCap className="h-5 w-5" />}
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Santri
          </Button>
        }
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama, NIS, NISN..."
        filters={
          <>
            <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="AKTIF">Aktif</SelectItem>
                <SelectItem value="LULUS">Lulus</SelectItem>
                <SelectItem value="PINDAH">Pindah</SelectItem>
                <SelectItem value="KELUAR">Keluar</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="Belum ada data santri" description="Tambahkan data santri pertama Anda" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Santri</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>L/P</TableHead>
                    <TableHead>Wali</TableHead>
                    <TableHead>Status Wali</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectEntity(s.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover" />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">{s.name[0]}</AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground">{s.birthPlace}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.nis}</TableCell>
                      <TableCell>{s.kelas?.name || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{s.gender}</Badge></TableCell>
                      <TableCell className="text-xs">
                        <p>{s.wali?.name || "-"}</p>
                        <p className="text-muted-foreground">{s.wali?.phone}</p>
                      </TableCell>
                      <TableCell>
                        {s.wali ? (
                          <Badge
                            variant="outline"
                            className={
                              s.wali.activationStatus === "ACTIVE" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                              s.wali.activationStatus === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                              s.wali.activationStatus === "PENDING_NO_PHONE" ? "bg-orange-100 text-orange-700 border-orange-200" :
                              s.wali.activationStatus === "SUSPENDED" ? "bg-red-100 text-red-700 border-red-200" :
                              ""
                            }
                            title={s.wali.activationStatus}
                          >
                            {s.wali.activationStatus === "ACTIVE" ? "✓ Aktif" :
                              s.wali.activationStatus === "PENDING" ? "⏳ Pending" :
                              s.wali.activationStatus === "PENDING_NO_PHONE" ? "⚠️ No WA" :
                              s.wali.activationStatus === "SUSPENDED" ? "🚫 Suspended" :
                              s.wali.activationStatus}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(s); setDialogOpen(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      <SantriForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        kelasList={kelasList}
        onSuccess={load}
      />
    </div>
  )
}

function SantriForm({ open, onOpenChange, editing, kelasList, onSuccess }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: any | null
  kelasList: any[]
  onSuccess: () => void
}) {
  const [form, setForm] = useState<any>({})
  const [waliList, setWaliList] = useState<any[]>([])
  const [taList, setTaList] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      apiGet("/api/admin/wali").then((r) => setWaliList(r.data)).catch(() => {})
      apiGet("/api/admin/tahun-ajaran").then((r) => setTaList(r.data)).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        birthDate: editing.birthDate ? new Date(editing.birthDate).toISOString().split("T")[0] : "",
        entryDate: editing.entryDate ? new Date(editing.entryDate).toISOString().split("T")[0] : "",
      })
    } else {
      setForm({ gender: "L", status: "AKTIF" })
    }
  }, [editing, open])

  const handleSave = async () => {
    // Saat create, NIS opsional (auto-generate). Saat edit, NIS wajib.
    if (editing && !form.nis) {
      toast({ title: "Validasi gagal", description: "NIS wajib diisi saat edit", variant: "destructive" })
      return
    }
    if (!form.name || !form.gender) {
      toast({ title: "Validasi gagal", description: "Nama dan Jenis Kelamin wajib diisi", variant: "destructive" })
      return
    }
    // Jika createNewWali aktif, wajib isi nama wali
    if (form.createNewWali && !form.waliName) {
      toast({ title: "Validasi gagal", description: "Nama wali wajib diisi jika membuat wali baru", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/santri/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Data santri diperbarui" })
      } else {
        const result = await apiPost<any>("/api/admin/santri", form)
        // Tampilkan info NIS + aktivasi wali
        const nisInfo = result.nis ? `NIS: ${result.nis}` : ""
        let waliInfo = ""
        if (result.waliActivation) {
          const wa = result.waliActivation
          waliInfo = ` | Wali: ${wa.waliName}`
          if (wa.otpCode) {
            waliInfo += ` | OTP: ${wa.otpCode} (dev mode)`
          }
          waliInfo += ` | Aktivasi: ${wa.activationUrl}`
        }
        toast({
          title: "✅ Santri ditambahkan",
          description: `${nisInfo}${waliInfo}`.trim(),
          duration: 10000, // tampilkan lebih lama agar bisa baca OTP
        })
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
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Santri" : "Tambah Santri Baru"}</DialogTitle>
        </DialogHeader>
        <div className="mb-3 pb-3 border-b">
          <Label className="text-xs mb-2 block">Foto Profil</Label>
          <PhotoUpload
            value={form.photoUrl}
            onChange={(url) => setForm({ ...form, photoUrl: url })}
            name={form.name}
            prefix="santri"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">NIS {editing ? "*" : "(kosongkan untuk auto-generate)"}</Label>
            <Input
              value={form.nis || ""}
              onChange={(e) => setForm({ ...form, nis: e.target.value })}
              placeholder={editing ? "Wajib diisi" : "Auto: YYNNNNNN (mis. 26000001)"}
              disabled={!!editing}
            />
            {!editing && (
              <p className="text-[10px] text-muted-foreground">
                💡 NIS = identitas permanen santri. Format: 2 digit tahun + 6 digit urut.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">NISN</Label>
            <Input value={form.nisn || ""} onChange={(e) => setForm({ ...form, nisn: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nama Lengkap *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
            <Label className="text-xs">Tempat Lahir</Label>
            <Input value={form.birthPlace || ""} onChange={(e) => setForm({ ...form, birthPlace: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Lahir</Label>
            <Input type="date" value={form.birthDate || ""} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">No. HP Santri (opsional)</Label>
            <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kelas</Label>
            <Select value={form.kelasId} onValueChange={(v) => setForm({ ...form, kelasId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* WALI SECTION — pilih existing ATAU buat baru */}
          <div className="sm:col-span-2 mt-2 pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Wali Santri</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm({ ...form, createNewWali: !form.createNewWali, waliId: form.createNewWali ? form.waliId : null })}
              >
                {form.createNewWali ? "← Pilih Wali Existing" : "+ Buat Wali Baru"}
              </Button>
            </div>

            {!form.createNewWali ? (
              <Select value={form.waliId} onValueChange={(v) => setForm({ ...form, waliId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Wali Existing" /></SelectTrigger>
                <SelectContent>
                  {waliList.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {w.phone ? `(${w.phone})` : "(no WA)"} {w.activationStatus === "ACTIVE" ? "✓" : "⏳"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded border bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-xs">Nama Wali *</Label>
                  <Input
                    value={form.waliName || ""}
                    onChange={(e) => setForm({ ...form, waliName: e.target.value })}
                    placeholder="Mis. Bapak Ahmad"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">No. WhatsApp Wali</Label>
                  <Input
                    value={form.waliPhone || ""}
                    onChange={(e) => setForm({ ...form, waliPhone: e.target.value })}
                    placeholder="08xxx atau 628xxx"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Kosongkan jika wali belum punya WA. Akun akan berstatus PENDING_NO_PHONE.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hubungan</Label>
                  <Select
                    value={form.waliRelationship || "WALI"}
                    onValueChange={(v) => setForm({ ...form, waliRelationship: v })}
                  >
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
                {form.waliPhone && (
                  <p className="text-[10px] text-emerald-600 sm:col-span-3">
                    ✨ Wali akan otomatis dibuat dengan status PENDING. OTP & link aktivasi akan ditampilkan setelah santri disimpan.
                  </p>
                )}
                {!form.waliPhone && form.waliName && (
                  <p className="text-[10px] text-amber-600 sm:col-span-3">
                    ⚠️ Wali tanpa nomor WhatsApp akan dibuat dengan status PENDING_NO_PHONE. Admin bisa tambahkan nomor WA nanti.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Alamat</Label>
            <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AKTIF">Aktif</SelectItem>
                <SelectItem value="LULUS">Lulus</SelectItem>
                <SelectItem value="PINDAH">Pindah</SelectItem>
                <SelectItem value="KELUAR">Keluar</SelectItem>
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

function SantriDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("profile")
  const selectEntity = useAdminStore((s) => s.selectEntity)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet(`/api/admin/santri/${id}`)
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
      <Breadcrumb
        items={[
          { label: "Data Santri", onClick: () => selectEntity(null) },
          { label: data.name },
        ]}
      />
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <Avatar className="h-20 w-20">
          {data.photoUrl ? (
            <img src={data.photoUrl} alt={data.name} className="h-full w-full object-cover" />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">{data.name[0]}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Badge variant="outline">{data.nis}</Badge>
            <Badge variant="outline">{GENDER_LABELS[data.gender] || data.gender}</Badge>
            <StatusBadge status={data.status} />
            {data.kelas && <Badge variant="secondary">{data.kelas.name}</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={() => selectEntity(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 mb-4">
          <TabsTrigger value="profile" className="text-xs sm:text-sm"><User className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Profil</span></TabsTrigger>
          <TabsTrigger value="wali" className="text-xs sm:text-sm"><Users className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Wali</span></TabsTrigger>
          <TabsTrigger value="absensi" className="text-xs sm:text-sm"><ClipboardCheck className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Absensi</span></TabsTrigger>
          <TabsTrigger value="nilai" className="text-xs sm:text-sm"><BookOpen className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Nilai</span></TabsTrigger>
          <TabsTrigger value="tagihan" className="text-xs sm:text-sm"><Wallet className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Tagihan</span></TabsTrigger>
          <TabsTrigger value="rapor" className="text-xs sm:text-sm"><FileText className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Rapor</span></TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">Informasi Pribadi</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Tempat Lahir" value={data.birthPlace || "-"} />
              <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Tanggal Lahir" value={data.birthDate ? formatDate(data.birthDate) : "-"} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="No. HP" value={data.phone || "-"} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Alamat" value={data.address || "-"} />
              <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Tgl Masuk" value={data.entryDate ? formatDate(data.entryDate) : "-"} />
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Tahun Ajaran" value={data.tahunAjaran?.name || "-"} />
            </CardContent>
          </Card>
          {data.wali && (
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Data Wali</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Nama Wali" value={data.wali.name} />
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="No. HP" value={data.wali.phone} />
                <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Hubungan" value={data.wali.relationship} />
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Email" value={data.wali.email || "-"} />
              </CardContent>
            </Card>
          )}
          {data.wali?.santri && data.wali.santri.length > 1 && (
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Saudara di Madrasah Ini</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.wali.santri.filter((s: any) => s.id !== data.id).map((s: any) => (
                    <Badge key={s.id} variant="secondary" className="cursor-pointer" onClick={() => selectEntity(s.id)}>
                      {s.name} - {s.kelas?.name || "Tanpa Kelas"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="wali">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Wali Santri ({data.waliLinks?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(data.waliLinks?.length || 0) === 0 ? (
                <EmptyState
                  icon={<Users className="h-5 w-5" />}
                  title="Belum ada wali terhubung"
                  description="Tambah wali via form edit santri atau kelola dari menu Data Wali"
                />
              ) : (
                <div className="space-y-2">
                  {data.waliLinks.map((wl: any) => (
                    <div key={wl.id} className="flex items-center gap-3 p-3 rounded border bg-card">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {wl.wali.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{wl.wali.name}</p>
                          {wl.isPrimary && (
                            <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                              ⭐ Wali Utama
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{wl.relationship}</Badge>
                          {wl.wali.phone && (
                            <span className="text-[11px] text-muted-foreground">{wl.wali.phone}</span>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              wl.wali.activationStatus === "ACTIVE" ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]" :
                              wl.wali.activationStatus === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200 text-[10px]" :
                              wl.wali.activationStatus === "PENDING_NO_PHONE" ? "bg-orange-100 text-orange-700 border-orange-200 text-[10px]" :
                              "text-[10px]"
                            }
                          >
                            {wl.wali.activationStatus === "ACTIVE" ? "✓ Aktif" :
                              wl.wali.activationStatus === "PENDING" ? "⏳ Pending" :
                              wl.wali.activationStatus === "PENDING_NO_PHONE" ? "⚠️ No WA" :
                              wl.wali.activationStatus}
                          </Badge>
                          {!wl.canAccess && (
                            <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">
                              🚫 Akses Ditolak
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      💡 Untuk menambah wali (mis. ayah + ibu), kelola dari menu <strong>Data Wali</strong> lalu hubungkan ke santri ini.
                      Saat ini API sudah support, UI manajemen multi-wali akan ditambahkan di V1.5.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="absensi">
          <Card>
            <CardHeader><CardTitle className="text-base">Riwayat Absensi (30 Hari Terakhir)</CardTitle></CardHeader>
            <CardContent>
              {data.absensi?.length === 0 ? <EmptyState title="Belum ada absensi" /> : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-2">
                  {data.absensi.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-2 rounded border bg-card hover:bg-muted/30">
                      <span className="text-sm">{formatDate(a.date)}</span>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nilai">
          <Card>
            <CardHeader><CardTitle className="text-base">Daftar Nilai</CardTitle></CardHeader>
            <CardContent>
              {data.nilai?.length === 0 ? <EmptyState title="Belum ada nilai" /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mata Pelajaran</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Nilai</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Guru</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.nilai.map((n: any) => (
                        <TableRow key={n.id}>
                          <TableCell className="text-sm">{n.mapel?.name}</TableCell>
                          <TableCell><Badge variant="outline">{n.type}</Badge></TableCell>
                          <TableCell className="font-mono font-semibold">{n.score}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(n.assessmentDate)}</TableCell>
                          <TableCell className="text-xs">{n.guru?.name || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tagihan">
          <Card>
            <CardHeader><CardTitle className="text-base">Daftar Tagihan</CardTitle></CardHeader>
            <CardContent>
              {data.tagihan?.length === 0 ? <EmptyState title="Tidak ada tagihan" /> : (
                <div className="space-y-2">
                  {data.tagihan.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded border bg-card">
                      <div>
                        <p className="font-medium text-sm">{t.jenisTagihan?.name}</p>
                        <p className="text-xs text-muted-foreground">{t.description || formatDate(t.dueDate || t.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatRupiah(t.amount)}</p>
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rapor">
          <Card>
            <CardHeader><CardTitle className="text-base">Rapor</CardTitle></CardHeader>
            <CardContent>
              {data.rapor?.length === 0 ? <EmptyState title="Belum ada rapor" /> : (
                <div className="space-y-2">
                  {data.rapor.map((r: any) => (
                    <div key={r.id} className="p-3 rounded border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{r.semester?.name} - {r.tahunAjaran?.name}</p>
                          <p className="text-xs text-muted-foreground">{r.kelas?.name}</p>
                        </div>
                        {r.published ? <Badge variant="secondary">Sudah Terbit</Badge> : <Badge variant="outline">Draft</Badge>}
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-center">
                        <div className="p-1.5 rounded bg-muted/50"><p className="text-muted-foreground">Hadir</p><p className="font-bold text-emerald-600">{r.absensiHadir}</p></div>
                        <div className="p-1.5 rounded bg-muted/50"><p className="text-muted-foreground">Sakit</p><p className="font-bold text-amber-600">{r.absensiSakit}</p></div>
                        <div className="p-1.5 rounded bg-muted/50"><p className="text-muted-foreground">Izin</p><p className="font-bold text-blue-600">{r.absensiIzin}</p></div>
                        <div className="p-1.5 rounded bg-muted/50"><p className="text-muted-foreground">Alfa</p><p className="font-bold text-red-600">{r.absensiAlfa}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
