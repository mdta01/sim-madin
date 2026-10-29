import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("perkembangan:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    const periode = searchParams.get("periode")
    let tahunAjaranId = searchParams.get("tahunAjaranId")
    let semesterId = searchParams.get("semesterId")

    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }
    if (!semesterId) {
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      semesterId = sem?.id ?? null
    }

    const where: any = {}
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (semesterId) where.semesterId = semesterId
    if (santriId) where.santriId = santriId
    if (periode) where.periode = periode

    const data = await db.catatanWaliKelas.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
        guru: { select: { id: true, name: true } },
      },
      orderBy: [{ periodeDate: "desc" }, { santri: { name: "asc" } }],
      take: 500,
    })
    return NextResponse.json({ data, total: data.length })
  } catch (error) {
    console.error("[catatan wali list] error:", error)
    return NextResponse.json({ error: "Gagal memuat catatan wali kelas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("perkembangan:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.santriId || !body.catatan || !body.periode) {
      return NextResponse.json({ error: "Santri, Catatan, dan Periode wajib diisi" }, { status: 400 })
    }

    let tahunAjaranId = body.tahunAjaranId
    let semesterId = body.semesterId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }
    if (!semesterId) {
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      semesterId = sem?.id ?? null
    }

    const data = await db.catatanWaliKelas.create({
      data: {
        tahunAjaranId,
        semesterId,
        santriId: body.santriId,
        waliKelasId: body.waliKelasId || null,
        periode: body.periode,
        periodeDate: body.periodeDate ? new Date(body.periodeDate) : new Date(),
        catatan: body.catatan,
        rekomendasi: body.rekomendasi || null,
      },
      include: { santri: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "CATATAN_WALI_KELAS", data.id, {
      santri: data.santri?.name, periode: data.periode,
    }, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[catatan wali create] error:", error)
    return NextResponse.json({ error: "Gagal menambah catatan wali kelas" }, { status: 500 })
  }
}
