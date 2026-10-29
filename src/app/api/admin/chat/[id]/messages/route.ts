import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/chat/[id]/messages
 * List messages in a chat room.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("chat:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const messages = await db.chatMessage.findMany({
      where: { chatRoomId: id },
      orderBy: { createdAt: "asc" },
      take: 200,
    })
    return NextResponse.json({ data: messages, total: messages.length })
  } catch (error) {
    console.error("[chat messages list] error:", error)
    return NextResponse.json({ error: "Gagal memuat pesan" }, { status: 500 })
  }
}

/**
 * POST /api/admin/chat/[id]/messages
 * Send a message as admin.
 * Body: { message, senderUserId }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("chat:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    if (!body.message) return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 })

    const room = await db.chatRoom.findUnique({ where: { id } })
    if (!room) return NextResponse.json({ error: "Chat room tidak ditemukan" }, { status: 404 })

    const msg = await db.chatMessage.create({
      data: {
        chatRoomId: id,
        senderType: "ADMIN",
        senderUserId: session.user.id,
        message: body.message,
        attachments: body.attachments || null,
      },
    })

    // Update room lastMessage
    await db.chatRoom.update({
      where: { id },
      data: { lastMessage: body.message.slice(0, 100), lastMessageAt: new Date() },
    })

    await logAudit(session, "CREATE", "CHAT_MESSAGE", msg.id, { chatRoomId: id }, req)
    return NextResponse.json({ data: msg })
  } catch (error) {
    console.error("[chat message send] error:", error)
    return NextResponse.json({ error: "Gagal mengirim pesan" }, { status: 500 })
  }
}
