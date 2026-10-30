import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"


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
