import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * POST /api/admin/notifikasi/mark-all-read
 * Mark all unread notifications as read.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("notifikasi:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const result = await db.notifikasi.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    await logAudit(session, "UPDATE", "NOTIFIKASI", undefined, { action: "mark_all_read", count: result.count }, req)
    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error("[notifikasi mark all read] error:", error)
    return NextResponse.json({ error: "Gagal menandai semua dibaca" }, { status: 500 })
  }
}
