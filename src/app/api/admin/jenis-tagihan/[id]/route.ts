import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth, logAudit } from "@/lib/auth/guards"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session
  const canManage = session.user.roles?.some(r => ["SUPER_ADMIN", "BENDAHARA"].includes(r))
  if (!canManage) {
    return NextResponse.json({ error: "Hanya Super Admin atau Bendahara" }, { status: 403 })
  }
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.jenisTagihan.update({ where: { id }, data: body })
    await logAudit(session, "UPDATE", "JENIS_TAGIHAN", id, { changes: Object.keys(body) }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[jenis-tagihan update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate jenis tagihan" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session
  const canManage = session.user.roles?.some(r => ["SUPER_ADMIN", "BENDAHARA"].includes(r))
  if (!canManage) {
    return NextResponse.json({ error: "Hanya Super Admin atau Bendahara" }, { status: 403 })
  }
  try {
    const { id } = await params
    await db.jenisTagihan.delete({ where: { id } })
    await logAudit(session, "DELETE", "JENIS_TAGIHAN", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[jenis-tagihan delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus jenis tagihan" }, { status: 500 })
  }
}
