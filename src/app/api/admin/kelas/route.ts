import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("kelas:read")
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const level = searchParams.get("level")
    const isActive = searchParams.get("isActive")
    const where: any = { deletedAt: null }
    if (level) where.level = level
    if (isActive !== null && isActive !== undefined && isActive !== "") where.isActive = isActive === "true"

    const kelas = await db.kelas.findMany({
      where,
      include: {
        _count: { select: { santri: { where: { status: "AKTIF", deletedAt: null } } } },
        waliKelas: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
    return NextResponse.json({ data: kelas, total: kelas.length })
  } catch (error) {
    console.error("[kelas list] error:", error)
    return NextResponse.json({ error: "Gagal memuat data kelas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("kelas:create")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.code || !body.name || !body.level) {
      return NextResponse.json({ error: "Kode, Nama, dan Level kelas wajib diisi" }, { status: 400 })
    }
    const existing = await db.kelas.findFirst({ where: { code: body.code } })
    if (existing) return NextResponse.json({ error: "Kode kelas sudah terdaftar" }, { status: 400 })

    const kelas = await db.kelas.create({
      data: {
        code: body.code,
        name: body.name,
        level: body.level,
        description: body.description || null,
        capacity: body.capacity || 30,
        sortOrder: body.sortOrder || 0,
        isActive: body.isActive !== false,
        waliKelasId: body.waliKelasId || null,
      },
      include: { waliKelas: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "KELAS", kelas.id, { code: kelas.code, name: kelas.name }, req)
    return NextResponse.json({ data: kelas })
  } catch (error) {
    console.error("[kelas create] error:", error)
    return NextResponse.json({ error: "Gagal menambah kelas" }, { status: 500 })
  }
}
