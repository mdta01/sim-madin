import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("kas:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const transaksi = await db.transaksiKas.findUnique({ where: { id } })
    if (!transaksi) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })

    await db.$transaction(async (tx) => {
      await tx.transaksiKas.delete({ where: { id } })
      // Reverse kas balance
      const kas = await tx.kas.findUnique({ where: { id: transaksi.kasId } })
      if (kas) {
        const adjustment = transaksi.type === "PEMASUKAN" ? -transaksi.amount : transaksi.amount
        await tx.kas.update({
          where: { id: transaksi.kasId },
          data: { balance: kas.balance + adjustment },
        })
      }
    })

    await logAudit(session, "DELETE", "TRANSAKSI_KAS", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[transaksi delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus transaksi" }, { status: 500 })
  }
}
