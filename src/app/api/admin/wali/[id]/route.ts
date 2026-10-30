import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { waliUpdateSchema } from "@/lib/validation/wali"


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("wali:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await validateBody(req, waliUpdateSchema)
    if (!body.ok) return body.error
    const updated = await db.wali.update({ where: { id }, data: body.data, include: { _count: { select: { santri: true } } } })
    await logAudit(session, "UPDATE", "WALI", id, { changes: body.data }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[wali update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate wali" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("wali:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.wali.update({ where: { id }, data: { deletedAt: new Date() } })
    await logAudit(session, "DELETE", "WALI", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[wali delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus wali" }, { status: 500 })
  }
}
