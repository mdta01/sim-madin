import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("guru:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.guru.update({
      where: { id },
      data: {
        ...body,
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
        joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
      },
    })
    await logAudit(session, "UPDATE", "GURU", id, { changes: body }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[guru update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate guru" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("guru:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.guru.update({ where: { id }, data: { deletedAt: new Date(), status: "KELUAR" } })
    await logAudit(session, "DELETE", "GURU", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[guru delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus guru" }, { status: 500 })
  }
}
