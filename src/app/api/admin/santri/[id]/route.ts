import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { santriUpdateSchema } from "@/lib/validation/santri"


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("santri:update", req)
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const { id } = await params
    const body = await validateBody(req, santriUpdateSchema)
    if (!body.ok) return body.error
    const data = body.data

    const updated = await db.santri.update({
      where: { id },
      data: {
        ...data,
        birthDate: data.birthDate ?? undefined,
        entryDate: data.entryDate ?? undefined,
      },
      include: { kelas: true, wali: true },
    })

    await logAudit(session, "UPDATE", "SANTRI", id, { changes: data }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[santri update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate santri" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("santri:delete", req)
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const { id } = await params
    // Soft delete
    await db.santri.update({ where: { id }, data: { deletedAt: new Date(), status: "KELUAR" } })
    await logAudit(session, "DELETE", "SANTRI", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[santri delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus santri" }, { status: 500 })
  }
}
