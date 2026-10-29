import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

/**
 * GET /api/admin/perkembangan/quran
 * Query: santriId, type, status, tahunAjaranId, semesterId, search
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("perkembangan:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    const type = searchParams.get("type")
    const status = searchParams.get("status")
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
    if (type) where.type = type
    if (status) where.status = status

    const data = await db.perkembanganQuran.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
        guru: { select: { id: true, name: true } },
      },
      orderBy: [{ pertemuanDate: "desc" }, { santri: { name: "asc" } }],
      take: 500,
    })
    return NextResponse.json({ data, total: data.length })
  } catch (error) {
    console.error("[quran list] error:", error)
    return NextResponse.json({ error: "Gagal memuat perkembangan Quran" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("perkembangan:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.santriId || !body.type) {
      return NextResponse.json({ error: "Santri dan Tipe wajib diisi" }, { status: 400 })
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
    if (!tahunAjaranId || !semesterId) {
      return NextResponse.json({ error: "Tahun ajaran/semester aktif tidak ditemukan" }, { status: 400 })
    }

    // Auto-bind guruId
    const accessCheck = await validateGuruAccess(session, { guruId: body.guruId }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error
    let guruId = body.guruId
    if (!guruId && accessCheck.guru) guruId = accessCheck.guru.id

    const data = await db.perkembanganQuran.create({
      data: {
        tahunAjaranId,
        semesterId,
        santriId: body.santriId,
        guruId,
        type: body.type,
        surah: body.surah || null,
        juz: body.juz || null,
        ayatFrom: body.ayatFrom || null,
        ayatTo: body.ayatTo || null,
        score: body.score || null,
        status: body.status || "PROGRESS",
        target: body.target || null,
        catatan: body.catatan || null,
        pertemuanDate: body.pertemuanDate ? new Date(body.pertemuanDate) : new Date(),
      },
      include: { santri: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "PERKEMBANGAN_QURAN", data.id, {
      santri: data.santri?.name, type: data.type, surah: data.surah,
    }, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[quran create] error:", error)
    return NextResponse.json({ error: "Gagal menambah perkembangan Quran" }, { status: 500 })
  }
}
