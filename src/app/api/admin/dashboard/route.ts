import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth } from "@/lib/auth/guards"

/**
 * GET /api/admin/dashboard
 * Optimized: 1 raw SQL for all counts + 5 min cache
 */

let cachedData: { data: any; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedData.data)
  }

  try {
    // Single raw SQL for ALL counts (1 round-trip instead of 10+)
    const counts = await db.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM "Santri" WHERE "deletedAt" IS NULL AND status = 'AKTIF') as "totalSantri",
        (SELECT COUNT(*) FROM "Guru" WHERE "deletedAt" IS NULL AND status = 'AKTIF') as "totalGuru",
        (SELECT COUNT(*) FROM "Kelas" WHERE "deletedAt" IS NULL AND "isActive" = true) as "totalKelas",
        (SELECT COUNT(*) FROM "Wali" WHERE "deletedAt" IS NULL) as "totalWali",
        (SELECT COUNT(*) FROM "MataPelajaran" WHERE "deletedAt" IS NULL AND "isActive" = true) as "totalMapel",
        (SELECT COUNT(*) FROM "Tagihan" WHERE status = 'LUNAS') as "lunasTagihan",
        (SELECT COUNT(*) FROM "Tagihan" WHERE status = 'CICIL') as "cicilTagihan",
        (SELECT COUNT(*) FROM "Tagihan" WHERE status = 'BELUM_BAYAR') as "belumBayarTagihan",
        (SELECT COALESCE(SUM(amount), 0) FROM "Payment" WHERE status = 'VERIFIED' AND "paymentDate" >= date_trunc('month', CURRENT_DATE)) as "monthIncome",
        (SELECT COALESCE(SUM(amount - "paidAmount"), 0) FROM "Tagihan" WHERE status IN ('BELUM_BAYAR', 'CICIL')) as "outstanding"
    `

    const c = counts[0] as any

    // Batch 2: Recent items (fast, small result sets)
    const [recentPayments, recentAnnouncements, todayAbsensi, kelasCounts] = await Promise.all([
      db.payment.findMany({
        take: 5,
        orderBy: { paymentDate: "desc" },
        select: { id: true, invoiceNo: true, amount: true, paymentMethod: true, paymentDate: true, status: true, santri: { select: { name: true } } },
      }),
      db.announcement.findMany({
        take: 5,
        orderBy: { publishedAt: "desc" },
        select: { id: true, title: true, priority: true, publishedAt: true, audience: true },
      }),
      db.absensi.findMany({
        where: { date: { gte: new Date(new Date().setHours(0,0,0,0)), lte: new Date(new Date().setHours(23,59,59,999)) } },
        select: { status: true },
      }),
      db.kelas.findMany({
        where: { deletedAt: null, isActive: true },
        select: { code: true, _count: { select: { santri: { where: { status: "AKTIF" } } } }, waliKelas: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      }),
    ])

    // 6-month chart (1 query)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    const monthPayments = await db.$queryRaw`
      SELECT EXTRACT(MONTH FROM "paymentDate") as month, EXTRACT(YEAR FROM "paymentDate") as year, SUM(amount) as total
      FROM "Payment" WHERE status = 'VERIFIED' AND "paymentDate" >= ${sixMonthsAgo}
      GROUP BY EXTRACT(MONTH FROM "paymentDate"), EXTRACT(YEAR FROM "paymentDate")
    ` as any[]

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    const incomeChart: { month: string; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const match = monthPayments.find(p => Number(p.month) === d.getMonth() + 1 && Number(p.year) === d.getFullYear())
      incomeChart.push({ month: monthNames[d.getMonth()], amount: Number(match?.total || 0) })
    }

    const responseData = {
      stats: {
        totalSantri: Number(c.totalSantri),
        totalGuru: Number(c.totalGuru),
        totalKelas: Number(c.totalKelas),
        totalWali: Number(c.totalWali),
        totalMapel: Number(c.totalMapel),
        tagihanLunas: Number(c.lunasTagihan),
        tagihanCicil: Number(c.cicilTagihan),
        tagihanBelumBayar: Number(c.belumBayarTagihan),
        totalIncomeThisMonth: Number(c.monthIncome),
        totalOutstanding: Number(c.outstanding),
      },
      incomeChart,
      absensiToday: {
        hadir: todayAbsensi.filter(a => a.status === "HADIR").length,
        sakit: todayAbsensi.filter(a => a.status === "SAKIT").length,
        izin: todayAbsensi.filter(a => a.status === "IZIN").length,
        alfa: todayAbsensi.filter(a => a.status === "ALFA").length,
      },
      santriPerKelas: kelasCounts.map(k => ({ name: k.code, count: k._count.santri, waliKelas: k.waliKelas?.name || "-" })),
      recentPayments: recentPayments.map(p => ({
        id: p.id, invoiceNo: p.invoiceNo, santriName: p.santri?.name || "-",
        amount: p.amount, method: p.paymentMethod, date: p.paymentDate, status: p.status,
      })),
      recentAnnouncements: recentAnnouncements.map(a => ({
        id: a.id, title: a.title, priority: a.priority, publishedAt: a.publishedAt, audience: a.audience,
      })),
    }

    cachedData = { data: responseData, timestamp: Date.now() }
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[dashboard] error:", error)
    return NextResponse.json({ error: "Gagal memuat data dashboard" }, { status: 500 })
  }
}
