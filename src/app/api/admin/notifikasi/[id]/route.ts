import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("notifikasi:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.notifikasi.delete({ where: { id } })
    await logAudit(session, "DELETE", "NOTIFIKASI", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[notifikasi delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus notifikasi" }, { status: 500 })
  }
}
