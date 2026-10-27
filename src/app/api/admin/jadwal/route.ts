import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const kelasId = searchParams.get("kelasId")
    const guruId = searchParams.get("guruId")
    const dayOfWeek = searchParams.get("dayOfWeek")
    const taId = searchParams.get("tahunAjaranId")
    const semId = searchParams.get("semesterId")

    // Get active TA & semester if not provided
    let tahunAjaranId = taId
    let semesterId = semId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id
    }
    if (!semesterId) {
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      semesterId = sem?.id
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
  try {
    const body = await req.json()
    if (!body.kelasId || !body.mapelId || !body.guruId || !body.dayOfWeek || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: "Kelas, Mapel, Guru, Hari, Jam mulai & selesai wajib diisi" }, { status: 400 })
    }

    // Get active TA & semester
    let ta = body.tahunAjaranId
    let sem = body.semesterId
    if (!ta) {
      const taObj = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      ta = taObj?.id
    }
    if (!sem) {
      const semObj = await db.semester.findFirst({ where: { isActive: true } })
      sem = semObj?.id
    }
    if (!ta || !sem) return NextResponse.json({ error: "Tahun ajaran/semester aktif tidak ditemukan" }, { status: 400 })

    const jadwal = await db.jadwal.create({
      data: {
        tahunAjaranId: ta,
        semesterId: sem,
        kelasId: body.kelasId,
        mapelId: body.mapelId,
        guruId: body.guruId,
        dayOfWeek: Number(body.dayOfWeek),
        startTime: body.startTime,
        endTime: body.endTime,
      },
      include: { kelas: true, mapel: true, guru: { select: { name: true } } },
    })
    return NextResponse.json({ data: jadwal })
  } catch (error) {
    console.error("[jadwal create] error:", error)
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 })
  }
}
