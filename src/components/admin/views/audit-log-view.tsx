"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet } from "@/lib/api-client"
import { useAdminStore } from "@/stores/admin-store"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/constants"
import { ShieldCheck, Activity, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  UPDATE: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  DELETE: "bg-red-100 text-red-700 hover:bg-red-100",
  LOGIN: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  LOGOUT: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  UPLOAD: "bg-purple-100 text-purple-700 hover:bg-purple-100",
}

export function AuditLogView() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moduleFilter, setModuleFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = { limit: 200 }
      if (moduleFilter) params.module = moduleFilter
      if (actionFilter) params.action = actionFilter
      const res = await apiGet("/api/admin/audit-log", params)
      setLogs(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [moduleFilter, actionFilter])

  useEffect(() => { load() }, [load])

  const filteredLogs = logs.filter(l => {
    if (search) {
      const q = search.toLowerCase()
      return (
        l.user?.name?.toLowerCase().includes(q) ||
        l.module?.toLowerCase().includes(q) ||
        l.entityId?.toLowerCase().includes(q) ||
        l.changes?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const modules = Array.from(new Set(logs.map(l => l.module))).sort()
  const actions = Array.from(new Set(logs.map(l => l.action))).sort()

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Riwayat semua aktivitas penting di sistem"
        icon={<Activity className="h-5 w-5" />}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari user, modul, entity ID..."
            className="pl-9"
          />
        </div>
        <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue placeholder="Semua Modul" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Modul</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[140px] h-9"><SelectValue placeholder="Semua Aksi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aksi</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <LoadingState /> :
            error ? <ErrorState message={error} onRetry={load} /> :
            filteredLogs.length === 0 ? <EmptyState icon={<Activity className="h-5 w-5" />} title="Belum ada log" /> :
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Waktu</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Modul</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt, true)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {log.user?.name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{log.user?.name || "Sistem"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-mono ${ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {log.entityId ? log.entityId.slice(-8) : "-"}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {log.changes ? (
                          <span className="text-muted-foreground line-clamp-2 font-mono text-[10px]">
                            {log.changes.length > 100 ? log.changes.slice(0, 100) + "..." : log.changes}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {log.ip || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>

      {filteredLogs.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Menampilkan {filteredLogs.length} dari {logs.length} log (maks 200 entry terbaru)
        </p>
      )}
    </div>
  )
}
