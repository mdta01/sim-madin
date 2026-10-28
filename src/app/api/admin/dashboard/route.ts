import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth } from "@/lib/auth/guards"

/**
 * GET /api/admin/dashboard
 * Mengembalikan statistik agregat untuk dashboard Super Admin.
 * Semua role authenticated bisa akses (dashboard adaptif per role).
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const [
      totalSantri,
      totalGuru,
      totalKelas,
      totalWali,
      totalMapel,
      lunasTagihan,
      cicilTagihan,
      belumBayarTagihan,
      recentPayments,
      recentAnnouncements,
    ] = await Promise.all([
      db.santri.count({ where: { deletedAt: null, status: "AKTIF" } }),
      db.guru.count({ where: { deletedAt: null, status: "AKTIF" } }),
      db.kelas.count({ where: { deletedAt: null, isActive: true } }),
      db.wali.count({ where: { deletedAt: null } }),
      db.mataPelajaran.count({ where: { deletedAt: null, isActive: true } }),
      db.tagihan.count({ where: { status: "LUNAS" } }),
      db.tagihan.count({ where: { status: "CICIL" } }),
      db.tagihan.count({ where: { status: "BELUM_BAYAR" } }),
      db.payment.findMany({
        take: 5,
        orderBy: { paymentDate: "desc" },
        include: { santri: { select: { name: true } } },
      }),
      db.announcement.findMany({
        take: 5,
        orderBy: { publishedAt: "desc" },
      }),
    ])

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const monthPayments = await db.payment.findMany({
      where: { paymentDate: { gte: startOfMonth, lte: endOfMonth }, status: "VERIFIED" },
      select: { amount: true, paymentDate: true, paymentMethod: true },
    })
    const totalIncomeThisMonth = monthPayments.reduce((sum, p) => sum + p.amount, 0)

    const unpaidTagihan = await db.tagihan.findMany({
      where: { status: { in: ["BELUM_BAYAR", "CICIL"] } },
      select: { amount: true, paidAmount: true },
    })
    const totalOutstanding = unpaidTagihan.reduce((sum, t) => sum + (t.amount - t.paidAmount), 0)

    // Chart pemasukan 6 bulan terakhir
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const sixMonthPayments = await db.payment.findMany({
      where: { paymentDate: { gte: sixMonthsAgo }, status: "VERIFIED" },
      select: { amount: true, paymentDate: true },
    })
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    const incomeChart: { month: string; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const total = sixMonthPayments
        .filter((p) => p.paymentDate.getMonth() === d.getMonth() && p.paymentDate.getFullYear() === d.getFullYear())
        .reduce((sum, p) => sum + p.amount, 0)
      incomeChart.push({ month: monthNames[d.getMonth()], amount: total })
    }

    // Absensi hari ini
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const todayAbsensi = await db.absensi.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      select: { status: true },
    })
    const absensiToday = {
      hadir: todayAbsensi.filter((a) => a.status === "HADIR").length,
      sakit: todayAbsensi.filter((a) => a.status === "SAKIT").length,
      izin: todayAbsensi.filter((a) => a.status === "IZIN").length,
      alfa: todayAbsensi.filter((a) => a.status === "ALFA").length,
    }

    const kelasWithCount = await db.kelas.findMany({
      where: { deletedAt: null, isActive: true },
      include: { _count: { select: { santri: { where: { status: "AKTIF" } } } }, waliKelas: { select: { name: true } } },
      orderBy: { sortOrder: "asc" },
    })
    const santriPerKelas = kelasWithCount.map((k) => ({
      name: k.code,
      count: k._count.santri,
      waliKelas: k.waliKelas?.name || "-",
    }))

    return NextResponse.json({
      stats: {
        totalSantri,
        totalGuru,
        totalKelas,
        totalWali,
        totalMapel,
        tagihanLunas: lunasTagihan,
        tagihanCicil: cicilTagihan,
        tagihanBelumBayar: belumBayarTagihan,
        totalIncomeThisMonth,
        totalOutstanding,
      },
      incomeChart,
      absensiToday,
      santriPerKelas,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        invoiceNo: p.invoiceNo,
        santriName: p.santri?.name || "-",
        amount: p.amount,
        method: p.paymentMethod,
        date: p.paymentDate,
        status: p.status,
      })),
      recentAnnouncements: recentAnnouncements.map((a) => ({
        id: a.id,
        title: a.title,
        priority: a.priority,
        publishedAt: a.publishedAt,
        audience: a.audience,
      })),
    })
  } catch (error) {
    console.error("[dashboard] error:", error)
    return NextResponse.json({ error: "Gagal memuat data dashboard" }, { status: 500 })
  }
}
