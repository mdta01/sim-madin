import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { jenisTagihanCreateSchema } from "@/lib/validation/keuangan"

export async function GET(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error
  try {
    const jt = await db.jenisTagihan.findMany({ orderBy: { name: "asc" } })
    return NextResponse.json({ data: jt })
  } catch (error) {
    console.error("[jenis-tagihan list] error:", error)
    return NextResponse.json({ error: "Gagal memuat jenis tagihan" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Hanya super admin / bendahara yang bisa kelola jenis tagihan
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error
  const session = guard.session
  const canManage = session.user.roles?.some(r => ["SUPER_ADMIN", "BENDAHARA"].includes(r))
  if (!canManage) {
    return NextResponse.json({ error: "Hanya Super Admin atau Bendahara" }, { status: 403 })
  }
  try {
    const body = await validateBody(req, jenisTagihanCreateSchema)
    if (!body.ok) return body.error
    const { code, name, description, defaultAmount, category, isActive } = body.data

    const existing = await db.jenisTagihan.findFirst({ where: { code } })
    if (existing) return NextResponse.json({ error: "Kode sudah terdaftar" }, { status: 400 })

    const jt = await db.jenisTagihan.create({
      data: {
        code,
        name,
        description: description || null,
        defaultAmount,
        category: category || "RUTIN",
        isActive: isActive !== false,
      },
    })
    await logAudit(session, "CREATE", "JENIS_TAGIHAN", jt.id, { code: jt.code, name: jt.name }, req)
    return NextResponse.json({ data: jt })
  } catch (error) {
    console.error("[jenis-tagihan create] error:", error)
    return NextResponse.json({ error: "Gagal menambah jenis tagihan" }, { status: 500 })
  }
}
