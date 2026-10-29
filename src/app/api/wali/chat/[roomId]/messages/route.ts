import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken } from "@/lib/wali/auth"

interface Params { params: Promise<{ roomId: string }> }

/**
 * GET /api/wali/chat/[roomId]/messages
 * List messages in a chat room.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { roomId } = await params
    const room = await db.chatRoom.findUnique({ where: { id: roomId } })
    if (!room || room.waliId !== session.waliId) {
      return NextResponse.json({ error: "Chat room tidak ditemukan" }, { status: 404 })
    }

    const messages = await db.chatMessage.findMany({
      where: { chatRoomId: roomId },
      orderBy: { createdAt: "asc" },
      take: 200,
    })

    // Mark messages from others as read
    await db.chatMessage.updateMany({
      where: { chatRoomId: roomId, senderType: { not: "WALI" }, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ data: messages, total: messages.length })
  } catch (error) {
    console.error("[wali chat messages] error:", error)
    return NextResponse.json({ error: "Gagal memuat pesan" }, { status: 500 })
  }
}

/**
 * POST /api/wali/chat/[roomId]/messages
 * Send a message as wali.
 * Body: { message }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { roomId } = await params
    const body = await req.json()
    if (!body.message) return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 })

    const room = await db.chatRoom.findUnique({ where: { id: roomId } })
    if (!room || room.waliId !== session.waliId) {
      return NextResponse.json({ error: "Chat room tidak ditemukan" }, { status: 404 })
    }

    const msg = await db.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderType: "WALI",
        senderWaliId: session.waliId,
        message: body.message,
        attachments: body.attachments || null,
      },
    })

    // Update room lastMessage
    await db.chatRoom.update({
      where: { id: roomId },
      data: { lastMessage: body.message.slice(0, 100), lastMessageAt: new Date() },
    })

    return NextResponse.json({ data: msg })
  } catch (error) {
    console.error("[wali chat send] error:", error)
    return NextResponse.json({ error: "Gagal mengirim pesan" }, { status: 500 })
  }
}
