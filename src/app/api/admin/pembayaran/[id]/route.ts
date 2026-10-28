import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("pembayaran:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.payment.update({
      where: { id },
      data: body,
      include: { santri: true, tagihan: { include: { jenisTagihan: true } } },
    })
    await logAudit(session, "UPDATE", "PEMBAYARAN", id, { changes: body }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[pembayaran update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate pembayaran" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("pembayaran:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const payment = await db.payment.findUnique({ where: { id } })
    if (payment?.tagihanId) {
      const tagihan = await db.tagihan.findUnique({ where: { id: payment.tagihanId } })
      if (tagihan) {
        const newPaid = Math.max(0, tagihan.paidAmount - payment.amount)
        await db.tagihan.update({
          where: { id: tagihan.id },
          data: { paidAmount: newPaid, status: newPaid >= tagihan.amount ? "LUNAS" : (newPaid > 0 ? "CICIL" : "BELUM_BAYAR") },
        })
      }
    }
    await db.payment.delete({ where: { id } })
    await logAudit(session, "DELETE", "PEMBAYARAN", id, { invoiceNo: payment?.invoiceNo }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[pembayaran delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus pembayaran" }, { status: 500 })
  }
}
