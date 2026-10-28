import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("nilai:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.nilai.delete({ where: { id } })
    await logAudit(session, "DELETE", "NILAI", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[nilai delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus nilai" }, { status: 500 })
  }
}
