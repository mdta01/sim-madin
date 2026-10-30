import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { kasCreateSchema } from "@/lib/validation/keuangan"

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
    const body = await validateBody(req, kasCreateSchema)
    if (!body.ok) return body.error
    const { code, name, accountNumber, bankName, type, balance, isActive } = body.data

    const existing = await db.kas.findFirst({ where: { code } })
    if (existing) return NextResponse.json({ error: "Kode kas sudah ada" }, { status: 400 })

    const kas = await db.kas.create({
      data: {
        code,
        name,
        accountNumber: accountNumber || null,
        bankName: bankName || null,
        type,
        balance,
        isActive,
      },
    })
    await logAudit(session, "CREATE", "KAS", kas.id, { code: kas.code, name: kas.name }, req)
    return NextResponse.json({ data: kas })
  } catch (error) {
    console.error("[kas create] error:", error)
    return NextResponse.json({ error: "Gagal membuat kas" }, { status: 500 })
  }
}
