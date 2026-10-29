import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("perkembangan:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.pembinaan.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 })

    // If status changes to RESOLVED/CLOSED, set resolvedAt + resolvedById
    const updateData: any = {
      type: body.type ?? existing.type,
      category: body.category ?? existing.category,
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      severity: body.severity ?? existing.severity,
      tindakan: body.tindakan ?? existing.tindakan,
      status: body.status ?? existing.status,
    }
    if (body.status === "RESOLVED" || body.status === "CLOSED") {
      if (!existing.resolvedAt) updateData.resolvedAt = new Date()
      if (!existing.resolvedById) updateData.resolvedById = session.user.id
    }

    const data = await db.pembinaan.update({
      where: { id },
      data: updateData,
    })
    await logAudit(session, "UPDATE", "PEMBINAAN", id, { status: data.status }, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[pembinaan update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("perkembangan:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.pembinaan.delete({ where: { id } })
    await logAudit(session, "DELETE", "PEMBINAAN", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[pembinaan delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 })
  }
}
