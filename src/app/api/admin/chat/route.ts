import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * GET /api/admin/chat
 * List all chat rooms.
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("chat:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const waliId = searchParams.get("waliId")

    const where: any = { isActive: true }
    if (type) where.type = type
    if (waliId) where.waliId = waliId

    const rooms = await db.chatRoom.findMany({
      where,
      include: {
        wali: { select: { id: true, name: true, phone: true } },
        guru: { select: { id: true, name: true } },
        santri: { select: { id: true, name: true, nis: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
    })

    return NextResponse.json({ data: rooms, total: rooms.length })
  } catch (error) {
    console.error("[chat rooms list] error:", error)
    return NextResponse.json({ error: "Gagal memuat chat rooms" }, { status: 500 })
  }
}

/**
 * POST /api/admin/chat
 * Create a new chat room (admin-initiated).
 * Body: { type, waliId?, guruId?, santriId?, title? }
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("chat:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.type || !body.waliId) {
      return NextResponse.json({ error: "Tipe dan Wali wajib diisi" }, { status: 400 })
    }

    // Check if room already exists for this combination
    const existing = await db.chatRoom.findFirst({
      where: {
        type: body.type,
        waliId: body.waliId,
        guruId: body.guruId || null,
        santriId: body.santriId || null,
        isActive: true,
      },
    })
    if (existing) return NextResponse.json({ data: existing, message: "Chat room sudah ada" })

    const room = await db.chatRoom.create({
      data: {
        type: body.type,
        waliId: body.waliId,
        guruId: body.guruId || null,
        santriId: body.santriId || null,
        title: body.title || null,
      },
      include: {
        wali: { select: { name: true } },
        guru: { select: { name: true } },
      },
    })
    await logAudit(session, "CREATE", "CHAT_ROOM", room.id, { type: body.type }, req)
    return NextResponse.json({ data: room })
  } catch (error) {
    console.error("[chat room create] error:", error)
    return NextResponse.json({ error: "Gagal membuat chat room" }, { status: 500 })
  }
}
