"use client"

import { useEffect, useState } from "react"
import { apiGet } from "@/lib/api-client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LoadingState, ErrorState } from "@/components/admin/shared/states"
import { PageHeader } from "@/components/admin/shared/page-header"
import { formatRupiah, formatDate } from "@/lib/constants"
import {
  BarChart3,
  Users,
  UserCheck,
  UserPlus,
  GraduationCap,
  User,
  User as UserFemale,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  UserCog,
  CalendarCheck,
  CalendarClock,
  Award,
  RotateCw,
} from "lucide-react"
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

// ============================================================================
// TYPES
// ============================================================================
interface SantriPerKelasItem {
  name: string
  code: string
  count: number
}

interface TopSantriItem {
  rank: number
  name: string
  nis: string
  kelas: string
  avg: number
}

interface AvgPerKelasItem {
  kelas: string
  avg: number
  santriCount: number
}

interface SantriSeringTidakHadirItem {
  name: string
  nis: string
  kelas: string
  persentase: number
}

interface RekapKehadiranKelasItem {
  kelas: string
  persentase: number
}

interface KasListItem {
  name: string
  balance: number
  type: string
}

interface DashboardKepalaData {
  santri: {
    total: number
    aktif: number
    lulus: number
    pindah: number
    keluar: number
    baru: number
    laki: number
    perempuan: number
    perKelas: SantriPerKelasItem[]
  }
  akademik: {
    topSantri: TopSantriItem[]
    avgPerKelas: AvgPerKelasItem[]
    totalAlumni: number
    lulusTahunIni: number
  }
  kehadiran: {
    persentaseHadir: number
    totalAbsensi30Days: number
    santriSeringTidakHadir: SantriSeringTidakHadirItem[]
    rekapPerKelas: RekapKehadiranKelasItem[]
  }
  guru: {
    total: number
    aktif: number
    totalJadwal: number
  }
  keuangan: {
    pemasukanBulanIni: number
    pemasukanTahunIni: number
    pengeluaranBulanIni: number
    pengeluaranTahunIni: number
    saldo: number
    totalTunggakan: number
    countTunggakan: number
    pembayaranBulanIni: number
    kasList: KasListItem[]
  }
  grafik: {
    keuangan: { month: string; pemasukan: number; pengeluaran: number }[]
    tunggakanPerKelas: { kelas: string; tunggakan: number }[]
    kehadiran7Hari: { day: string; hadir: number; tidakHadir: number }[]
    nilaiPerMapel: { mapel: string; avg: number }[]
    santriPerKelas: { name: string; count: number }[]
  }
}

interface DashboardKepalaResponse {
  data: DashboardKepalaData
}

// ============================================================================
// CONSTANTS
// ============================================================================
const CHART_COLORS = {
  emerald: "#10b981",
  blue: "#3b82f6",
  red: "#ef4444",
  pink: "#ec4899",
  amber: "#f59e0b",
  purple: "#8b5cf6",
}

