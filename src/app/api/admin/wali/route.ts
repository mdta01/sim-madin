import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { waliCreateSchema } from "@/lib/validation/wali"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("wali:read", req)
  if (guard.error) return guard.error

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [{ name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }]
    }
    const wali = await db.wali.findMany({
      where,
      include: {
        _count: { select: { santri: { where: { deletedAt: null } } } },
        santri: { where: { deletedAt: null }, select: { id: true, name: true, nis: true, kelas: { select: { name: true } } }, take: 10, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ data: wali, total: wali.length })
  } catch (error) {
    console.error("[wali list] error:", error)
    return NextResponse.json({ error: "Gagal memuat data wali" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("wali:create", req)
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const body = await validateBody(req, waliCreateSchema)
    if (!body.ok) return body.error
    const { name, phone, email, nik, occupation, address, relationship } = body.data
    const wali = await db.wali.create({
      data: {
        name,
        phone,
        email: email || null,
        nik: nik || null,
        occupation: occupation || null,
        address: address || null,
        relationship: relationship || "WALI",
      },
      include: { _count: { select: { santri: true } } },
    })
    await logAudit(session, "CREATE", "WALI", wali.id, { name: wali.name, phone: wali.phone }, req)
    return NextResponse.json({ data: wali })
  } catch (error) {
    console.error("[wali create] error:", error)
    return NextResponse.json({ error: "Gagal menambah wali" }, { status: 500 })
  }
}
