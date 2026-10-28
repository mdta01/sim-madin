import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("pembayaran:read")
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    const status = searchParams.get("status")
    const method = searchParams.get("method")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const where: any = {}
    if (santriId) where.santriId = santriId
    if (status) where.status = status
    if (method) where.paymentMethod = method
    if (dateFrom || dateTo) {
      where.paymentDate = {}
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom)
      if (dateTo) where.paymentDate.lte = new Date(new Date(dateTo).getTime() + 86400000 - 1)
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true } },
        tagihan: { include: { jenisTagihan: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paymentDate: "desc" },
      take: 200,
    })
    return NextResponse.json({ data: payments, total: payments.length })
  } catch (error) {
    console.error("[pembayaran list] error:", error)
    return NextResponse.json({ error: "Gagal memuat pembayaran" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("pembayaran:create")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.santriId || !body.amount || !body.paymentMethod) {
      return NextResponse.json({ error: "Santri, Nominal, dan Metode wajib diisi" }, { status: 400 })
    }

    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })

    const count = await db.payment.count()
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`

    const payment = await db.payment.create({
      data: {
        invoiceNo,
        tahunAjaranId: ta?.id,
        tagihanId: body.tagihanId || null,
        santriId: body.santriId,
        amount: Number(body.amount),
        paymentMethod: body.paymentMethod,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        status: body.status || "VERIFIED",
        note: body.note || null,
        proofUrl: body.proofUrl || null,
        recordedById: session.user.id,
      },
      include: { santri: true, tagihan: { include: { jenisTagihan: true } } },
    })

    if (body.tagihanId) {
      const tagihan = await db.tagihan.findUnique({ where: { id: body.tagihanId } })
      if (tagihan) {
        const newPaidAmount = tagihan.paidAmount + Number(body.amount)
        const newStatus = newPaidAmount >= tagihan.amount ? "LUNAS" : "CICIL"
        await db.tagihan.update({
          where: { id: tagihan.id },
          data: { paidAmount: newPaidAmount, status: newStatus },
        })
      }
    }

    await logAudit(session, "CREATE", "PEMBAYARAN", payment.id, {
      invoiceNo, santri: payment.santri.name, amount: payment.amount, method: payment.paymentMethod,
    }, req)
    return NextResponse.json({ data: payment })
  } catch (error) {
    console.error("[pembayaran create] error:", error)
    return NextResponse.json({ error: "Gagal mencatat pembayaran" }, { status: 500 })
  }
}
