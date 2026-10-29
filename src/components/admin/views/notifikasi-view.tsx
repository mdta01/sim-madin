"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
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
import { NOTIFIKASI_TYPES, formatDate } from "@/lib/constants"
import {
  Bell,
  Plus,
  Trash2,
  CheckCheck,
  Mail,
  CheckCircle2,
  Loader2,
  Megaphone,
  AlertCircle,
} from "lucide-react"

export function NotifikasiView() {
  const [data, setData] = useState<any[]>([])
  const [stats, setStats] = useState<{ totalAll: number; totalUnread: number }>({
    totalAll: 0,
    totalUnread: 0,
  })
  const [waliList, setWaliList] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [isReadFilter, setIsReadFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (search) params.search = search
      if (typeFilter) params.type = typeFilter
      if (isReadFilter) params.isRead = isReadFilter
      const [res, waliRes, santriRes] = await Promise.all([
        apiGet("/api/admin/notifikasi", params),
        apiGet("/api/admin/wali"),
        apiGet("/api/admin/santri"),
      ])
      setData(res.data || [])
      setStats(
        res.stats || { totalAll: res.data?.length || 0, totalUnread: 0 }
      )
      setWaliList(waliRes.data || [])
      setSantriList(santriRes.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, isReadFilter])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus notifikasi ini?")) return
    try {
      await apiDelete(`/api/admin/notifikasi/${id}`)
      toast({ title: "Berhasil", description: "Notifikasi dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleMarkAllRead = async () => {
    if (stats.totalUnread === 0) {
      toast({ title: "Info", description: "Tidak ada notifikasi belum dibaca" })
      return
    }
    if (!confirm(`Tandai ${stats.totalUnread} notifikasi sebagai sudah dibaca?`)) return
    setMarkingAll(true)
    try {
      await apiPost("/api/admin/notifikasi/mark-all-read", {})
      toast({
        title: "Berhasil",
        description: "Semua notifikasi ditandai dibaca",
      })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setMarkingAll(false)
    }
  }

  const totalRead = stats.totalAll - stats.totalUnread

  return (
    <div>
      <PageHeader
        title="Notifikasi"
        description="Kelola & kirim notifikasi otomatis ke wali santri"
        icon={<Bell className="h-5 w-5" />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleMarkAllRead}
              disabled={markingAll || stats.totalUnread === 0}
            >
              {markingAll ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-1" />
              )}
              Tandai Semua Dibaca
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Kirim Notifikasi
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Notifikasi</p>
              <p className="text-2xl font-bold truncate">{stats.totalAll}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Belum Dibaca</p>
              <p className="text-2xl font-bold truncate">{stats.totalUnread}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Sudah Dibaca</p>
              <p className="text-2xl font-bold truncate">{totalRead}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari judul atau pesan notifikasi..."
        filters={
          <>
            <Select
              value={typeFilter || "all"}
              onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {NOTIFIKASI_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={isReadFilter || "all"}
              onValueChange={(v) => setIsReadFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status Baca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="false">Belum Dibaca</SelectItem>
                <SelectItem value="true">Sudah Dibaca</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-5 w-5" />}
              title="Belum ada notifikasi"
              description="Kirim notifikasi pertama ke wali santri."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[280px]">Judul & Pesan</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Prioritas</TableHead>
                    <TableHead>Wali</TableHead>
                    <TableHead>Santri</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((n) => (
                    <TableRow
                      key={n.id}
                      className={
                        !n.isRead
                          ? "bg-amber-50/40 dark:bg-amber-950/10"
                          : ""
                      }
                    >
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {!n.isRead && (
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[280px]">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {NOTIFIKASI_TYPES.find((t) => t.value === n.type)
                            ?.label || n.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={n.priority} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {n.wali ? (
                          <span>{n.wali.name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Broadcast
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {n.santri ? (
                          <span>{n.santri.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {n.isRead ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Dibaca
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <Mail className="h-3 w-3" /> Baru
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(n.createdAt, true)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(n.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NotifikasiForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={load}
        waliList={waliList}
        santriList={santriList}
      />
    </div>
  )
}

function NotifikasiForm({
  open,
  onOpenChange,
  onSuccess,
  waliList,
  santriList,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
  waliList: any[]
  santriList: any[]
}) {
  const [form, setForm] = useState<any>({
    type: "CUSTOM",
    priority: "NORMAL",
    broadcast: false,
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setForm({
        type: "CUSTOM",
        priority: "NORMAL",
        broadcast: false,
        title: "",
        message: "",
        waliId: null,
        santriId: null,
      })
    }
  }, [open])

  const handleSave = async () => {
    if (!form.title || !form.message) {
      toast({
        title: "Validasi gagal",
        description: "Judul dan Pesan wajib diisi",
        variant: "destructive",
      })
      return
    }
    if (!form.broadcast && !form.waliId) {
      toast({
        title: "Validasi gagal",
        description: "Pilih wali atau aktifkan broadcast",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        type: form.type,
        title: form.title,
        message: form.message,
        priority: form.priority,
        broadcast: !!form.broadcast,
      }
      if (!form.broadcast) {
        payload.waliId = form.waliId
        payload.santriId = form.santriId || null
      }
      await apiPost("/api/admin/notifikasi", payload)
      toast({
        title: "Berhasil",
        description: form.broadcast
          ? "Notifikasi dikirim ke semua wali aktif"
          : "Notifikasi terkirim ke wali",
      })
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const selectedTypeTemplate =
    NOTIFIKASI_TYPES.find((t) => t.value === form.type)?.template || ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Kirim Notifikasi ke Wali
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Judul *</Label>
            <Input
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Mis: Pengumuman Libur Hari Raya"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tipe Notifikasi</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFIKASI_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTypeTemplate && (
              <p className="text-[10px] text-muted-foreground italic">
                Template: {selectedTypeTemplate}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Prioritas</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="PENTING">Penting</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Pesan *</Label>
            <Textarea
              value={form.message || ""}
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
              placeholder="Tulis isi notifikasi yang akan diterima wali..."
              rows={4}
            />
          </div>

          <div className="flex items-start gap-2 sm:col-span-2 p-3 rounded-md bg-muted/30 border">
            <Switch
              checked={form.broadcast}
              onCheckedChange={(v) =>
                setForm({ ...form, broadcast: v })
              }
              id="notif-broadcast"
            />
            <Label
              htmlFor="notif-broadcast"
              className="text-sm cursor-pointer"
            >
              Broadcast ke Semua Wali Aktif
              <span className="block text-[10px] text-muted-foreground">
                Aktifkan untuk kirim ke seluruh wali. Matikan untuk pilih wali
                spesifik.
              </span>
            </Label>
          </div>

          {!form.broadcast && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Wali *</Label>
                <Select
                  value={form.waliId || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, waliId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Wali" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Pilih Wali —</SelectItem>
                    {waliList.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                        {w.phone ? ` (${w.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Santri (opsional)</Label>
                <Select
                  value={form.santriId || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, santriId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Santri" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {santriList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.nis ? ` (${s.nis})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {form.priority === "URGENT" && (
            <div className="sm:col-span-2 flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Notifikasi urgent akan menampilkan badge merah di app wali
                santri. Pastikan isi pesan benar-benar mendesak.
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Mengirim...
              </>
            ) : (
              <>
                <Megaphone className="h-4 w-4 mr-1" /> Kirim Notifikasi
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
