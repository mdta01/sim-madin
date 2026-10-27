import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { NILAI_BOBAT } from "@/lib/constants"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    const kelasId = searchParams.get("kelasId")
    const semesterId = searchParams.get("semesterId")

    let semId = semesterId
    if (!semId) {
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      semId = sem?.id
    }

    const where: any = {}
    if (santriId) where.santriId = santriId
    if (kelasId) where.kelasId = kelasId
    if (semId) where.semesterId = semId

    const rapor = await db.rapor.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true } },
        kelas: true,
        semester: true,
        tahunAjaran: true,
      },
      orderBy: [{ santri: { name: "asc" } }],
    })
    return NextResponse.json({ data: rapor, total: rapor.length })
  } catch (error) {
    console.error("[rapor list] error:", error)
    return NextResponse.json({ error: "Gagal memuat rapor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Generate rapor for all santri in a kelas
    if (body.kelasId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      if (!ta || !sem) return NextResponse.json({ error: "Tidak ada TA/semester aktif" }, { status: 400 })

      const santriList = await db.santri.findMany({
        where: { kelasId: body.kelasId, status: "AKTIF", deletedAt: null },
      })

      const results = []
      for (const santri of santriList) {
        // Count absensi
        const absensiList = await db.absensi.findMany({
          where: { santriId: santri.id, tahunAjaranId: ta.id },
        })
        const hadir = absensiList.filter(a => a.status === "HADIR").length
        const sakit = absensiList.filter(a => a.status === "SAKIT").length
        const izin = absensiList.filter(a => a.status === "IZIN").length
        const alfa = absensiList.filter(a => a.status === "ALFA").length

        // Upsert rapor
        const existing = await db.rapor.findUnique({
          where: { santriId_semesterId_tahunAjaranId: { santriId: santri.id, semesterId: sem.id, tahunAjaranId: ta.id } },
        })
        if (existing) {
          const updated = await db.rapor.update({
            where: { id: existing.id },
            data: { absensiHadir: hadir, absensiSakit: sakit, absensiIzin: izin, absensiAlfa: alfa },
          })
          results.push(updated)
        } else {
          const created = await db.rapor.create({
            data: {
              tahunAjaranId: ta.id,
              semesterId: sem.id,
              santriId: santri.id,
              kelasId: santri.kelasId!,
              absensiHadir: hadir,
              absensiSakit: sakit,
              absensiIzin: izin,
              absensiAlfa: alfa,
              notes: body.notes || null,
            },
          })
          results.push(created)
        }
      }
      return NextResponse.json({ data: results, count: results.length })
    }

    if (!body.santriId) {
      return NextResponse.json({ error: "Santri atau Kelas wajib diisi" }, { status: 400 })
    }
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })
    if (!ta || !sem) return NextResponse.json({ error: "Tidak ada TA/semester aktif" }, { status: 400 })

    const santri = await db.santri.findUnique({ where: { id: body.santriId } })
    if (!santri) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 })

    const absensiList = await db.absensi.findMany({ where: { santriId: santri.id, tahunAjaranId: ta.id } })
    const existing = await db.rapor.findUnique({
      where: { santriId_semesterId_tahunAjaranId: { santriId: santri.id, semesterId: sem.id, tahunAjaranId: ta.id } },
    })

    const data = {
      absensiHadir: absensiList.filter(a => a.status === "HADIR").length,
      absensiSakit: absensiList.filter(a => a.status === "SAKIT").length,
      absensiIzin: absensiList.filter(a => a.status === "IZIN").length,
      absensiAlfa: absensiList.filter(a => a.status === "ALFA").length,
      notes: body.notes || null,
    }

    let rapor
    if (existing) {
      rapor = await db.rapor.update({ where: { id: existing.id }, data })
    } else {
      rapor = await db.rapor.create({
        data: {
          tahunAjaranId: ta.id,
          semesterId: sem.id,
          santriId: santri.id,
          kelasId: santri.kelasId!,
          ...data,
        },
      })
    }
    return NextResponse.json({ data: rapor })
  } catch (error) {
    console.error("[rapor create] error:", error)
    return NextResponse.json({ error: "Gagal generate rapor" }, { status: 500 })
  }
}
