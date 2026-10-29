import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken } from "@/lib/wali/auth"

/**
 * GET /api/wali/notifikasi
 * List notifikasi for logged-in wali.
 * Query: isRead (true/false), type
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const isRead = searchParams.get("isRead")
    const type = searchParams.get("type")

    const where: any = { waliId: session.waliId }
    if (isRead === "true") where.isRead = true
    if (isRead === "false") where.isRead = false
    if (type) where.type = type

    const [data, totalUnread, totalAll] = await Promise.all([
      db.notifikasi.findMany({
        where,
        include: {
          santri: { select: { id: true, name: true, nis: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.notifikasi.count({ where: { waliId: session.waliId, isRead: false } }),
      db.notifikasi.count({ where: { waliId: session.waliId } }),
    ])

    return NextResponse.json({
      data,
      total: data.length,
      stats: { totalAll, totalUnread },
    })
  } catch (error) {
    console.error("[wali notifikasi list] error:", error)
    return NextResponse.json({ error: "Gagal memuat notifikasi" }, { status: 500 })
  }
}
