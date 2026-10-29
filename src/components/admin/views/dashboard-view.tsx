"use client"

import { useEffect, useState } from "react"
import { apiGet } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LoadingState, ErrorState } from "@/components/admin/shared/states"
import { StatusBadge } from "@/components/admin/shared/status-badge"
import { PageHeader } from "@/components/admin/shared/page-header"
import { formatRupiah, formatDate } from "@/lib/constants"
import {
  GraduationCap, UserCog, School, Users, BookOpen,
  TrendingUp, AlertTriangle, Wallet, ClipboardCheck, ArrowRight, Megaphone,
  FolderOpen, ClipboardList, CalendarCheck, Award, Clock, ChevronUp, ChevronDown, Minus,
} from "lucide-react"
import { useAdminStore } from "@/stores/admin-store"

interface DashboardData {
  stats: {
    totalSantri: number
    totalGuru: number
    totalKelas: number
    totalWali: number
    totalMapel: number
    tagihanLunas: number
    tagihanCicil: number
    tagihanBelumBayar: number
    totalIncomeThisMonth: number
    totalOutstanding: number
  }
  incomeChart: { month: string; amount: number }[]
  absensiToday: { hadir: number; sakit: number; izin: number; alfa: number }
  santriPerKelas: { name: string; count: number; waliKelas: string }[]
  recentPayments: any[]
  recentAnnouncements: any[]
  v2Stats?: {
    materiPublishedThisMonth: number
    tugasActive: number
    tugasOverdue: number
    pertemuanThisWeek: number
    pertemuanLastWeek: number
    pertemuanTrend: number
    pendingGrading: number
    submissionsThisWeek: number
  }
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setView = useAdminStore((s) => s.setView)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiGet<DashboardData>("/api/admin/dashboard")
      setData(result)
    } catch (e: any) {
      setError(e.message || "Gagal memuat data dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <LoadingState className="py-20" />
  if (error || !data) return <ErrorState message={error || "Data tidak tersedia"} onRetry={load} />

  const { stats, incomeChart, absensiToday, santriPerKelas, recentPayments, recentAnnouncements } = data
  const maxIncome = Math.max(...incomeChart.map((c) => c.amount), 1)

  const statCards = [
    { label: "Total Santri", value: stats.totalSantri, icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/50", onClick: () => setView("santri") },
    { label: "Total Guru", value: stats.totalGuru, icon: UserCog, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/50", onClick: () => setView("guru") },
    { label: "Total Kelas", value: stats.totalKelas, icon: School, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/50", onClick: () => setView("kelas") },
    { label: "Total Wali", value: stats.totalWali, icon: Users, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/50", onClick: () => setView("wali") },
    { label: "Mata Pelajaran", value: stats.totalMapel, icon: BookOpen, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/50", onClick: () => setView("mapel") },
    { label: "Pemasukan Bulan Ini", value: formatRupiah(stats.totalIncomeThisMonth), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/50", onClick: () => setView("pembayaran") },
    { label: "Tunggakan", value: formatRupiah(stats.totalOutstanding), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/50", onClick: () => setView("tagihan") },
    { label: "Tagihan Lunas", value: stats.tagihanLunas, icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/50", onClick: () => setView("tagihan") },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Super Admin"
        description="Ringkasan & statistik Madrasah Diniyah Terpadu"
        icon={<GraduationCap className="h-5 w-5" />}
      />

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((s, i) => (
          <button
            key={i}
            onClick={s.onClick}
            className="text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring rounded-xl"
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{s.label}</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{s.value}</p>
                  </div>
                  <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${s.bg} ${s.color} shrink-0`}>
                    <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* V2 — Akademik & Pembelajaran Widget */}
      {data.v2Stats && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Akademik & Pembelajaran (V2)
            </h2>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView("materi")}>
              Kelola <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button onClick={() => setView("materi")} className="text-left">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <FolderOpen className="h-4 w-4 text-rose-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Materi Bulan Ini</p>
                  <p className="text-xl font-bold text-rose-600">{data.v2Stats.materiPublishedThisMonth}</p>
                  <p className="text-[9px] text-muted-foreground">materi dipublikasi</p>
                </CardContent>
              </Card>
            </button>
            <button onClick={() => setView("tugas")} className="text-left">
              <Card className="hover:shadow-md transition-shadow h-full border-blue-200 dark:border-blue-900">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    {data.v2Stats.tugasOverdue > 0 && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0">{data.v2Stats.tugasOverdue} lewat</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Tugas Aktif</p>
                  <p className="text-xl font-bold text-blue-600">{data.v2Stats.tugasActive}</p>
                  <p className="text-[9px] text-muted-foreground">belum lewat tenggat</p>
                </CardContent>
              </Card>
            </button>
            <button onClick={() => setView("tugas")} className="text-left">
              <Card className={`hover:shadow-md transition-shadow h-full ${data.v2Stats.pendingGrading > 0 ? "border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Award className="h-4 w-4 text-amber-600" />
                    {data.v2Stats.pendingGrading > 0 && (
                      <Badge variant="warning" className="text-[9px] px-1 py-0">perlu review</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Menunggu Nilai</p>
                  <p className="text-xl font-bold text-amber-600">{data.v2Stats.pendingGrading}</p>
                  <p className="text-[9px] text-muted-foreground">pengumpulan belum dinilai</p>
                </CardContent>
              </Card>
            </button>
            <button onClick={() => setView("pertemuan")} className="text-left">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <CalendarCheck className="h-4 w-4 text-purple-600" />
                    {data.v2Stats.pertemuanTrend !== 0 && (
                      <span className={`flex items-center text-[10px] ${data.v2Stats.pertemuanTrend > 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {data.v2Stats.pertemuanTrend > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {Math.abs(data.v2Stats.pertemuanTrend)}
                      </span>
                    )}
                    {data.v2Stats.pertemuanTrend === 0 && (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Pertemuan Minggu Ini</p>
                  <p className="text-xl font-bold text-purple-600">{data.v2Stats.pertemuanThisWeek}</p>
                  <p className="text-[9px] text-muted-foreground">vs {data.v2Stats.pertemuanLastWeek} minggu lalu</p>
                </CardContent>
              </Card>
            </button>
            <button onClick={() => setView("tugas")} className="text-left">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Pengumpulan Minggu Ini</p>
                  <p className="text-xl font-bold text-emerald-600">{data.v2Stats.submissionsThisWeek}</p>
                  <p className="text-[9px] text-muted-foreground">tugas dikumpulkan</p>
                </CardContent>
              </Card>
            </button>
            <button onClick={() => setView("kompetensi")} className="text-left">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Clock className="h-4 w-4 text-indigo-600" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Quick Action</p>
                  <p className="text-sm font-medium text-indigo-600 mt-1">Kelola Kompetensi</p>
                  <p className="text-[9px] text-muted-foreground">capaian pembelajaran</p>
                </CardContent>
              </Card>
            </button>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Income Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Pemasukan 6 Bulan Terakhir</CardTitle>
                <CardDescription className="text-xs">Total pembayaran terverifikasi per bulan</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView("pembayaran")}>
                Detail <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 sm:gap-3 h-48 sm:h-56">
              {incomeChart.map((c, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {c.amount > 0 ? `${(c.amount / 1000).toFixed(0)}rb` : "-"}
                  </div>
                  <div className="w-full bg-muted rounded-md overflow-hidden flex items-end h-full">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-md transition-all hover:from-emerald-700 hover:to-emerald-500"
                      style={{ height: `${(c.amount / maxIncome) * 100 || 1}%` }}
                    />
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{c.month}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Absensi Today */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Absensi Hari Ini
            </CardTitle>
            <CardDescription className="text-xs">Rekap kehadiran semua santri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AbsensiRow label="Hadir" count={absensiToday.hadir} total={stats.totalSantri} color="bg-emerald-500" />
            <AbsensiRow label="Sakit" count={absensiToday.sakit} total={stats.totalSantri} color="bg-amber-500" />
            <AbsensiRow label="Izin" count={absensiToday.izin} total={stats.totalSantri} color="bg-blue-500" />
            <AbsensiRow label="Alfa" count={absensiToday.alfa} total={stats.totalSantri} color="bg-red-500" />
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setView("absensi")}>
              Lihat Detail Absensi
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tagihan Summary + Santri per Kelas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Status Tagihan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Lunas
              </span>
              <span className="font-semibold text-emerald-600">{stats.tagihanLunas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Cicil
              </span>
              <span className="font-semibold text-amber-600">{stats.tagihanCicil}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                Belum Bayar
              </span>
              <span className="font-semibold text-red-600">{stats.tagihanBelumBayar}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setView("tagihan")}>
              Kelola Tagihan
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <School className="h-4 w-4" />
              Distribusi Santri per Kelas
            </CardTitle>
            <CardDescription className="text-xs">Total santri aktif per kelas beserta wali kelas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {santriPerKelas.map((k, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{k.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">Wali: {k.waliKelas}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="font-mono">{k.count} santri</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Pembayaran Terbaru
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView("pembayaran")}>
                Semua <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada pembayaran</p>
              ) : (
                recentPayments.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{p.santriName?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.santriName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.invoiceNo} • {formatDate(p.date, true)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{formatRupiah(p.amount)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Pengumuman Terbaru
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setView("pengumuman")}>
                Semua <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAnnouncements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada pengumuman</p>
              ) : (
                recentAnnouncements.map((a, i) => (
                  <div key={i} className="p-3 rounded-md border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium line-clamp-1 flex-1">{a.title}</p>
                      <StatusBadge status={a.priority} />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{a.audience}</Badge>
                      <span>{formatDate(a.publishedAt, true)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AbsensiRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-semibold">{count} / {total}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
