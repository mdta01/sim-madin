import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("guru:read")
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")
    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [{ name: { contains: search } }, { nip: { contains: search } }, { phone: { contains: search } }]
    }
    if (status) where.status = status
    const guru = await db.guru.findMany({
      where,
      include: {
        _count: { select: { jadwal: true, kelasWali: true, nilai: true } },
        kelasWali: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ data: guru, total: guru.length })
  } catch (error) {
    console.error("[guru list] error:", error)
    return NextResponse.json({ error: "Gagal memuat data guru" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("guru:create")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.name || !body.gender) {
      return NextResponse.json({ error: "Nama dan Jenis Kelamin wajib diisi" }, { status: 400 })
    }
    const guru = await db.guru.create({
      data: {
        name: body.name,
        gender: body.gender,
        nip: body.nip || null,
        nuptk: body.nuptk || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        birthPlace: body.birthPlace || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        specialization: body.specialization || null,
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
        status: body.status || "AKTIF",
        photoUrl: body.photoUrl || null,
        userId: body.userId || null,
      },
    })
    await logAudit(session, "CREATE", "GURU", guru.id, { name: guru.name }, req)
    return NextResponse.json({ data: guru })
  } catch (error) {
    console.error("[guru create] error:", error)
    return NextResponse.json({ error: "Gagal menambah guru" }, { status: 500 })
  }
}
