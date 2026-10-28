import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("absensi:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.absensi.delete({ where: { id } })
    await logAudit(session, "DELETE", "ABSENSI", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[absensi delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus absensi" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("absensi:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.absensi.update({ where: { id }, data: body })
    await logAudit(session, "UPDATE", "ABSENSI", id, { changes: body }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[absensi update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate absensi" }, { status: 500 })
  }
}
