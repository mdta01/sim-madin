import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatRupiah } from "@/lib/constants"

/**
 * GET /api/admin/kas/laporan
 * Query: type (bulanan|semester|tahunan), month, year, semesterId
 *
 * Returns laporan keuangan: pemasukan/pengeluaran per kategori, saldo, tunggakan.
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("kas:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "bulanan" // bulanan|semester|tahunan
    const year = Number(searchParams.get("year")) || new Date().getFullYear()
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1

    // Build date range
    let dateFrom: Date, dateTo: Date
    if (type === "bulanan") {
      dateFrom = new Date(year, month - 1, 1)
      dateTo = new Date(year, month, 0, 23, 59, 59)
    } else if (type === "tahunan") {
      dateFrom = new Date(year, 0, 1)
      dateTo = new Date(year, 11, 31, 23, 59, 59)
    } else {
      // semester — use TA active dates
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      dateFrom = ta?.startDate || new Date(year, 0, 1)
      dateTo = ta?.endDate || new Date(year, 11, 31, 23, 59, 59)
    }

    // Get all transaksi in date range
    const transaksiList = await db.transaksiKas.findMany({
      where: { transaksiDate: { gte: dateFrom, lte: dateTo } },
      include: { kas: { select: { name: true } } },
      orderBy: { transaksiDate: "asc" },
    })

    // Group by type + category
    const pemasukanByCategory: Record<string, number> = {}
    const pengeluaranByCategory: Record<string, number> = {}
    let totalPemasukan = 0
    let totalPengeluaran = 0

    for (const t of transaksiList) {
      if (t.type === "PEMASUKAN") {
        pemasukanByCategory[t.category] = (pemasukanByCategory[t.category] || 0) + t.amount
        totalPemasukan += t.amount
      } else {
        pengeluaranByCategory[t.category] = (pengeluaranByCategory[t.category] || 0) + t.amount
        totalPengeluaran += t.amount
      }
    }

    // Get all kas balance
    const kasList = await db.kas.findMany({ where: { isActive: true } })
    const totalSaldo = kasList.reduce((s, k) => s + k.balance, 0)

    // Get tunggakan (tagihan BELUM_BAYAR + CICIL)
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    let totalTunggakan = 0
    let countTunggakan = 0
    if (ta) {
      const tagihanList = await db.tagihan.findMany({
        where: { tahunAjaranId: ta.id, status: { in: ["BELUM_BAYAR", "CICIL"] } },
        select: { amount: true, paidAmount: true },
      })
      totalTunggakan = tagihanList.reduce((s, t) => s + (t.amount - t.paidAmount), 0)
      countTunggakan = tagihanList.length
    }

    return NextResponse.json({
      periode: { type, dateFrom, dateTo, year, month },
      pemasukan: {
        byCategory: pemasukanByCategory,
        total: totalPemasukan,
      },
      pengeluaran: {
        byCategory: pengeluaranByCategory,
        total: totalPengeluaran,
      },
      surplus: totalPemasukan - totalPengeluaran,
      saldoKas: {
        byKas: kasList.map((k) => ({ name: k.name, balance: k.balance })),
        total: totalSaldo,
      },
      tunggakan: {
        count: countTunggakan,
        total: totalTunggakan,
      },
      transaksiList: transaksiList.slice(0, 100), // limit for display
    })
  } catch (error) {
    console.error("[laporan kas] error:", error)
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 })
  }
}
