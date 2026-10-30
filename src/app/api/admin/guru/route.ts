import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { guruCreateSchema } from "@/lib/validation/akademik"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("guru:read", req)
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
  const guard = await requireApiPermission("guru:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await validateBody(req, guruCreateSchema)
    if (!body.ok) return body.error
    const { name, gender, nip, nuptk, phone, email, address, birthPlace, birthDate, specialization, joinDate, status } = body.data
    const guru = await db.guru.create({
      data: {
        name,
        gender,
        nip: nip || null,
        nuptk: nuptk || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        birthPlace: birthPlace || null,
        birthDate: birthDate || null,
        specialization: specialization || null,
        joinDate: joinDate || new Date(),
        status: status || "AKTIF",
      },
    })
    await logAudit(session, "CREATE", "GURU", guru.id, { name: guru.name }, req)
    return NextResponse.json({ data: guru })
  } catch (error) {
    console.error("[guru create] error:", error)
    return NextResponse.json({ error: "Gagal menambah guru" }, { status: 500 })
  }
}
