import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"

/**
 * GET /api/admin/qr/scan-log
 * Query: qrType, scanType, result, dateFrom, dateTo, limit
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("qr:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const qrType = searchParams.get("qrType")
    const scanType = searchParams.get("scanType")
    const result = searchParams.get("result")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const limit = Math.min(Number(searchParams.get("limit")) || 200, 500)

    const where: any = {}
    if (qrType) where.qrType = qrType
    if (scanType) where.scanType = scanType
    if (result) where.result = result
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(new Date(dateTo).getTime() + 86400000 - 1)
    }

    const data = await db.qRScan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    // Stats
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayScans = await db.qRScan.count({ where: { createdAt: { gte: todayStart } } })
    const successToday = await db.qRScan.count({ where: { createdAt: { gte: todayStart }, result: "SUCCESS" } })
    const alreadyScanned = await db.qRScan.count({ where: { result: "ALREADY_SCANNED" } })

    return NextResponse.json({
      data,
      total: data.length,
      stats: { todayScans, successToday, alreadyScanned },
    })
  } catch (error) {
    console.error("[qr scan log] error:", error)
    return NextResponse.json({ error: "Gagal memuat scan log" }, { status: 500 })
  }
}