const PIE_GENDER_COLORS = [CHART_COLORS.blue, CHART_COLORS.pink]

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function DashboardKepalaView() {
  const [data, setData] = useState<DashboardKepalaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<DashboardKepalaResponse>(
        "/api/admin/dashboard-kepala"
      )
      setData(res.data)
    } catch (e: any) {
      setError(e.message || "Gagal memuat data dashboard kepala")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <LoadingState className="py-20" />
  if (error || !data)
    return (
      <ErrorState
        message={error || "Data dashboard tidak tersedia"}
        onRetry={load}
      />
    )

  const { santri, akademik, kehadiran, guru, keuangan, grafik } = data

  // Santri stat cards
  const santriStatCards = [
    {
      label: "Total Santri",
      value: santri.total,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      label: "Santri Aktif",
      value: santri.aktif,
      icon: UserCheck,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Baru Tahun Ini",
      value: santri.baru,
      icon: UserPlus,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/50",
    },
    {
      label: "Lulus",
      value: santri.lulus,
      icon: GraduationCap,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/50",
    },
    {
      label: "Laki-laki",
      value: santri.laki,
      icon: User,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Perempuan",
      value: santri.perempuan,
      icon: UserFemale,
      color: "text-pink-600",
      bg: "bg-pink-50 dark:bg-pink-950/50",
    },
  ]

  // Keuangan stat cards
  const keuanganStatCards = [
    {
      label: "Pemasukan Bulan Ini",
      value: formatRupiah(keuangan.pemasukanBulanIni),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      label: "Pengeluaran Bulan Ini",
      value: formatRupiah(keuangan.pengeluaranBulanIni),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/50",
    },
    {
      label: "Saldo Total",
      value: formatRupiah(keuangan.saldo),
      icon: Wallet,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Total Tunggakan",
      value: formatRupiah(keuangan.totalTunggakan),
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/50",
    },
  ]

  // Guru stat cards
  const guruStatCards = [
    {
      label: "Total Guru",
      value: guru.total,
      icon: UserCog,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Guru Aktif",
      value: guru.aktif,
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      label: "Total Jadwal",
      value: guru.totalJadwal,
      icon: CalendarClock,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/50",
    },
  ]

  const genderPieData = [
    { name: "Laki-laki", value: santri.laki },
    { name: "Perempuan", value: santri.perempuan },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Kepala"
        description="Analitik & statistik madrasah untuk pengambilan keputusan"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RotateCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        }
      />

      {/* === SECTION 1: Santri Stats === */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Statistik Santri
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {santriStatCards.map((s, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {s.label}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate">
                      {s.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${s.bg} ${s.color} shrink-0`}
                  >
                    <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* === SECTION 2: Charts === */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Grafik & Visualisasi
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* a. Santri per Kelas — horizontal BarChart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Distribusi Santri per Kelas
              </CardTitle>
              <CardDescription className="text-xs">
                Jumlah santri pada masing-masing kelas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={grafik.santriPerKelas}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="Jumlah Santri"
                    fill={CHART_COLORS.emerald}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* b. Keuangan 6 Bulan — AreaChart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Grafik Keuangan 6 Bulan Terakhir
              </CardTitle>
              <CardDescription className="text-xs">
                Perbandingan pemasukan dan pengeluaran bulanan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                  data={grafik.keuangan}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={CHART_COLORS.emerald}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={CHART_COLORS.emerald}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={CHART_COLORS.red}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={CHART_COLORS.red}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v: number) => formatRupiah(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="pemasukan"
                    name="Pemasukan"
                    stroke={CHART_COLORS.emerald}
                    fillOpacity={1}
                    fill="url(#colorPemasukan)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pengeluaran"
                    name="Pengeluaran"
                    stroke={CHART_COLORS.red}
                    fillOpacity={1}
                    fill="url(#colorPengeluaran)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* c. Kehadiran 7 Hari — stacked BarChart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Grafik Kehadiran 7 Hari Terakhir
              </CardTitle>
              <CardDescription className="text-xs">
                Rekap harian kehadiran seluruh santri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={grafik.kehadiran7Hari}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="hadir"
                    name="Hadir"
                    stackId="a"
                    fill={CHART_COLORS.emerald}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="tidakHadir"
                    name="Tidak Hadir"
                    stackId="a"
                    fill={CHART_COLORS.red}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* d. Nilai per Mapel — vertical BarChart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Rata-rata Nilai per Mata Pelajaran
              </CardTitle>
              <CardDescription className="text-xs">
                Performa akademik santri per mapel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={grafik.nilaiPerMapel}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mapel" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar
                    dataKey="avg"
                    name="Rata-rata Nilai"
                    fill={CHART_COLORS.blue}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* e. Tunggakan per Kelas — horizontal BarChart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tunggakan per Kelas
              </CardTitle>
              <CardDescription className="text-xs">
                Akumulasi tunggakan santri per kelas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={grafik.tunggakanPerKelas}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}rb`}
                  />
                  <YAxis
                    type="category"
                    dataKey="kelas"
                    tick={{ fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip formatter={(v: number) => formatRupiah(v)} />
                  <Bar
                    dataKey="tunggakan"
                    name="Tunggakan"
                    fill={CHART_COLORS.red}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* f. Pie Gender Santri */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Komposisi Gender Santri
              </CardTitle>
              <CardDescription className="text-xs">
                Distribusi santri berdasarkan jenis kelamin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={genderPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.name}: ${entry.value}`}
                    labelLine={false}
                  >
                    {genderPieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_GENDER_COLORS[index % PIE_GENDER_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* === SECTION 3: Keuangan Summary === */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Ringkasan Keuangan
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {keuanganStatCards.map((s, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {s.label}
                    </p>
                    <p className="text-base sm:text-xl font-bold mt-1 truncate">
                      {s.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${s.bg} ${s.color} shrink-0`}
                  >
                    <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Kas list (if available) */}
        {keuangan.kasList && keuangan.kasList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {keuangan.kasList.map((k, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{k.name}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {k.type || "kas"}
                    </Badge>
                  </div>
                  <p
                    className={`text-sm font-bold ${
                      k.balance >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatRupiah(k.balance)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* === SECTION 4: Top 10 Santri === */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Award className="h-4 w-4" /> Top 10 Santri Berprestasi
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Nama Santri</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-right">Rata-rata Nilai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {akademik.topSantri.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Belum ada data nilai santri
                    </TableCell>
                  </TableRow>
                ) : (
                  akademik.topSantri.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge
                          variant={
                            s.rank === 1
                              ? "default"
                              : s.rank <= 3
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            s.rank === 1
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : ""
                          }
                        >
                          #{s.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {s.nis}
                      </TableCell>
                      <TableCell>{s.kelas}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {s.avg.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* === SECTION 5: Santri Sering Tidak Hadir === */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Santri Sering Tidak Hadir
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Santri</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-right">% Kehadiran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kehadiran.santriSeringTidakHadir.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Tidak ada santri dengan kehadiran rendah
                    </TableCell>
                  </TableRow>
                ) : (
                  kehadiran.santriSeringTidakHadir.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {s.nis}
                      </TableCell>
                      <TableCell>{s.kelas}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            s.persentase < 75
                              ? "destructive"
                              : s.persentase < 85
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {s.persentase.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* === SECTION 6: Kehadiran per Kelas === */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" /> Rekap Kehadiran per Kelas
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-right">Persentase Kehadiran</TableHead>
                  <TableHead className="w-1/3 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kehadiran.rekapPerKelas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Belum ada rekap kehadiran
                    </TableCell>
                  </TableRow>
                ) : (
                  kehadiran.rekapPerKelas.map((k, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{k.kelas}</TableCell>
                      <TableCell className="text-right font-bold">
                        {k.persentase.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            k.persentase >= 90
                              ? "success"
                              : k.persentase >= 75
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {k.persentase >= 90
                            ? "Baik"
                            : k.persentase >= 75
                            ? "Cukup"
                            : "Kurang"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* === SECTION 7: Guru Stats === */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Statistik Guru
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {guruStatCards.map((s, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {s.label}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate">
                      {s.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${s.bg} ${s.color} shrink-0`}
                  >
                    <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
