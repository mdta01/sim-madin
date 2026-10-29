import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"
import { getAkhlakPredikat } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("perkembangan:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
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

    const data = await db.akhlakPenilaian.findMany({
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
    console.error("[akhlak list] error:", error)
    return NextResponse.json({ error: "Gagal memuat penilaian akhlak" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("perkembangan:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.santriId) {
      return NextResponse.json({ error: "Santri wajib diisi" }, { status: 400 })
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

    const accessCheck = await validateGuruAccess(session, { guruId: body.guruId }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error
    let guruId = body.guruId
    if (!guruId && accessCheck.guru) guruId = accessCheck.guru.id

    // Compute rata-rata & predikat (V4 — 6 aspek akhlak)
    const scores = [
      Number(body.adabGuru) || 0,
      Number(body.adabOrangTua) || 0,
      Number(body.adabTeman) || 0,
      Number(body.kedisiplinan) || 0,
      Number(body.kebersihan) || 0,
      Number(body.tanggungJawab) || 0,
    ]
    const rataRata = Math.round((scores.reduce((a, b) => a + b, 0) / 6) * 10) / 10
    const predikat = body.predikat || getAkhlakPredikat(rataRata)

    const data = await db.akhlakPenilaian.create({
      data: {
        tahunAjaranId,
        semesterId,
        santriId: body.santriId,
        guruId,
        adabGuru: Number(body.adabGuru) || 0,
        adabOrangTua: Number(body.adabOrangTua) || 0,
        adabTeman: Number(body.adabTeman) || 0,
        kedisiplinan: Number(body.kedisiplinan) || 0,
        kebersihan: Number(body.kebersihan) || 0,
        tanggungJawab: Number(body.tanggungJawab) || 0,
        rataRata,
        predikat,
        catatan: body.catatan || null,
        periode: body.periode || "BULANAN",
        periodeDate: body.periodeDate ? new Date(body.periodeDate) : new Date(),
      },
      include: { santri: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "AKHLAK_PENILAIAN", data.id, {
      santri: data.santri?.name, rataRata, predikat,
    }, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[akhlak create] error:", error)
    return NextResponse.json({ error: "Gagal menambah penilaian akhlak" }, { status: 500 })
  }
}
