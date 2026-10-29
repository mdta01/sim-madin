"use client"

import { useEffect, useState, useCallback } from "react"
import { apiGet, apiPost } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { LoadingState, ErrorState } from "@/components/admin/shared/states"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { formatRupiah } from "@/lib/constants"
import {
  Workflow, GraduationCap, Wallet, Users, ArrowRight,
  CheckCircle2, Settings2, Zap,
  ArrowUpCircle, FilePlus2, Loader2, CircleDot,
} from "lucide-react"

// ============================================================================
// CONSTANTS — Siklus step definitions (used as fallback / display order)
// ============================================================================

const SIKLUS_SANTRI_STEPS = [
  "Data Santri", "Kelas", "Jadwal", "Pembelajaran", "Absensi",
  "Nilai", "Perkembangan", "Ujian", "Rapor", "Kenaikan Kelas", "Kelulusan & Alumni",
]

const SIKLUS_KEUANGAN_STEPS = [
  "Jenis Tagihan", "Tagihan", "Pembayaran", "Verifikasi",
  "Kas", "Transaksi Kas", "Honor Guru", "Laporan", "Monitoring",
]

const SIKLUS_GURU_STEPS = [
  "Data Guru", "Penugasan", "Absensi Santri", "Nilai", "Honor",
]

const DEFAULT_INTEGRATIONS = [
  "Payment → Kas",
  "Honor → Kas",
  "Kenaikan Kelas",
  "Auto-Tagihan",
  "Notifikasi",
]

type StepStatus = "OK" | "KOSONG" | "MANUAL"

interface SiklusStep {
  name: string
  count?: number
  status?: StepStatus
}

interface SiklusOverview {
  siklusSantri?: SiklusStep[]
  siklusKeuangan?: SiklusStep[]
  siklusGuru?: SiklusStep[]
  integrations?: string[]
}

