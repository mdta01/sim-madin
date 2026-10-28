import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("tagihan:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const tagihan = await db.tagihan.findUnique({
      where: { id },
      include: { santri: true, kelas: true, jenisTagihan: true, payments: { orderBy: { paymentDate: "desc" } } },
    })
    if (!tagihan) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: tagihan })
  } catch (error) {
    console.error("[tagihan get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail tagihan" }, { status: 500 })
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
