import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { jadwalCreateSchema } from "@/lib/validation/akademik-detail"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("jadwal:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const kelasId = searchParams.get("kelasId")
    const guruId = searchParams.get("guruId")
    const dayOfWeek = searchParams.get("dayOfWeek")
    const taId = searchParams.get("tahunAjaranId")
    const semId = searchParams.get("semesterId")

    let tahunAjaranId = taId
    let semesterId = semId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }
    if (!semesterId) {
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      semesterId = sem?.id ?? null
    }

    const where: any = {}
    if (kelasId) where.kelasId = kelasId
    if (guruId) where.guruId = guruId
    if (dayOfWeek) where.dayOfWeek = Number(dayOfWeek)
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (semesterId) where.semesterId = semesterId

    const jadwal = await db.jadwal.findMany({
      where,
      include: { kelas: true, mapel: true, guru: { select: { id: true, name: true } }, semester: true, tahunAjaran: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })
    return NextResponse.json({ data: jadwal, total: jadwal.length })
  } catch (error) {
    console.error("[jadwal list] error:", error)
    return NextResponse.json({ error: "Gagal memuat jadwal" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("jadwal:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await validateBody(req, jadwalCreateSchema)
    if (!body.ok) return body.error
    const { kelasId, mapelId, guruId, dayOfWeek, startTime, endTime, tahunAjaranId: bodyTA, semesterId: bodySem } = body.data

    let ta = bodyTA
    let sem = bodySem
    if (!ta) {
      const taObj = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      ta = taObj?.id
    }
    if (!sem) {
      const semObj = await db.semester.findFirst({ where: { isActive: true } })
      sem = semObj?.id
    }
    if (!ta || !sem) return NextResponse.json({ error: "Tahun ajaran/semester aktif tidak ditemukan" }, { status: 400 })

    // Check for duplicate jadwal (same kelas, mapel, day, time, TA, semester)
    const existing = await db.jadwal.findFirst({
      where: {
        kelasId, mapelId,
        dayOfWeek, startTime,
        tahunAjaranId: ta, semesterId: sem,
      },
    })
    if (existing) {
      return NextResponse.json({ error: "Jadwal dengan kombinasi yang sama sudah ada" }, { status: 400 })
    }

    const jadwal = await db.jadwal.create({
      data: {
        tahunAjaranId: ta,
        semesterId: sem,
        kelasId,
        mapelId,
        guruId,
        dayOfWeek,
        startTime,
        endTime,
      },
      include: { kelas: true, mapel: true, guru: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "JADWAL", jadwal.id, {
      kelas: jadwal.kelas?.code, mapel: jadwal.mapel?.name, day: jadwal.dayOfWeek, time: `${jadwal.startTime}-${jadwal.endTime}`,
    }, req)
    return NextResponse.json({ data: jadwal })
  } catch (error) {
    console.error("[jadwal create] error:", error)
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 })
  }
}
