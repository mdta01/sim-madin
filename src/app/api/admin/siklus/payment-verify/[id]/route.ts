import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * PUT /api/admin/siklus/payment-verify/[id]
 *
 * Verify payment + auto-create TransaksiKas PEMASUKAN (Siklus Keuangan integration).
 * Payment → Verifikasi → Kas → Pemasukan
 *
 * Body: { kasId: string } — kas account yang menerima pembayaran
 */
interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("pembayaran:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    if (!body.kasId) {
      return NextResponse.json({ error: "kasId wajib diisi — pilih kas yang menerima pembayaran" }, { status: 400 })
    }

    const payment = await db.payment.findUnique({
      where: { id },
      include: { santri: { select: { name: true } }, tagihan: { include: { jenisTagihan: true } } },
    })
    if (!payment) return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 })
    if (payment.status === "VERIFIED") {
      return NextResponse.json({ error: "Pembayaran sudah diverifikasi" }, { status: 400 })
    }

    const kas = await db.kas.findUnique({ where: { id: body.kasId, isActive: true } })
    if (!kas) return NextResponse.json({ error: "Kas tidak ditemukan" }, { status: 404 })

    await db.$transaction(async (tx) => {
      // 1. Update payment status to VERIFIED + set kasId
      await tx.payment.update({
        where: { id },
        data: { status: "VERIFIED", kasId: body.kasId, recordedById: session.user.id },
      })

      // 2. Update tagihan paidAmount + status
      if (payment.tagihanId) {
        const tagihan = await tx.tagihan.findUnique({ where: { id: payment.tagihanId } })
        if (tagihan) {
          const newPaidAmount = tagihan.paidAmount + payment.amount
          const newStatus = newPaidAmount >= tagihan.amount ? "LUNAS" : "CICIL"
          await tx.tagihan.update({
            where: { id: tagihan.id },
            data: { paidAmount: newPaidAmount, status: newStatus },
          })
        }
      }

      // 3. Auto-create TransaksiKas PEMASUKAN (Siklus Keuangan: Payment → Kas)
      await tx.transaksiKas.create({
        data: {
          kasId: body.kasId,
          tahunAjaranId: payment.tahunAjaranId,
          type: "PEMASUKAN",
          category: "PEMBAYARAN_SANTRI",
          amount: payment.amount,
          description: `Pembayaran ${payment.tagihan?.jenisTagihan?.name || "santri"} - ${payment.santri?.name || ""} (${payment.invoiceNo})`,
          reference: payment.invoiceNo,
          paymentId: id,
          transaksiDate: new Date(),
          recordedById: session.user.id,
        },
      })

      // 4. Update kas balance
      await tx.kas.update({
        where: { id: body.kasId },
        data: { balance: { increment: payment.amount } },
      })
    })

    await logAudit(session, "UPDATE", "PAYMENT_VERIFY", id, {
      invoiceNo: payment.invoiceNo, amount: payment.amount, kasId: body.kasId,
    }, req)

    return NextResponse.json({
      success: true,
      message: `Pembayaran ${payment.invoiceNo} diverifikasi. Saldo kas ${kas.name} bertambah.`,
    })
  } catch (error) {
    console.error("[payment verify] error:", error)
    return NextResponse.json({ error: "Gagal verifikasi pembayaran" }, { status: 500 })
  }
}
