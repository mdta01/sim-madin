import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken } from "@/lib/wali/auth"

/**
 * GET /api/wali/chat
 * List chat rooms for logged-in wali.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const rooms = await db.chatRoom.findMany({
      where: { waliId: session.waliId, isActive: true },
      include: {
        guru: { select: { id: true, name: true, phone: true } },
        santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
        _count: { select: { messages: { where: { isRead: false, senderType: { not: "WALI" } } } } },
      },
      orderBy: { lastMessageAt: "desc" },
    })

    return NextResponse.json({ data: rooms, total: rooms.length })
  } catch (error) {
    console.error("[wali chat list] error:", error)
    return NextResponse.json({ error: "Gagal memuat chat" }, { status: 500 })
  }
}

/**
 * POST /api/wali/chat
 * Create a new chat room (wali-initiated) or start a conversation.
 * Body: { type: "WALI_MADRASAH" | "WALI_WALI_KELAS" | "GURU_WALI", guruId?, santriId? }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const body = await req.json()
    if (!body.type) return NextResponse.json({ error: "Tipe chat wajib diisi" }, { status: 400 })

    // Check if room already exists
    const existing = await db.chatRoom.findFirst({
      where: {
        type: body.type,
        waliId: session.waliId,
        guruId: body.guruId || null,
        santriId: body.santriId || null,
        isActive: true,
      },
    })
    if (existing) return NextResponse.json({ data: existing, message: "Chat room sudah ada" })

    // For WALI_WALI_KELAS, auto-find wali kelas for santri's kelas
    let guruId = body.guruId || null
    if (body.type === "WALI_WALI_KELAS" && body.santriId && !guruId) {
      const santri = await db.santri.findUnique({
        where: { id: body.santriId },
        include: { kelas: { include: { waliKelas: true } } },
      })
      guruId = santri?.kelas?.waliKelasId || null
    }

    const room = await db.chatRoom.create({
      data: {
        type: body.type,
        waliId: session.waliId,
        guruId,
        santriId: body.santriId || null,
      },
      include: {
        guru: { select: { name: true } },
        santri: { select: { name: true } },
      },
    })

    return NextResponse.json({ data: room })
  } catch (error) {
    console.error("[wali chat create] error:", error)
    return NextResponse.json({ error: "Gagal membuat chat room" }, { status: 500 })
  }
}
