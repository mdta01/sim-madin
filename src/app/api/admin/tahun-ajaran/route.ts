import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET() {
  const guard = await requireApiPermission("tahun_ajaran:read")
  if (guard.error) return guard.error
  try {
    const ta = await db.tahunAjaran.findMany({
      include: { _count: { select: { semesters: true, santri: true } } },
      orderBy: { startDate: "desc" },
    })
    return NextResponse.json({ data: ta })
  } catch (error) {
    console.error("[tahun-ajaran list] error:", error)
    return NextResponse.json({ error: "Gagal memuat tahun ajaran" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("tahun_ajaran:create")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.code || !body.name || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: "Kode, Nama, tgl mulai & selesai wajib diisi" }, { status: 400 })
    }
    const existing = await db.tahunAjaran.findFirst({ where: { code: body.code } })
    if (existing) return NextResponse.json({ error: "Kode sudah terdaftar" }, { status: 400 })

    if (body.isActive) {
      await db.tahunAjaran.updateMany({ where: { isActive: true }, data: { isActive: false } })
    }

    const ta = await db.tahunAjaran.create({
      data: {
        code: body.code,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        isActive: body.isActive || false,
      },
    })

    if (body.createSemesters !== false) {
      await db.semester.create({
        data: {
          tahunAjaranId: ta.id,
          code: `${ta.code}-GANJIL`,
          name: "Ganjil",
          type: "GANJIL",
          startDate: new Date(body.startDate),
          endDate: new Date(new Date(body.startDate).getTime() + 6 * 30 * 86400000),
          isActive: body.isActive || false,
        },
      })
      await db.semester.create({
        data: {
          tahunAjaranId: ta.id,
          code: `${ta.code}-GENAP`,
          name: "Genap",
          type: "GENAP",
          startDate: new Date(new Date(body.startDate).getTime() + 6 * 30 * 86400000 + 86400000),
          endDate: new Date(body.endDate),
          isActive: false,
        },
      })
    }

    await logAudit(session, "CREATE", "TAHUN_AJARAN", ta.id, { code: ta.code, name: ta.name }, req)
    return NextResponse.json({ data: ta })
  } catch (error) {
    console.error("[tahun-ajaran create] error:", error)
    return NextResponse.json({ error: "Gagal menambah tahun ajaran" }, { status: 500 })
  }
}
