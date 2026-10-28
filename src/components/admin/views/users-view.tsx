"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Breadcrumb } from "@/components/admin/shared/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/constants"
import { ShieldCheck, Plus, Pencil, Trash2, ArrowLeft, User, Lock, KeyRound, CheckCircle2, XCircle } from "lucide-react"

export function UsersView() {
  const [tab, setTab] = useState("users")
  if (tab === "roles") return <RolesTab onBack={() => setTab("users")} />
  return <UsersTab onGoRoles={() => setTab("roles")} />
}

function UsersTab({ onGoRoles }: { onGoRoles: () => void }) {
  const [data, setData] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
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
      const [uRes, rRes] = await Promise.all([
        apiGet("/api/admin/users", search ? { search } : {}),
        apiGet("/api/admin/roles"),
      ])
      setData(uRes.data)
      setRoles(rRes.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Nonaktifkan user ini? User tidak bisa login tapi data tetap tersimpan.")) return
    try {
      await apiDelete(`/api/admin/users/${id}`)
      toast({ title: "Berhasil", description: "User dinonaktifkan" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="User & Hak Akses"
        description="Kelola user aplikasi dan role-nya"
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={onGoRoles}><KeyRound className="h-4 w-4 mr-1" /> Kelola Role</Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah User</Button>
          </>
        }
      />
      <DataTableToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Cari nama, email, username..." />
      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            data.length === 0 ? <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="Belum ada user" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((u) => (
                    <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectEntity(u.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{u.name?.[0]}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-medium text-sm">{u.name}</p>
                            <p className="text-[11px] text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{u.username}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.userRoles?.map((ur: any) => (
                            <Badge key={ur.role.id} variant="secondary" className="text-xs">{ur.role.name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.isActive ? <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge> : <Badge variant="destructive">Nonaktif</Badge>}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(u); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <UserForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} roles={roles} onSuccess={load} />
    </div>
  )
}

function UserForm({ open, onOpenChange, editing, roles, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; roles: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ isActive: true, roleIds: [] })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        roleIds: editing.userRoles?.map((ur: any) => ur.role.id) || [],
      })
    } else {
      setForm({ isActive: true, roleIds: [] })
    }
  }, [editing, open])

  const handleSave = async () => {
    if (!form.email || !form.username || !form.name) {
      toast({ title: "Validasi gagal", description: "Email, Username, dan Nama wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/users/${editing.id}`, form)
        toast({ title: "Berhasil", description: "User diperbarui" })
      } else {
        await apiPost("/api/admin/users", form)
        toast({ title: "Berhasil", description: "User baru ditambahkan" })
      }
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const toggleRole = (roleId: string) => {
    setForm((prev: any) => ({
      ...prev,
      roleIds: prev.roleIds?.includes(roleId)
        ? prev.roleIds.filter((r: string) => r !== roleId)
        : [...(prev.roleIds || []), roleId],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit User" : "Tambah User Baru"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nama Lengkap *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email *</Label>
            <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Username *</Label>
            <Input value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">No. HP</Label>
            <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Password {editing ? "(kosongkan jika tidak diubah)" : "*"}</Label>
            <Input type="password" placeholder="••••••••" onChange={(e) => setForm({ ...form, passwordHash: e.target.value ? `$2a$10$hash_${e.target.value}` : undefined })} />
          </div>
          <div className="space-y-1 sm:col-span-2 flex items-center gap-2 mt-2">
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            <Label className="text-xs cursor-pointer">User Aktif</Label>
          </div>
          <div className="space-y-2 sm:col-span-2 mt-2">
            <Label className="text-xs">Role & Hak Akses *</Label>
            <p className="text-[11px] text-muted-foreground">Pilih role untuk user ini. Satu user bisa punya banyak role (mis. Guru + Wali Kelas).</p>
            <div className="space-y-1.5 border rounded-md p-3 bg-muted/20">
              {roles.map((r) => (
                <label key={r.id} className="flex items-start gap-2 cursor-pointer hover:bg-muted/40 p-1.5 rounded">
                  <Checkbox checked={form.roleIds?.includes(r.id) || false} onCheckedChange={() => toggleRole(r.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.name}{r.isSystem && <Badge variant="outline" className="ml-1 text-[10px]">Sistem</Badge>}</p>
                    <p className="text-[11px] text-muted-foreground">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>
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

function RolesTab({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [rRes, pRes] = await Promise.all([
        apiGet("/api/admin/roles"),
        apiGet("/api/admin/permissions"),
      ])
      setData(rRes.data)
      setPermissions(pRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus role ini?")) return
    try {
      await apiDelete(`/api/admin/roles/${id}`)
      toast({ title: "Berhasil", description: "Role dihapus" })
      load()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div>
      <PageHeader
        title="Manajemen Role"
        description="Kelola role dan permission matrix"
        icon={<KeyRound className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" /> Tambah Role</Button>
          </>
        }
      />
      {loading ? <LoadingState /> :
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {r.name}
                      {r.isSystem && <Badge variant="outline" className="text-[10px]">Sistem</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(r); setDialogOpen(true) }}><Pencil className="h-3 w-3" /></Button>
                    {!r.isSystem && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary">{r._count?.userRoles || 0} user</Badge>
                  <Badge variant="secondary">{r._count?.permissions || r.permissions?.length || 0} permission</Badge>
                </div>
                {r.permissions && r.permissions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {r.permissions.slice(0, 8).map((rp: any) => (
                      <Badge key={rp.permission.id} variant="outline" className="text-[10px]">{rp.permission.code}</Badge>
                    ))}
                    {r.permissions.length > 8 && <Badge variant="outline" className="text-[10px]">+{r.permissions.length - 8} lainnya</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      }
      <RoleForm open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} permissions={permissions} onSuccess={load} />
    </div>
  )
}

function RoleForm({ open, onOpenChange, editing, permissions, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; editing: any | null; permissions: any[]; onSuccess: () => void }) {
  const [form, setForm] = useState<any>({ permissionIds: [] })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        permissionIds: editing.permissions?.map((rp: any) => rp.permission.id) || [],
      })
    } else {
      setForm({ permissionIds: [] })
    }
  }, [editing, open])

  // Group permissions by module
  const modules = permissions.reduce((acc: Record<string, any[]>, p) => {
    if (!acc[p.module]) acc[p.module] = []
    acc[p.module].push(p)
    return acc
  }, {})

  const togglePermission = (pid: string) => {
    setForm((prev: any) => ({
      ...prev,
      permissionIds: prev.permissionIds?.includes(pid)
        ? prev.permissionIds.filter((x: string) => x !== pid)
        : [...(prev.permissionIds || []), pid],
    }))
  }

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast({ title: "Validasi gagal", description: "Kode dan Nama wajib diisi", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiPut(`/api/admin/roles/${editing.id}`, form)
        toast({ title: "Berhasil", description: "Role diperbarui" })
      } else {
        await apiPost("/api/admin/roles", form)
        toast({ title: "Berhasil", description: "Role baru ditambahkan" })
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
        <DialogHeader><DialogTitle>{editing ? "Edit Role" : "Tambah Role Baru"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Kode *</Label>
            <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="GURU_WALI_KELAS" disabled={!!editing} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nama *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Deskripsi</Label>
            <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Permission Matrix</Label>
            <ScrollArea className="h-64 border rounded-md p-3 bg-muted/20">
              <div className="space-y-3">
                {Object.entries(modules).map(([mod, perms]) => (
                  <div key={mod}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-muted-foreground">{mod}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {perms.map((p) => (
                        <label key={p.id} className="flex items-center gap-1.5 text-xs cursor-pointer p-1 rounded hover:bg-muted/40">
                          <Checkbox checked={form.permissionIds?.includes(p.id) || false} onCheckedChange={() => togglePermission(p.id)} />
                          <span className="truncate">{p.code.split(":")[1]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
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
