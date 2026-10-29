import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * GET /api/admin/kas/transaksi
 * Query: kasId, type, category, dateFrom, dateTo, limit
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("kas:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const kasId = searchParams.get("kasId")
    const type = searchParams.get("type")
    const category = searchParams.get("category")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const limit = Math.min(Number(searchParams.get("limit")) || 500, 500)

    const where: any = {}
    if (kasId) where.kasId = kasId
    if (type) where.type = type
    if (category) where.category = category
    if (dateFrom || dateTo) {
      where.transaksiDate = {}
      if (dateFrom) where.transaksiDate.gte = new Date(dateFrom)
      if (dateTo) where.transaksiDate.lte = new Date(new Date(dateTo).getTime() + 86400000 - 1)
    }

    const data = await db.transaksiKas.findMany({
      where,
      include: {
        kas: { select: { id: true, name: true, code: true } },
        payment: { select: { id: true, invoiceNo: true, santri: { select: { name: true } } } },
        honorGuru: { select: { id: true, periodeLabel: true, guru: { select: { name: true } } } },
      },
      orderBy: { transaksiDate: "desc" },
      take: limit,
    })

    // Compute summary
    const totalPemasukan = data.filter((t) => t.type === "PEMASUKAN").reduce((s, t) => s + t.amount, 0)
    const totalPengeluaran = data.filter((t) => t.type === "PENGELUARAN").reduce((s, t) => s + t.amount, 0)

    return NextResponse.json({
      data,
      total: data.length,
      summary: {
        totalPemasukan,
        totalPengeluaran,
        saldo: totalPemasukan - totalPengeluaran,
      },
    })
  } catch (error) {
    console.error("[transaksi list] error:", error)
    return NextResponse.json({ error: "Gagal memuat transaksi kas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("kas:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.kasId || !body.type || !body.category || !body.amount || !body.description) {
      return NextResponse.json({ error: "Kas, Tipe, Kategori, Nominal, dan Deskripsi wajib diisi" }, { status: 400 })
    }

    let tahunAjaranId = body.tahunAjaranId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }

    const transaksi = await db.$transaction(async (tx) => {
      // Create transaksi
      const t = await tx.transaksiKas.create({
        data: {
          kasId: body.kasId,
          tahunAjaranId,
          type: body.type,
          category: body.category,
          amount: Number(body.amount),
          description: body.description,
          reference: body.reference || null,
          paymentId: body.paymentId || null,
          honorGuruId: body.honorGuruId || null,
          transaksiDate: body.transaksiDate ? new Date(body.transaksiDate) : new Date(),
          recordedById: session.user.id,
        },
      })

      // Update kas balance
      const kas = await tx.kas.findUnique({ where: { id: body.kasId } })
      if (kas) {
        const adjustment = body.type === "PEMASUKAN" ? Number(body.amount) : -Number(body.amount)
        await tx.kas.update({
          where: { id: body.kasId },
          data: { balance: kas.balance + adjustment },
        })
      }

      return t
    })

    await logAudit(session, "CREATE", "TRANSAKSI_KAS", transaksi.id, {
      type: transaksi.type, amount: transaksi.amount, description: transaksi.description,
    }, req)

    return NextResponse.json({ data: transaksi })
  } catch (error) {
    console.error("[transaksi create] error:", error)
    return NextResponse.json({ error: "Gagal membuat transaksi kas" }, { status: 500 })
  }
}
