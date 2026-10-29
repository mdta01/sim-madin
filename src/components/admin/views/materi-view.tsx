"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import { MATERI_TYPES } from "@/lib/constants"
import { formatDate } from "@/lib/constants"
import { FolderOpen, Plus, Pencil, Trash2, FileText, Image as ImageIcon, Video, Link as LinkIcon, Loader2, Upload, ExternalLink } from "lucide-react"

const TYPE_ICON: Record<string, any> = {
  DOKUMEN: FileText,
  FOTO: ImageIcon,
  VIDEO: Video,
  LINK: LinkIcon,
  AUDIO: FileText,
}

export function MateriView() {
  const [data, setData] = useState<any[]>([])
  const [mapelList, setMapelList] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
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
      const [res, mapelRes, kelasRes, guruRes] = await Promise.all([
        apiGet("/api/admin/materi", params),
        apiGet("/api/admin/mapel"),
        apiGet("/api/admin/kelas"),
        apiGet("/api/admin/guru"),
      ])
      setData(res.data)
      setMapelList(mapelRes.data)
      setKelasList(kelasRes.data)
      setGuruList(guruRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, mapelFilter, typeFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus materi ini? Materi yang sudah terhubung ke tugas tetap aman.")) return
    try {
      await apiDelete(`/api/admin/materi/${id}`)
      toast({ title: "Berhasil", description: "Materi telah dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Materi Pembelajaran"
        description="Kelola materi PDF, foto, video per mata pelajaran"
        icon={<FolderOpen className="h-5 w-5" />}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Materi</Button>}
      />
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari judul materi..."
        filters={
          <>
            <Select value={mapelFilter} onValueChange={(v) => setMapelFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {mapelList.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {MATERI_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<FolderOpen className="h-5 w-5" />} title="Belum ada materi" description="Tambahkan materi pertama untuk mata pelajaran." /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Judul</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Pertemuan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dipublikasi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((m) => {
                    const Icon = TYPE_ICON[m.type] || FileText
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{m.title}</p>
                              {m.description && <p className="text-xs text-muted-foreground truncate max-w-[280px]">{m.description}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{MATERI_TYPES.find(t => t.value === m.type)?.label || m.type}</Badge></TableCell>
                        <TableCell className="text-sm">{m.mapel?.name || "-"}</TableCell>
                        <TableCell className="text-sm">{m.kelas?.name || <span className="text-muted-foreground italic">Semua</span>}</TableCell>
                        <TableCell className="text-center">{m.pertemuan ? <Badge variant="secondary">#{m.pertemuan}</Badge> : "-"}</TableCell>
                        <TableCell>{m.isPublished ? <Badge variant="success">Terbit</Badge> : <Badge variant="secondary">Draft</Badge>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(m.publishedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(m); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      <MateriForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSuccess={load}
        mapelList={mapelList}
        kelasList={kelasList}
        guruList={guruList}
      />
    </div>
  )
}

function MateriForm({ open, onOpenChange, editing, onSuccess, mapelList, kelasList, guruList }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: any | null
  onSuccess: () => void
  mapelList: any[]
  kelasList: any[]
  guruList: any[]
}) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) setForm(editing)
    else setForm({ type: "DOKUMEN", sortOrder: 0, isPublished: true, kelasId: "all" })
  }, [editing, open])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimum 5 MB. Untuk video gunakan tipe LINK.", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("prefix", "materi")
      const res = await apiPost<{ url: string }>("/api/admin/upload", formData)
      setForm((f: any) => ({ ...f, fileUrl: res.url }))
      toast({ title: "File terunggah", description: file.name })
    } catch (err: any) {
      toast({ title: "Upload gagal", description: err.message, variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (!form.title || !form.mapelId) {
      toast({ title: "Validasi gagal", description: "Judul dan Mata Pelajaran wajib diisi", variant: "destructive" })
      return
    }
    if (form.type === "LINK" && !form.externalUrl) {
      toast({ title: "Validasi gagal", description: "URL eksternal wajib diisi untuk tipe LINK", variant: "destructive" })
      return
    }
    if ((form.type === "DOKUMEN" || form.type === "FOTO" || form.type === "AUDIO") && !form.fileUrl && !editing) {
      toast({ title: "Validasi gagal", description: "File wajib diupload untuk tipe ini", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.kelasId === "all" || !payload.kelasId) payload.kelasId = null
      if (editing) {
        await apiPut(`/api/admin/materi/${editing.id}`, payload)
        toast({ title: "Berhasil", description: "Materi diperbarui" })
      } else {
        await apiPost("/api/admin/materi", payload)
        toast({ title: "Berhasil", description: "Materi baru ditambahkan" })
      }
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const showFileUpload = ["DOKUMEN", "FOTO", "AUDIO"].includes(form.type)
  const showExternalUrl = form.type === "LINK" || form.type === "VIDEO"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Materi" : "Tambah Materi Pembelajaran"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Judul Materi *</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mis: Hukum Tajwid - Mad Thabi'i" />
          </div>
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
            <Label className="text-xs">Tipe Materi</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, fileUrl: null, externalUrl: null })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERI_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kelas (kosongkan = semua kelas)</Label>
            <Select value={form.kelasId || "all"} onValueChange={(v) => setForm({ ...form, kelasId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pertemuan ke- (opsional)</Label>
            <Input type="number" value={form.pertemuan || ""} onChange={(e) => setForm({ ...form, pertemuan: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Guru Pengampu</Label>
            <Select value={form.guruId || "none"} onValueChange={(v) => setForm({ ...form, guruId: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {guruList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Urutan</Label>
            <Input type="number" value={form.sortOrder || 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ringkasan materi, kompetensi yang dicapai..."
              rows={3}
            />
          </div>

          {showFileUpload && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">File Upload (PDF/JPG/PNG, maks 5 MB) *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={form.type === "FOTO" ? "image/jpeg,image/png,image/webp" : form.type === "AUDIO" ? "audio/mpeg,audio/mp3" : "application/pdf"}
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                  {uploading ? "Mengunggah..." : "Pilih File"}
                </Button>
                {form.fileUrl && (
                  <Badge variant="success" className="gap-1">
                    <FileText className="h-3 w-3" /> File terpilih
                  </Badge>
                )}
              </div>
              {form.fileUrl && (
                <a href={form.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                  <ExternalLink className="h-3 w-3" /> Lihat file
                </a>
              )}
            </div>
          )}

          {showExternalUrl && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">URL Eksternal * {form.type === "VIDEO" && "(YouTube/Google Drive/dll)"}</Label>
              <Input
                value={form.externalUrl || ""}
                onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                placeholder={form.type === "VIDEO" ? "https://youtube.com/watch?v=..." : "https://..."}
              />
              <p className="text-[10px] text-muted-foreground">Untuk video besar, gunakan link YouTube/Drive. File lokal dibatasi 5 MB.</p>
            </div>
          )}

          <div className="flex items-center gap-2 sm:col-span-2 pt-2">
            <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} id="materi-publish" />
            <Label htmlFor="materi-publish" className="text-sm cursor-pointer">Publikasikan (terlihat wali & santri)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
