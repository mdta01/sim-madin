import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * GET /api/admin/materi
 * Query params: mapelId, kelasId, guruId, type, tahunAjaranId, semesterId, search
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("materi:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const mapelId = searchParams.get("mapelId")
    const kelasId = searchParams.get("kelasId")
    const guruId = searchParams.get("guruId")
    const type = searchParams.get("type")
    const search = searchParams.get("search") || ""
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

    const where: any = { deletedAt: null }
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (semesterId) where.semesterId = semesterId
    if (mapelId) where.mapelId = mapelId
    if (kelasId) where.kelasId = kelasId
    if (guruId) where.guruId = guruId
    if (type) where.type = type
    if (search) where.title = { contains: search, mode: "insensitive" }

    const materi = await db.materi.findMany({
      where,
      include: {
        mapel: { select: { id: true, name: true, code: true } },
        kelas: { select: { id: true, name: true, code: true } },
        guru: { select: { id: true, name: true } },
        _count: { select: { tugas: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      take: 500,
    })
    return NextResponse.json({ data: materi, total: materi.length })
  } catch (error) {
    console.error("[materi list] error:", error)
    return NextResponse.json({ error: "Gagal memuat materi pembelajaran" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("materi:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.title || !body.mapelId) {
      return NextResponse.json({ error: "Judul dan Mata Pelajaran wajib diisi" }, { status: 400 })
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

    const materi = await db.materi.create({
      data: {
        tahunAjaranId,
        semesterId,
        mapelId: body.mapelId,
        kelasId: body.kelasId || null,
        guruId: body.guruId || null,
        title: body.title,
        description: body.description || null,
        type: body.type || "DOKUMEN",
        fileUrl: body.fileUrl || null,
        externalUrl: body.externalUrl || null,
        pertemuan: body.pertemuan || null,
        sortOrder: body.sortOrder || 0,
        isPublished: body.isPublished !== false,
        createdById: session.user.id,
      },
      include: { mapel: { select: { name: true } }, kelas: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "MATERI", materi.id, {
      title: materi.title, mapel: materi.mapel?.name, type: materi.type,
    }, req)
    return NextResponse.json({ data: materi })
  } catch (error) {
    console.error("[materi create] error:", error)
    return NextResponse.json({ error: "Gagal menambah materi" }, { status: 500 })
  }
}