const STATUS_BADGE: Record<StepStatus, { label: string; className: string }> = {
  OK: { label: "OK", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400" },
  KOSONG: { label: "KOSONG", className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-400" },
  MANUAL: { label: "MANUAL", className: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400" },
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SiklusView() {
  const [overview, setOverview] = useState<SiklusOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // List data for bulk actions
  const [kelasList, setKelasList] = useState<any[]>([])
  const [jenisTagihanList, setJenisTagihanList] = useState<any[]>([])

  // Dialog state
  const [kenaikanOpen, setKenaikanOpen] = useState(false)
  const [autoTagihanOpen, setAutoTagihanOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [ov, kelas, jenis] = await Promise.all([
        apiGet<SiklusOverview>("/api/admin/siklus/overview"),
        apiGet("/api/admin/kelas").catch(() => ({ data: [] })),
        apiGet("/api/admin/jenis-tagihan").catch(() => ({ data: [] })),
      ])
      setOverview(ov)
      setKelasList(kelas.data || [])
      setJenisTagihanList(jenis.data || [])
    } catch (e: any) {
      setError(e.message || "Gagal memuat data siklus")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Normalize steps: ensure all defined steps appear even if API omits some
  const normalizeSteps = (defined: string[], fromApi?: SiklusStep[]): SiklusStep[] => {
    if (!fromApi || fromApi.length === 0) {
      return defined.map((name) => ({ name, count: 0, status: "KOSONG" as StepStatus }))
    }
    const map = new Map(fromApi.map((s) => [s.name, s]))
    return defined.map((name) => {
      const found = map.get(name)
      return found
        ? { name, count: found.count, status: (found.status as StepStatus) || "OK" }
        : { name, count: 0, status: "KOSONG" as StepStatus }
    })
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Siklus & Workflow"
          description="Visualisasi siklus santri, keuangan, dan guru — plus aksi massal terintegrasi"
          icon={<Workflow className="h-5 w-5" />}
        />
        <LoadingState className="py-20" />
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div>
        <PageHeader
          title="Siklus & Workflow"
          description="Visualisasi siklus santri, keuangan, dan guru — plus aksi massal terintegrasi"
          icon={<Workflow className="h-5 w-5" />}
        />
        <ErrorState message={error || "Data tidak tersedia"} onRetry={load} />
      </div>
    )
  }

  const santriSteps = normalizeSteps(SIKLUS_SANTRI_STEPS, overview.siklusSantri)
  const keuanganSteps = normalizeSteps(SIKLUS_KEUANGAN_STEPS, overview.siklusKeuangan)
  const guruSteps = normalizeSteps(SIKLUS_GURU_STEPS, overview.siklusGuru)
  const integrations = overview.integrations && overview.integrations.length > 0
    ? overview.integrations
    : DEFAULT_INTEGRATIONS

  return (
    <div className="space-y-6">
      <PageHeader
        title="Siklus & Workflow"
        description="Visualisasi siklus santri, keuangan, dan guru — plus aksi massal terintegrasi"
        icon={<Workflow className="h-5 w-5" />}
      />

      {/* ===================== SIKLUS SANTRI ===================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-emerald-600" />
            Siklus Santri
          </CardTitle>
          <CardDescription>
            Alur hidup data santri dari pendaftaran hingga menjadi alumni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkflowFlow steps={santriSteps} accent="emerald" />
        </CardContent>
      </Card>

      {/* ===================== SIKLUS KEUANGAN ===================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-blue-600" />
            Siklus Keuangan
          </CardTitle>
          <CardDescription>
            Alur keuangan dari jenis tagihan hingga monitoring laporan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkflowFlow steps={keuanganSteps} accent="blue" />
        </CardContent>
      </Card>

      {/* ===================== SIKLUS GURU ===================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-purple-600" />
            Siklus Guru
          </CardTitle>
          <CardDescription>
            Alur aktivitas guru dari penugasan hingga pembayaran honor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkflowFlow steps={guruSteps} accent="purple" />
        </CardContent>
      </Card>

      {/* ===================== INTEGRATION STATUS ===================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-600" />
            Status Integrasi
          </CardTitle>
          <CardDescription>
            Koneksi antar-modul yang sedang aktif dan dipantau sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {integrations.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CircleDot className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-medium truncate">{name}</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
                  ACTIVE
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ===================== BULK ACTIONS ===================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Aksi Massal
          </CardTitle>
          <CardDescription>
            Jalankan operasi batch lintas modul dengan preview (dry run)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setKenaikanOpen(true)} variant="default">
              <ArrowUpCircle className="h-4 w-4 mr-1.5" />
              Kenaikan Kelas
            </Button>
            <Button onClick={() => setAutoTagihanOpen(true)} variant="default">
              <FilePlus2 className="h-4 w-4 mr-1.5" />
              Auto-Generate Tagihan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===================== DIALOGS ===================== */}
      <KenaikanKelasDialog
        open={kenaikanOpen}
        onOpenChange={setKenaikanOpen}
        kelasList={kelasList}
        onSuccess={load}
      />
      <AutoTagihanDialog
        open={autoTagihanOpen}
        onOpenChange={setAutoTagihanOpen}
        jenisTagihanList={jenisTagihanList}
        onSuccess={load}
      />
    </div>
  )
}

// ============================================================================
// WORKFLOW FLOW — Horizontal flow of steps with count + status badge
// ============================================================================
function WorkflowFlow({ steps, accent }: { steps: SiklusStep[]; accent: "emerald" | "blue" | "purple" }) {
  const accentDot = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  }[accent]

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {steps.map((step, idx) => {
        const status = step.status || "OK"
        const conf = STATUS_BADGE[status]
        return (
          <div key={step.name} className="flex items-center gap-2">
            <div className="flex flex-col gap-1 rounded-lg border bg-card px-3 py-2 min-w-[140px]">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${accentDot}`} />
                <span className="text-xs font-medium leading-tight">{step.name}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {typeof step.count === "number" ? step.count : "—"}
                </span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${conf.className}`}>
                  {conf.label}
                </Badge>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// DIALOG — Kenaikan Kelas
// ============================================================================
function KenaikanKelasDialog({
  open, onOpenChange, kelasList, onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  kelasList: any[]
  onSuccess: () => void
}) {
  const [kelasId, setKelasId] = useState("")
  const [dryRun, setDryRun] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState<any | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setKelasId(kelasList[0]?.id || "")
      setDryRun(true)
      setPreview(null)
    }
  }, [open, kelasList])

  const handleProses = async () => {
    if (!kelasId) {
      toast({ title: "Validasi gagal", description: "Pilih kelas terlebih dahulu", variant: "destructive" })
      return
    }
    setProcessing(true)
    setPreview(null)
    try {
      const res = await apiPost("/api/admin/siklus/kenaikan-kelas", { kelasId, dryRun })
      if (dryRun) {
        setPreview(res)
        toast({
          title: "Preview berhasil",
          description: `Diproses ${res?.processed ?? res?.count ?? 0} santri (dry run)`,
        })
      } else {
        toast({
          title: "Berhasil",
          description: `Kenaikan kelas dieksekusi untuk ${res?.processed ?? res?.count ?? 0} santri`,
        })
        onOpenChange(false)
        onSuccess()
      }
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-primary" />
            Kenaikan Kelas
          </DialogTitle>
          <DialogDescription>
            Naikkan kelas santri secara massal. Jalankan Dry Run untuk preview tanpa perubahan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Kelas *</Label>
            <Select value={kelasId} onValueChange={setKelasId}>
              <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
              <SelectContent>
                {kelasList.length === 0 ? (
                  <SelectItem value="_empty" disabled>Tidak ada kelas</SelectItem>
                ) : kelasList.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.name} {k.tingkat ? `— ${k.tingkat}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <Switch checked={dryRun} onCheckedChange={setDryRun} id="kk-dryrun" />
            <Label htmlFor="kk-dryrun" className="text-sm cursor-pointer flex-1">
              Dry Run (Preview)
              <span className="block text-[11px] text-muted-foreground font-normal">
                Jalankan tanpa menyimpan perubahan — untuk inspeksi hasil
              </span>
            </Label>
          </div>

          {preview && (
            <PreviewResult
              title="Hasil Preview"
              data={preview}
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={handleProses} disabled={processing || !kelasId}>
            {processing ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Memproses...</>
            ) : dryRun ? (
              <><Zap className="h-4 w-4 mr-1.5" /> Preview</>
            ) : (
              <><ArrowUpCircle className="h-4 w-4 mr-1.5" /> Proses</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// DIALOG — Auto-Generate Tagihan
// ============================================================================
function AutoTagihanDialog({
  open, onOpenChange, jenisTagihanList, onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  jenisTagihanList: any[]
  onSuccess: () => void
}) {
  const now = new Date()
  const [jenisTagihanId, setJenisTagihanId] = useState("")
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [amount, setAmount] = useState<number | "">("")
  const [dryRun, setDryRun] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState<any | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      const first = jenisTagihanList[0]
      setJenisTagihanId(first?.id || "")
      setMonth(now.getMonth() + 1)
      setYear(now.getFullYear())
      setAmount(first?.defaultAmount ? Number(first.defaultAmount) : "")
      setDryRun(true)
      setPreview(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jenisTagihanList])

  const handleJenisChange = (id: string) => {
    setJenisTagihanId(id)
    const j = jenisTagihanList.find((x) => x.id === id)
    if (j?.defaultAmount) setAmount(Number(j.defaultAmount))
  }

  const handleGenerate = async () => {
    if (!jenisTagihanId) {
      toast({ title: "Validasi gagal", description: "Pilih jenis tagihan terlebih dahulu", variant: "destructive" })
      return
    }
    if (month < 1 || month > 12) {
      toast({ title: "Validasi gagal", description: "Bulan harus antara 1-12", variant: "destructive" })
      return
    }
    setProcessing(true)
    setPreview(null)
    try {
      const body: any = {
        jenisTagihanId,
        dryRun,
        month,
        year,
      }
      if (amount !== "" && amount !== null) body.amount = Number(amount)
      const res = await apiPost("/api/admin/siklus/auto-tagihan", body)
      if (dryRun) {
        setPreview(res)
        toast({
          title: "Preview berhasil",
          description: `Akan dibuat ${res?.processed ?? res?.count ?? 0} tagihan (dry run)`,
        })
      } else {
        toast({
          title: "Berhasil",
          description: `${res?.processed ?? res?.count ?? 0} tagihan berhasil dibuat`,
        })
        onOpenChange(false)
        onSuccess()
      }
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-4 w-4 text-primary" />
            Auto-Generate Tagihan
          </DialogTitle>
          <DialogDescription>
            Buat tagihan massal untuk semua santri aktif berdasarkan jenis tagihan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Jenis Tagihan *</Label>
            <Select value={jenisTagihanId} onValueChange={handleJenisChange}>
              <SelectTrigger><SelectValue placeholder="Pilih Jenis Tagihan" /></SelectTrigger>
              <SelectContent>
                {jenisTagihanList.length === 0 ? (
                  <SelectItem value="_empty" disabled>Tidak ada jenis tagihan</SelectItem>
                ) : jenisTagihanList.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.name} {j.code ? `(${j.code})` : ""}
                    {j.defaultAmount ? ` — ${formatRupiah(Number(j.defaultAmount))}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Bulan (1-12) *</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tahun *</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2000}
                max={2100}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Jumlah (opsional)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Kosongkan untuk pakai default jenis"
            />
            <p className="text-[11px] text-muted-foreground">
              Override nominal default. Kosongkan untuk menggunakan default dari jenis tagihan.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
            <Switch checked={dryRun} onCheckedChange={setDryRun} id="at-dryrun" />
            <Label htmlFor="at-dryrun" className="text-sm cursor-pointer flex-1">
              Dry Run (Preview)
              <span className="block text-[11px] text-muted-foreground font-normal">
                Jalankan tanpa menyimpan perubahan — untuk inspeksi hasil
              </span>
            </Label>
          </div>

          {preview && (
            <PreviewResult
              title="Hasil Preview"
              data={preview}
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={handleGenerate} disabled={processing || !jenisTagihanId}>
            {processing ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Memproses...</>
            ) : dryRun ? (
              <><Zap className="h-4 w-4 mr-1.5" /> Preview</>
            ) : (
              <><FilePlus2 className="h-4 w-4 mr-1.5" /> Generate</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// PREVIEW RESULT — Reusable display of dry-run / commit response
// ============================================================================
function PreviewResult({ title, data, icon }: { title: string; data: any; icon: React.ReactNode }) {
  const items: { label: string; value: string }[] = []
  if (typeof data?.processed === "number") items.push({ label: "Diproses", value: String(data.processed) })
  if (typeof data?.count === "number") items.push({ label: "Jumlah", value: String(data.count) })
  if (typeof data?.skipped === "number") items.push({ label: "Dilewati", value: String(data.skipped) })
  if (typeof data?.totalAmount === "number") items.push({ label: "Total Nominal", value: formatRupiah(data.totalAmount) })
  if (Array.isArray(data?.samples) && data.samples.length > 0) {
    items.push({ label: "Contoh", value: data.samples.slice(0, 3).map((s: any) =>
      typeof s === "string" ? s : (s.name || s.label || JSON.stringify(s))
    ).join(", ") })
  }
  if (data?.message) items.push({ label: "Pesan", value: String(data.message) })

  if (items.length === 0 && data) {
    items.push({ label: "Response", value: JSON.stringify(data, null, 2).slice(0, 300) })
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tidak ada data dikembalikan.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{it.label}</span>
              <span className="font-mono text-right break-all">{it.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
