"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { DataTableToolbar } from "@/components/admin/shared/data-table-toolbar"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  QR_TYPES,
  QR_SCAN_TYPES,
  QR_SCAN_RESULT,
  formatDate,
  type BadgeVariant,
} from "@/lib/constants"
import {
  QrCode,
  ScanLine,
  ClipboardList,
  Users,
  UserCog,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Clock,
  Search,
  X,
} from "lucide-react"

// ============================================================================
// MAIN VIEW
// ============================================================================
export function QrView() {
  const [tab, setTab] = useState("santri")

  return (
    <div>
      <PageHeader
        title="QR & Digital Card"
        description="QR code santri & guru, scan absensi, dan riwayat scan"
        icon={<QrCode className="h-5 w-5" />}
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="santri">
            <Users className="h-3.5 w-3.5" /> QR Santri
          </TabsTrigger>
          <TabsTrigger value="guru">
            <UserCog className="h-3.5 w-3.5" /> QR Guru
          </TabsTrigger>
          <TabsTrigger value="scan-log">
            <ClipboardList className="h-3.5 w-3.5" /> Scan Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="santri" className="mt-4">
          <QrEntityTab type="SANTRI" />
        </TabsContent>
        <TabsContent value="guru" className="mt-4">
          <QrEntityTab type="GURU" />
        </TabsContent>
        <TabsContent value="scan-log" className="mt-4">
          <ScanLogTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// TAB: QR SANTRI / QR GURU  (parametrized)
// ============================================================================
function QrEntityTab({ type }: { type: "SANTRI" | "GURU" }) {
  const isSantri = type === "SANTRI"
  const typeConf = QR_TYPES.find((t) => t.value === type)
  const accentColor = typeConf?.color || (isSantri ? "#059669" : "#7c3aed")

  const [entityList, setEntityList] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [qrData, setQrData] = useState<any>(null)
  const [listLoading, setListLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // ---- Load entity list (santri or guru) ----
  const loadList = useCallback(async () => {
    try {
      setListLoading(true)
      setListError(null)
      const endpoint = isSantri ? "/api/admin/santri" : "/api/admin/guru"
      const res = await apiGet(endpoint)
      const items = res.data || []
      // Santri: hanya tampilkan yang aktif untuk QR absensi
      const filtered = isSantri
        ? items.filter((s: any) => s.status === "AKTIF")
        : items
      setEntityList(filtered)
      setSelectedId((prev) => prev || filtered[0]?.id || "")
    } catch (e: any) {
      setListError(e.message)
    } finally {
      setListLoading(false)
    }
  }, [isSantri])

  // ---- Load QR data for selected entity ----
  const loadQr = useCallback(async () => {
    if (!selectedId) {
      setQrData(null)
      return
    }
    try {
      setQrLoading(true)
      setQrError(null)
      const endpoint = isSantri
        ? `/api/admin/qr/santri/${selectedId}`
        : `/api/admin/qr/guru/${selectedId}`
      const res = await apiGet(endpoint)
      setQrData(res.data)
    } catch (e: any) {
      setQrError(e.message)
      setQrData(null)
    } finally {
      setQrLoading(false)
    }
  }, [selectedId, isSantri])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    loadQr()
  }, [loadQr])

  // Filter list by search query
  const filteredList = entityList.filter((e: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.name?.toLowerCase().includes(q) ||
      (isSantri ? e.nis : e.nip)?.toLowerCase().includes(q)
    )
  })

  // ---- Print kartu (santri / guru) ----
  const handlePrintKartu = () => {
    if (!selectedId) return
    const url = isSantri
      ? `/api/admin/dokumen/kartu-santri/${selectedId}`
      : `/api/admin/dokumen/kartu-guru/${selectedId}`
    window.open(url, "_blank")
  }

  // ---- Download QR as PNG ----
  const handleDownloadQr = () => {
    if (!qrData?.qrDataUrl) return
    const name = isSantri ? qrData.santri?.name : qrData.guru?.name
    const a = document.createElement("a")
    a.href = qrData.qrDataUrl
    a.download = `qr-${isSantri ? "santri" : "guru"}-${name || selectedId}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ============ LIST PANEL ============ */}
      <Card className="lg:col-span-1">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {isSantri ? "Pilih Santri" : "Pilih Guru"}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={loadList}
              title="Refresh daftar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isSantri ? "Cari nama / NIS..." : "Cari nama / NIP..."}
              className="pl-9 pr-8 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {listLoading ? (
            <LoadingState />
          ) : listError ? (
            <ErrorState message={listError} onRetry={loadList} />
          ) : filteredList.length === 0 ? (
            <EmptyState
              icon={isSantri ? <Users className="h-5 w-5" /> : <UserCog className="h-5 w-5" />}
              title={isSantri ? "Belum ada santri aktif" : "Belum ada guru"}
            />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto pr-1 -mr-1 space-y-1">
              {filteredList.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                    e.id === selectedId
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isSantri ? `NIS: ${e.nis || "-"}` : `NIP: ${e.nip || "-"}`}
                    {isSantri && e.kelas?.name ? ` • ${e.kelas.name}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ QR PREVIEW PANEL ============ */}
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          {!selectedId ? (
            <EmptyState
              icon={<QrCode className="h-5 w-5" />}
              title={isSantri ? "Pilih santri untuk melihat QR" : "Pilih guru untuk melihat QR"}
              description="Pilih entitas dari daftar di samping untuk menampilkan QR code-nya."
            />
          ) : qrLoading ? (
            <LoadingState />
          ) : qrError ? (
            <ErrorState message={qrError} onRetry={loadQr} />
          ) : qrData ? (
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* QR Image */}
              <div
                className="shrink-0 rounded-lg p-3 border-2 bg-white"
                style={{ borderColor: accentColor }}
              >
                {/* base64 data URL — using <img> is fine here */}
                <img
                  src={qrData.qrDataUrl}
                  alt={`QR ${isSantri ? "Santri" : "Guru"}`}
                  className="w-48 h-48 object-contain"
                />
              </div>

              {/* Info + actions */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <Badge
                    variant="outline"
                    className="mb-2"
                    style={{ color: accentColor, borderColor: accentColor }}
                  >
                    {typeConf?.label || type}
                  </Badge>
                  <h2 className="text-xl font-bold tracking-tight">
                    {isSantri ? qrData.santri?.name : qrData.guru?.name}
                  </h2>
                  <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">
                        {isSantri ? "NIS" : "NIP"}:{" "}
                      </span>
                      {isSantri ? qrData.santri?.nis || "-" : qrData.guru?.nip || "-"}
                    </p>
                    {isSantri && (
                      <p>
                        <span className="font-medium text-foreground">Kelas: </span>
                        {qrData.santri?.kelas?.name || "-"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-md bg-muted/50 border border-dashed">
                  <p className="text-[11px] text-muted-foreground">QR Content</p>
                  <p className="font-mono text-xs break-all">{qrData.qrContent}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handlePrintKartu}>
                    <Printer className="h-4 w-4 mr-1" />
                    Cetak Kartu {isSantri ? "Santri" : "Guru"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadQr}
                    disabled={!qrData.qrDataUrl}
                  >
                    <Download className="h-4 w-4 mr-1" /> Download QR
                  </Button>
                  <Button variant="ghost" onClick={loadQr} title="Refresh QR">
                    <RefreshCw className="h-4 w-4" /> Refresh
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// TAB: SCAN LOG
// ============================================================================
function ScanLogTab() {
  const [data, setData] = useState<any[]>([])
  const [stats, setStats] = useState<{
    todayScans: number
    successToday: number
    alreadyScanned: number
  }>({ todayScans: 0, successToday: 0, alreadyScanned: 0 })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [qrTypeFilter, setQrTypeFilter] = useState("")
  const [scanTypeFilter, setScanTypeFilter] = useState("")
  const [resultFilter, setResultFilter] = useState("")

  // ---- Manual scan input ----
  const [qrContent, setQrContent] = useState("")
  const [scanning, setScanning] = useState(false)
  const { toast } = useToast()

  // ---- Load scan log + stats ----
  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (qrTypeFilter) params.qrType = qrTypeFilter
      if (scanTypeFilter) params.scanType = scanTypeFilter
      if (resultFilter) params.result = resultFilter
      const res = await apiGet("/api/admin/qr/scan-log", params)
      setData(res.data || [])
      setStats(
        res.stats || { todayScans: 0, successToday: 0, alreadyScanned: 0 }
      )
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [qrTypeFilter, scanTypeFilter, resultFilter])

  useEffect(() => {
    load()
  }, [load])

  // ---- Manual scan handler ----
  const handleScan = async () => {
    const content = qrContent.trim()
    if (!content) {
      toast({
        title: "Validasi gagal",
        description: "Isi QR content terlebih dahulu.",
        variant: "destructive",
      })
      return
    }
    setScanning(true)
    try {
      const res = await apiPost("/api/admin/qr/scan", {
        qrContent: content,
        scanType: "ABSENSI",
      })
      const resultConf = QR_SCAN_RESULT[res.result]
      const isDestructive = res.result === "NOT_FOUND" || res.result === "ERROR"
      toast({
        title: resultConf?.label || res.result,
        description: res.message,
        variant: isDestructive ? "destructive" : "default",
      })
      setQrContent("")
      load() // refresh log + stats
    } catch (e: any) {
      toast({
        title: "Gagal scan",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setScanning(false)
    }
  }

  // ---- Local search filter (after server-side type filters) ----
  const filteredData = data.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.entityId?.toLowerCase().includes(q) ||
      s.message?.toLowerCase().includes(q) ||
      s.deviceInfo?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {/* ============ STATS ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Scan Hari Ini</p>
                <p className="text-2xl font-bold">{stats.todayScans}</p>
              </div>
              <ScanLine className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sukses Hari Ini</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.successToday}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sudah Scan (total)</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.alreadyScanned}
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ MANUAL SCAN ============ */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ScanLine className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Scan Manual</h3>
            <Badge variant="secondary" className="text-[10px]">ABSENSI</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Tempel / ketik QR content dengan format{" "}
            <code className="px-1 py-0.5 bg-muted rounded font-mono">
              MADIN:SANTRI:{"{id}"}:{"{nis}"}
            </code>{" "}
            atau{" "}
            <code className="px-1 py-0.5 bg-muted rounded font-mono">
              MADIN:GURU:{"{id}"}:{"{nip}"}
            </code>
            .
          </p>
          <div className="flex gap-2">
            <Input
              value={qrContent}
              onChange={(e) => setQrContent(e.target.value)}
              placeholder="MADIN:SANTRI:cuid-xxxx:12345678"
              className="font-mono text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleScan()
              }}
            />
            <Button onClick={handleScan} disabled={scanning}>
              {scanning ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4 mr-1" />
              )}
              {scanning ? "Memproses..." : "Scan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ============ TOOLBAR + TABLE ============ */}
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari entity ID / pesan / device..."
        filters={
          <>
            <Select
              value={qrTypeFilter}
              onValueChange={(v) => setQrTypeFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Tipe QR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe QR</SelectItem>
                {QR_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={scanTypeFilter}
              onValueChange={(v) => setScanTypeFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Tipe Scan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe Scan</SelectItem>
                {QR_SCAN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={resultFilter}
              onValueChange={(v) => setResultFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Hasil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Hasil</SelectItem>
                {Object.entries(QR_SCAN_RESULT).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="Belum ada scan log"
              description="Riwayat scan QR akan muncul di sini setelah ada aktivitas scan."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Tipe QR</TableHead>
                    <TableHead className="min-w-[160px]">Entity</TableHead>
                    <TableHead className="min-w-[120px]">Scan Type</TableHead>
                    <TableHead className="min-w-[130px]">Hasil</TableHead>
                    <TableHead className="min-w-[240px]">Pesan</TableHead>
                    <TableHead className="min-w-[160px]">Device</TableHead>
                    <TableHead className="min-w-[180px]">Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((s) => {
                    const typeConf = QR_TYPES.find((t) => t.value === s.qrType)
                    const resultConf = QR_SCAN_RESULT[s.result]
                    const scanTypeConf = QR_SCAN_TYPES.find(
                      (t) => t.value === s.scanType
                    )
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={
                              typeConf
                                ? { color: typeConf.color, borderColor: typeConf.color }
                                : undefined
                            }
                          >
                            {typeConf?.label || s.qrType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p
                            className="text-xs font-mono truncate max-w-[160px]"
                            title={s.entityId}
                          >
                            {s.entityId || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">
                            {scanTypeConf?.label || s.scanType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={resultConf?.variant as BadgeVariant || "outline"}>
                            {resultConf?.label || s.result}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {s.message || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Smartphone className="h-3 w-3 shrink-0" />
                            <span
                              className="truncate max-w-[120px]"
                              title={s.deviceInfo || ""}
                            >
                              {s.deviceInfo || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{formatDate(s.createdAt, true)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
