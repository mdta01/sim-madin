import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { tagihanUpdateSchema } from "@/lib/validation/keuangan"


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("tagihan:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await validateBody(req, tagihanUpdateSchema)
    if (!body.ok) return body.error
    const data = body.data

    const updated = await db.tagihan.update({
      where: { id },
      data: {
        ...data,
        // isoDateSchema already transforms to Date — pass through directly.
        dueDate: data.dueDate ?? undefined,
      },
      include: { santri: true, jenisTagihan: true },
    })

    await logAudit(session, "UPDATE", "TAGIHAN", id, { changes: data }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[tagihan update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate tagihan" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("tagihan:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.tagihan.delete({ where: { id } })
    await logAudit(session, "DELETE", "TAGIHAN", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[tagihan delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus tagihan" }, { status: 500 })
  }
}
