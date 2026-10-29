import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("kas:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.kas.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Kas tidak ditemukan" }, { status: 404 })

    const kas = await db.kas.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        accountNumber: body.accountNumber ?? existing.accountNumber,
        bankName: body.bankName ?? existing.bankName,
        balance: body.balance ?? existing.balance,
        isActive: body.isActive ?? existing.isActive,
      },
    })
    await logAudit(session, "UPDATE", "KAS", id, { name: kas.name }, req)
    return NextResponse.json({ data: kas })
  } catch (error) {
    console.error("[kas update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui kas" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("kas:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.kas.update({ where: { id }, data: { isActive: false } })
    await logAudit(session, "DELETE", "KAS", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[kas delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus kas" }, { status: 500 })
  }
}
