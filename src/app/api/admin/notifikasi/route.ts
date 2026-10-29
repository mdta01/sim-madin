import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { notifikasiBroadcast } from "@/lib/notifikasi/helper"

/**
 * GET /api/admin/notifikasi
 * Query: waliId, type, isRead, search
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("notifikasi:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const waliId = searchParams.get("waliId")
    const type = searchParams.get("type")
    const isRead = searchParams.get("isRead")
    const search = searchParams.get("search") || ""

    const where: any = {}
    if (waliId) where.waliId = waliId
    if (type) where.type = type
    if (isRead === "true") where.isRead = true
    if (isRead === "false") where.isRead = false
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ]
    }

    const data = await db.notifikasi.findMany({
      where,
      include: {
        wali: { select: { id: true, name: true, phone: true } },
        santri: { select: { id: true, name: true, nis: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    })

    // Stats
    const totalUnread = await db.notifikasi.count({ where: { isRead: false } })
    const totalAll = await db.notifikasi.count()

    return NextResponse.json({
      data,
      total: data.length,
      stats: { totalAll, totalUnread },
    })
  } catch (error) {
    console.error("[notifikasi list] error:", error)
    return NextResponse.json({ error: "Gagal memuat notifikasi" }, { status: 500 })
  }
}

/**
 * POST /api/admin/notifikasi
 * Manual create + send notifikasi (or broadcast to all wali).
 *
 * Body: {
 *   waliId?: string (null = broadcast to all active wali),
 *   santriId?: string,
 *   type: string,
 *   title: string,
 *   message: string,
 *   priority?: string,
 *   broadcast?: boolean — if true, send to ALL wali
 * }
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("notifikasi:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.title || !body.message) {
      return NextResponse.json({ error: "Judul dan Pesan wajib diisi" }, { status: 400 })
    }

    if (body.broadcast) {
      // Broadcast to all active wali
      await notifikasiBroadcast(body.title, body.message)
      await logAudit(session, "CREATE", "NOTIFIKASI_BROADCAST", undefined, {
        title: body.title, priority: body.priority,
      }, req)
      return NextResponse.json({ success: true, message: "Notifikasi dikirim ke semua wali aktif" })
    }

    if (!body.waliId) {
      return NextResponse.json({ error: "waliId wajib diisi (atau set broadcast=true)" }, { status: 400 })
    }

    const notif = await db.notifikasi.create({
      data: {
        waliId: body.waliId,
        santriId: body.santriId || null,
        type: body.type || "CUSTOM",
        title: body.title,
        message: body.message,
        priority: body.priority || "NORMAL",
        entityType: body.entityType || null,
        entityId: body.entityId || null,
      },
    })
    await logAudit(session, "CREATE", "NOTIFIKASI", notif.id, {
      title: notif.title, waliId: body.waliId,
    }, req)
    return NextResponse.json({ data: notif })
  } catch (error) {
    console.error("[notifikasi create] error:", error)
    return NextResponse.json({ error: "Gagal membuat notifikasi" }, { status: 500 })
  }
}
