import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { mapelUpdateSchema } from "@/lib/validation/akademik"


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("mapel:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await validateBody(req, mapelUpdateSchema)
    if (!body.ok) return body.error
    const updated = await db.mataPelajaran.update({ where: { id }, data: body.data })
    await logAudit(session, "UPDATE", "MAPEL", id, { changes: body.data }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[mapel update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate mapel" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("mapel:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.mataPelajaran.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await logAudit(session, "DELETE", "MAPEL", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[mapel delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus mapel" }, { status: 500 })
  }
}
