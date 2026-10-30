import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth } from "@/lib/auth/guards"

/**
 * GET /api/admin/dashboard
 * Optimized: 1 raw SQL for all counts + 5 min cache
 *
 * Fix V8: Added retry logic for cold-start database connection issues.
 * On first request after idle (Vercel cold start), Prisma may need extra time
 * to establish DB connection. We retry up to 3 times with 500ms delay.
 */

let cachedData: { data: any; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Retry wrapper for database operations.
 * On cold start, the first DB call may fail due to connection not being ready.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: any
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      // Only retry on connection errors (not on logic errors)
      const isConnectionError =
        error?.code === "P1001" || // Can't reach database
        error?.code === "P1002" || // Database timeout
        error?.code === "P1008" || // Operations timed out
        error?.message?.includes("timed out") ||
        error?.message?.includes("Connection") ||
        error?.message?.includes("ECONNRESET") ||
        error?.message?.includes("Can't reach database")
      if (!isConnectionError || i === retries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)))
    }
  }
  throw lastError
}

export async function GET(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error

  // Return cached data if available (bypasses cold start for subsequent requests)
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedData.data)
  }

  try {
    const responseData = await withRetry(async () => {
      // Single raw SQL for ALL counts (1 round-trip instead of 10+)
      const counts: any = await db.$queryRaw`
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
      // V2: also fetch V2 stats — materi, tugas, pertemuan, pending grading
      const now = new Date()
      const weekStart = new Date(now.getTime() - (((now.getDay() + 6) % 7) * 86400000)) // Monday this week
      const weekStartMidnight = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
      const weekEnd = new Date(weekStartMidnight.getTime() + 7 * 86400000 - 1)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const [
        recentPayments, recentAnnouncements, todayAbsensi, kelasCounts,
        v2MateriMonth, v2TugasActive, v2TugasOverdue, v2PertemuanWeek, v2PertemuanLastWeek,
        v2PendingGrading, v2SubmissionsWeek,
      ] = await Promise.all([
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
        // V2: materi published this month
        db.materi.count({
          where: { deletedAt: null, isPublished: true, publishedAt: { gte: monthStart } },
        }),
        // V2: tugas active (due date >= now, published)
        db.tugas.count({
          where: { deletedAt: null, isPublished: true, dueDate: { gte: now } },
        }),
        // V2: tugas overdue (due date < now, published)
        db.tugas.count({
          where: { deletedAt: null, isPublished: true, dueDate: { lt: now } },
        }),
        // V2: pertemuan this week
        db.pertemuan.count({
          where: { date: { gte: weekStartMidnight, lte: weekEnd } },
        }),
        // V2: pertemuan last week (for comparison)
        db.pertemuan.count({
          where: { date: { gte: new Date(weekStartMidnight.getTime() - 7 * 86400000), lt: weekStartMidnight } },
        }),
        // V2: pending grading submissions (status SUBMITTED or LATE, not GRADED)
        db.pengumpulanTugas.count({
          where: { status: { in: ["SUBMITTED", "LATE"] } },
        }),
        // V2: total submissions this week
        db.pengumpulanTugas.count({
          where: { submittedAt: { gte: weekStartMidnight } },
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

      return {
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
        // V2 — Akademik & Pembelajaran stats
        v2Stats: {
          materiPublishedThisMonth: v2MateriMonth,
          tugasActive: v2TugasActive,
          tugasOverdue: v2TugasOverdue,
          pertemuanThisWeek: v2PertemuanWeek,
          pertemuanLastWeek: v2PertemuanLastWeek,
          pertemuanTrend: v2PertemuanWeek - v2PertemuanLastWeek,
          pendingGrading: v2PendingGrading,
          submissionsThisWeek: v2SubmissionsWeek,
        },
      }
    })

    // Cache the result
    cachedData = { data: responseData, timestamp: Date.now() }
    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("[dashboard] error:", error?.message || error?.code || error)

    // Return partial/empty data instead of 500 — so UI doesn't break
    // This prevents the "Request failed: 500" on cold start
    const fallbackData = {
      stats: {
        totalSantri: 0, totalGuru: 0, totalKelas: 0, totalWali: 0, totalMapel: 0,
        tagihanLunas: 0, tagihanCicil: 0, tagihanBelumBayar: 0,
        totalIncomeThisMonth: 0, totalOutstanding: 0,
      },
      incomeChart: Array.from({ length: 6 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (5 - i))
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
        return { month: monthNames[d.getMonth()], amount: 0 }
      }),
      absensiToday: { hadir: 0, sakit: 0, izin: 0, alfa: 0 },
      santriPerKelas: [],
      recentPayments: [],
      recentAnnouncements: [],
      v2Stats: {
        materiPublishedThisMonth: 0, tugasActive: 0, tugasOverdue: 0,
        pertemuanThisWeek: 0, pertemuanLastWeek: 0, pertemuanTrend: 0,
        pendingGrading: 0, submissionsThisWeek: 0,
      },
      _error: "Data sedang dimuat. Coba refresh halaman.",
    }

    // If we have cached data (even if stale), return it instead of fallback
    if (cachedData) {
      return NextResponse.json(cachedData.data)
    }

    // Return fallback with 200 status (not 500) so UI renders without error
    // The user will see 0 values and can refresh to get real data
    return NextResponse.json(fallbackData)
  }
}
