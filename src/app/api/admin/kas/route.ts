import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("kas:read", req)
  if (guard.error) return guard.error
  try {
    const kasList = await db.kas.findMany({
      where: { isActive: true },
      include: { _count: { select: { transaksi: true, payments: true } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    })

    // Compute total balance
    const totalBalance = kasList.reduce((sum, k) => sum + k.balance, 0)

    return NextResponse.json({ data: kasList, totalBalance })
  } catch (error) {
    console.error("[kas list] error:", error)
    return NextResponse.json({ error: "Gagal memuat kas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("kas:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.code || !body.name || !body.type) {
      return NextResponse.json({ error: "Kode, Nama, dan Tipe wajib diisi" }, { status: 400 })
    }

    const existing = await db.kas.findFirst({ where: { code: body.code } })
    if (existing) return NextResponse.json({ error: "Kode kas sudah ada" }, { status: 400 })

    const kas = await db.kas.create({
      data: {
        code: body.code,
        name: body.name,
        accountNumber: body.accountNumber || null,
        bankName: body.bankName || null,
        type: body.type,
        balance: body.balance || 0,
        isActive: body.isActive !== false,
      },
    })
    await logAudit(session, "CREATE", "KAS", kas.id, { code: kas.code, name: kas.name }, req)
    return NextResponse.json({ data: kas })
  } catch (error) {
    console.error("[kas create] error:", error)
    return NextResponse.json({ error: "Gagal membuat kas" }, { status: 500 })
  }
}
