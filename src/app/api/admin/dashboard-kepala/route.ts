import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"

/**
 * GET /api/admin/dashboard-kepala
 *
 * Sesuai roadmap.pdf V11 — Dashboard & Analitik Madrasah
 * Tujuan: kepala madrasah dapat mengambil keputusan berdasarkan data.
 *
 * Returns comprehensive analytics:
 * - Santri: jumlah, aktif, baru, lulus, tidak aktif
 * - Akademik: rata-rata nilai, ranking kelas, kelulusan, perkembangan kelas
 * - Kehadiran: persentase hadir, santri sering tidak hadir, rekap per kelas
 * - Guru: jumlah, jadwal, kehadiran
 * - Keuangan: pemasukan, pengeluaran, saldo, tunggakan, pembayaran
 * - Grafik: jumlah santri, kehadiran, nilai, pemasukan, pengeluaran, tunggakan
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("dashboard:read", req)
  if (guard.error) return guard.error
  try {
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    // ========================================================================
    // 1. SANTRI STATS (sesuai roadmap.pdf V11)
    // ========================================================================
    const [
      totalSantri, santriAktif, santriLulus, santriPindah, santriKeluar,
      santriBaru, santriLaki, santriPerempuan,
    ] = await Promise.all([
      db.santri.count({ where: { deletedAt: null } }),
      db.santri.count({ where: { deletedAt: null, status: "AKTIF" } }),
      db.santri.count({ where: { deletedAt: null, status: "LULUS" } }),
      db.santri.count({ where: { deletedAt: null, status: "PINDAH" } }),
      db.santri.count({ where: { deletedAt: null, status: "KELUAR" } }),
      // Santri baru tahun ini
      ta ? db.santri.count({ where: { deletedAt: null, tahunAjaranId: ta.id, status: "AKTIF" } }) : Promise.resolve(0),
      db.santri.count({ where: { deletedAt: null, gender: "L" } }),
      db.santri.count({ where: { deletedAt: null, gender: "P" } }),
    ])

    // Santri per kelas (for chart)
    const santriPerKelas = await db.kelas.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        name: true, code: true,
        _count: { select: { santri: { where: { status: "AKTIF", deletedAt: null } } } },
      },
      orderBy: { sortOrder: "asc" },
    })

    // ========================================================================
    // 2. AKADEMIK STATS (sesuai roadmap.pdf V11)
    // ========================================================================
    // Rata-rata nilai per kelas
    let avgNilaiPerKelas: any[] = []
    let topSantri: any[] = []
    if (ta && sem) {
      const allNilai = await db.nilai.findMany({
        where: { tahunAjaranId: ta.id, semesterId: sem.id },
        select: { santriId: true, score: true, type: true, santri: { select: { name: true, nis: true, kelas: { select: { name: true } } } } },
      })

      // Group by santri → compute average
      const santriNilai: Record<string, { name: string, nis: string, kelas: string, scores: number[] }> = {}
      for (const n of allNilai) {
        if (!santriNilai[n.santriId]) {
          santriNilai[n.santriId] = {
            name: n.santri?.name || "",
            nis: n.santri?.nis || "",
            kelas: n.santri?.kelas?.name || "-",
            scores: [],
          }
        }
        santriNilai[n.santriId].scores.push(n.score)
      }

      // Compute averages
      const santriAvg = Object.entries(santriNilai).map(([id, data]) => ({
        id, name: data.name, nis: data.nis, kelas: data.kelas,
        avg: data.scores.length > 0 ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10 : 0,
        count: data.scores.length,
      }))

      // Top 10 santri by average
      topSantri = santriAvg
        .filter((s) => s.count > 0)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 10)
        .map((s, i) => ({ rank: i + 1, ...s }))

      // Average per kelas
      const kelasMap: Record<string, { total: number, count: number }> = {}
      for (const s of santriAvg) {
        if (!kelasMap[s.kelas]) kelasMap[s.kelas] = { total: 0, count: 0 }
        kelasMap[s.kelas].total += s.avg
        kelasMap[s.kelas].count++
      }
      avgNilaiPerKelas = Object.entries(kelasMap).map(([kelas, data]) => ({
        kelas,
        avg: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
        santriCount: data.count,
      })).sort((a, b) => b.avg - a.avg)
    }

    // Kelulusan stats (V10 alumni)
    const totalAlumni = await db.alumni.count()
    const lulusTahunIni = ta ? await db.alumni.count({ where: { tahunLulus: now.getFullYear() } }) : 0

    // ========================================================================
    // 3. KEHADIRAN STATS (sesuai roadmap.pdf V11)
    // ========================================================================
    // 30 hari terakhir
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const absensi30Days = await db.absensi.findMany({
      where: { tahunAjaranId: ta?.id, date: { gte: thirtyDaysAgo } },
      select: { santriId: true, status: true },
    })

    const totalAbsensi = absensi30Days.length
    const hadirCount = absensi30Days.filter((a) => a.status === "HADIR").length
    const persentaseHadir = totalAbsensi > 0 ? Math.round((hadirCount / totalAbsensi) * 100) : 0

    // Santri sering tidak hadir (top 10 dengan kehadiran terendah)
    const absensiBySantri: Record<string, { hadir: number, total: number }> = {}
    for (const a of absensi30Days) {
      if (!absensiBySantri[a.santriId]) absensiBySantri[a.santriId] = { hadir: 0, total: 0 }
      absensiBySantri[a.santriId].total++
      if (a.status === "HADIR") absensiBySantri[a.santriId].hadir++
    }

    const santriSeringTidakHadir = await Promise.all(
      Object.entries(absensiBySantri)
        .map(([santriId, data]) => ({
          santriId,
          hadir: data.hadir,
          total: data.total,
          persentase: data.total > 0 ? Math.round((data.hadir / data.total) * 100) : 0,
        }))
        .filter((s) => s.persentase < 80) // below 80% attendance
        .sort((a, b) => a.persentase - b.persentase)
        .slice(0, 10)
        .map(async (s) => {
          const santri = await db.santri.findUnique({
            where: { id: s.santriId },
            select: { name: true, nis: true, kelas: { select: { name: true } } },
          })
          return { ...s, name: santri?.name || "-", nis: santri?.nis || "-", kelas: santri?.kelas?.name || "-" }
        })
    )

    // Rekap kehadiran per kelas
    const kelasList = await db.kelas.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, code: true },
    })
    const rekapKehadiranPerKelas = await Promise.all(
      kelasList.map(async (k) => {
        const kelasAbsensi = await db.absensi.findMany({
          where: { kelasId: k.id, tahunAjaranId: ta?.id, date: { gte: thirtyDaysAgo } },
          select: { status: true },
        })
        const total = kelasAbsensi.length
        const hadir = kelasAbsensi.filter((a) => a.status === "HADIR").length
        return {
          kelas: k.name,
          total,
          hadir,
          persentase: total > 0 ? Math.round((hadir / total) * 100) : 0,
        }
      })
    )

    // ========================================================================
    // 4. GURU STATS (sesuai roadmap.pdf V11)
    // ========================================================================
    const [totalGuru, guruAktif] = await Promise.all([
      db.guru.count({ where: { deletedAt: null } }),
      db.guru.count({ where: { deletedAt: null, status: "AKTIF" } }),
    ])

    // Total jadwal mengajar
    const totalJadwal = ta && sem
      ? await db.jadwal.count({ where: { tahunAjaranId: ta.id, semesterId: sem.id } })
      : 0

    // ========================================================================
    // 5. KEUANGAN STATS (sesuai roadmap.pdf V11)
    // ========================================================================
    const [pemasukanBulanIni, pemasukanTahunIni, pengeluaranBulanIni, pengeluaranTahunIni] = await Promise.all([
      // Pemasukan bulan ini (verified payments)
      db.payment.aggregate({
        where: { status: "VERIFIED", paymentDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      // Pemasukan tahun ini
      db.payment.aggregate({
        where: { status: "VERIFIED", paymentDate: { gte: yearStart } },
        _sum: { amount: true },
      }),
      // Pengeluaran bulan ini (TransaksiKas PENGELUARAN)
      db.transaksiKas.aggregate({
        where: { type: "PENGELUARAN", transaksiDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      // Pengeluaran tahun ini
      db.transaksiKas.aggregate({
        where: { type: "PENGELUARAN", transaksiDate: { gte: yearStart } },
        _sum: { amount: true },
      }),
    ])

    // Saldo total (all kas)
    const kasList = await db.kas.findMany({ where: { isActive: true } })
    const totalSaldo = kasList.reduce((sum, k) => sum + k.balance, 0)

    // Tunggakan
    const tunggakan = ta
      ? await db.tagihan.aggregate({
          where: { tahunAjaranId: ta.id, status: { in: ["BELUM_BAYAR", "CICIL"] } },
          _sum: { amount: true, paidAmount: true },
          _count: true,
        })
      : null

    const totalTunggakan = tunggakan ? (tunggakan._sum.amount || 0) - (tunggakan._sum.paidAmount || 0) : 0
    const countTunggakan = tunggakan?._count || 0

    // Pembayaran bulan ini
    const pembayaranBulanIni = await db.payment.count({
      where: { status: "VERIFIED", paymentDate: { gte: monthStart } },
    })

    // ========================================================================
    // 6. GRAFIK DATA (sesuai roadmap.pdf V11)
    // ========================================================================
    // Grafik pemasukan 6 bulan terakhir
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    const monthPayments = await db.$queryRaw`
      SELECT EXTRACT(MONTH FROM "paymentDate") as month, EXTRACT(YEAR FROM "paymentDate") as year,
        SUM(amount) as total
      FROM "Payment" WHERE status = 'VERIFIED' AND "paymentDate" >= ${sixMonthsAgo}
      GROUP BY EXTRACT(MONTH FROM "paymentDate"), EXTRACT(YEAR FROM "paymentDate")
    ` as any[]

    // Grafik pengeluaran 6 bulan terakhir
    const monthPengeluaran = await db.$queryRaw`
      SELECT EXTRACT(MONTH FROM "transaksiDate") as month, EXTRACT(YEAR FROM "transaksiDate") as year,
        SUM(amount) as total
      FROM "TransaksiKas" WHERE type = 'PENGELUARAN' AND "transaksiDate" >= ${sixMonthsAgo}
      GROUP BY EXTRACT(MONTH FROM "transaksiDate"), EXTRACT(YEAR FROM "transaksiDate")
    ` as any[]

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    const grafikKeuangan: { month: string; pemasukan: number; pengeluaran: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const matchPemasukan = monthPayments.find((p) => Number(p.month) === d.getMonth() + 1 && Number(p.year) === d.getFullYear())
      const matchPengeluaran = monthPengeluaran.find((p) => Number(p.month) === d.getMonth() + 1 && Number(p.year) === d.getFullYear())
      grafikKeuangan.push({
        month: monthNames[d.getMonth()],
        pemasukan: Number(matchPemasukan?.total || 0),
        pengeluaran: Number(matchPengeluaran?.total || 0),
      })
    }

    // Grafik tunggakan per kelas
    const tunggakanPerKelas = ta
      ? await Promise.all(
          kelasList.map(async (k) => {
            const agg = await db.tagihan.aggregate({
              where: { kelasId: k.id, tahunAjaranId: ta.id, status: { in: ["BELUM_BAYAR", "CICIL"] } },
              _sum: { amount: true, paidAmount: true },
            })
            return {
              kelas: k.name,
              tunggakan: (agg._sum.amount || 0) - (agg._sum.paidAmount || 0),
            }
          })
        )
      : []

    // Grafik kehadiran 7 hari terakhir
    const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000)
    const absensi7Days = await db.absensi.findMany({
      where: { tahunAjaranId: ta?.id, date: { gte: sevenDaysAgo } },
      select: { date: true, status: true },
    })
    const grafikKehadiran: { day: string; hadir: number; tidakHadir: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      const dayAbsensi = absensi7Days.filter((a) => new Date(a.date) >= dStart && new Date(a.date) <= dEnd)
      grafikKehadiran.push({
        day: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d.getDay()],
        hadir: dayAbsensi.filter((a) => a.status === "HADIR").length,
        tidakHadir: dayAbsensi.filter((a) => a.status !== "HADIR").length,
      })
    }

    // Grafik nilai rata-rata per mapel
    let grafikNilaiPerMapel: { mapel: string; avg: number }[] = []
    if (ta && sem) {
      const allNilaiWithMapel = await db.nilai.findMany({
        where: { tahunAjaranId: ta.id, semesterId: sem.id },
        select: { score: true, mapel: { select: { name: true } } },
      })
      const mapelMap: Record<string, { total: number; count: number }> = {}
      for (const n of allNilaiWithMapel) {
        const name = n.mapel?.name || "-"
        if (!mapelMap[name]) mapelMap[name] = { total: 0, count: 0 }
        mapelMap[name].total += n.score
        mapelMap[name].count++
      }
      grafikNilaiPerMapel = Object.entries(mapelMap).map(([mapel, data]) => ({
        mapel,
        avg: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
      })).sort((a, b) => b.avg - a.avg)
    }

    // ========================================================================
    // COMPILE RESPONSE
    // ========================================================================
    return NextResponse.json({
      data: {
        santri: {
          total: totalSantri,
          aktif: santriAktif,
          lulus: santriLulus,
          pindah: santriPindah,
          keluar: santriKeluar,
          baru: santriBaru,
          laki: santriLaki,
          perempuan: santriPerempuan,
          perKelas: santriPerKelas.map((k) => ({ name: k.name, code: k.code, count: k._count.santri })),
        },
        akademik: {
          topSantri,
          avgPerKelas: avgNilaiPerKelas,
          totalAlumni,
          lulusTahunIni,
        },
        kehadiran: {
          persentaseHadir,
          totalAbsensi30Days: totalAbsensi,
          santriSeringTidakHadir,
          rekapPerKelas: rekapKehadiranPerKelas,
        },
        guru: {
          total: totalGuru,
          aktif: guruAktif,
          totalJadwal,
        },
        keuangan: {
          pemasukanBulanIni: Number(pemasukanBulanIni._sum.amount || 0),
          pemasukanTahunIni: Number(pemasukanTahunIni._sum.amount || 0),
          pengeluaranBulanIni: Number(pengeluaranBulanIni._sum.amount || 0),
          pengeluaranTahunIni: Number(pengeluaranTahunIni._sum.amount || 0),
          saldo: totalSaldo,
          totalTunggakan,
          countTunggakan,
          pembayaranBulanIni,
          kasList: kasList.map((k) => ({ name: k.name, balance: k.balance, type: k.type })),
        },
        grafik: {
          keuangan: grafikKeuangan,
          tunggakanPerKelas,
          kehadiran7Hari: grafikKehadiran,
          nilaiPerMapel: grafikNilaiPerMapel,
          santriPerKelas: santriPerKelas.map((k) => ({ name: k.name, count: k._count.santri })),
        },
      },
    })
  } catch (error: any) {
    console.error("[dashboard kepala] error:", error?.message || error)
    return NextResponse.json({ error: "Gagal memuat dashboard kepala" }, { status: 500 })
  }
}
