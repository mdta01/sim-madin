import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken } from "@/lib/wali/auth"

interface Params { params: Promise<{ id: string }> }

/**
 * PUT /api/wali/notifikasi/[id]
 * Mark a notification as read.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { id } = await params
    const notif = await db.notifikasi.findUnique({ where: { id } })
    if (!notif) return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 })

    // Verify ownership
    if (notif.waliId !== session.waliId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updated = await db.notifikasi.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[wali notifikasi mark read] error:", error)
    return NextResponse.json({ error: "Gagal update notifikasi" }, { status: 500 })
  }
}

/**
 * DELETE /api/wali/notifikasi/[id]
 * Delete a notification (only own).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { id } = await params
    const notif = await db.notifikasi.findUnique({ where: { id } })
    if (!notif) return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 })
    if (notif.waliId !== session.waliId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.notifikasi.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[wali notifikasi delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus notifikasi" }, { status: 500 })
  }
}
