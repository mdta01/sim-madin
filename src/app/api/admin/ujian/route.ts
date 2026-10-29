import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

/**
 * GET /api/admin/ujian
 * Query: kelasId, mapelId, type, tahunAjaranId, semesterId, search, status (upcoming|ongoing|completed)
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("ujian:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const kelasId = searchParams.get("kelasId")
    const mapelId = searchParams.get("mapelId")
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
    if (kelasId) where.kelasId = kelasId
    if (mapelId) where.mapelId = mapelId
    if (type) where.type = type
    if (search) where.title = { contains: search, mode: "insensitive" }

    const now = new Date()
    const status = searchParams.get("status")
    if (status === "upcoming") {
      where.startTime = { gt: now }
    } else if (status === "ongoing") {
      where.startTime = { lte: now }
      where.endTime = { gte: now }
    } else if (status === "completed") {
      where.endTime = { lt: now }
    }

    const ujian = await db.ujian.findMany({
      where,
      include: {
        mapel: { select: { id: true, name: true, code: true, kkm: true } },
        kelas: { select: { id: true, name: true, code: true } },
        guru: { select: { id: true, name: true } },
        _count: {
          select: { soalLinks: true, peserta: true, nilai: true },
        },
      },
      orderBy: [{ startTime: "desc" }, { type: "asc" }],
      take: 500,
    })

    // Annotate status
    const enriched = ujian.map((u) => {
      const isUpcoming = new Date(u.startTime) > now
      const isOngoing = new Date(u.startTime) <= now && new Date(u.endTime) >= now
      const isCompleted = new Date(u.endTime) < now
      return {
        ...u,
        status: isUpcoming ? "UPCOMING" : isOngoing ? "ONGOING" : "COMPLETED",
      }
    })

    return NextResponse.json({ data: enriched, total: enriched.length })
  } catch (error) {
    console.error("[ujian list] error:", error)
    return NextResponse.json({ error: "Gagal memuat ujian" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("ujian:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.title || !body.type || !body.mapelId || !body.kelasId || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: "Judul, Tipe, Mapel, Kelas, Waktu mulai & selesai wajib diisi" }, { status: 400 })
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

    // V2 security: validate GURU has teaching access
    const accessCheck = await validateGuruAccess(session, {
      kelasId: body.kelasId,
      mapelId: body.mapelId,
      guruId: body.guruId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    let guruId = body.guruId
    if (!guruId && accessCheck.guru) guruId = accessCheck.guru.id

    // Validate endTime > startTime
    const startTime = new Date(body.startTime)
    const endTime = new Date(body.endTime)
    if (endTime <= startTime) {
      return NextResponse.json({ error: "Waktu selesai harus setelah waktu mulai" }, { status: 400 })
    }

    const ujian = await db.ujian.create({
      data: {
        tahunAjaranId,
        semesterId,
        mapelId: body.mapelId,
        kelasId: body.kelasId,
        guruId,
        title: body.title,
        type: body.type,
        description: body.description || null,
        startTime,
        endTime,
        durationMnt: body.durationMnt || 90,
        ruang: body.ruang || null,
        pengawas: body.pengawas || null,
        isPublished: body.isPublished || false,
        isOnline: body.isOnline || false,
        maxScore: body.maxScore || 100,
        passingScore: body.passingScore || null,
      },
      include: {
        mapel: { select: { name: true } },
        kelas: { select: { name: true } },
      },
    })
    await logAudit(session, "CREATE", "UJIAN", ujian.id, {
      title: ujian.title, type: ujian.type, mapel: ujian.mapel?.name, kelas: ujian.kelas?.name,
    }, req)
    return NextResponse.json({ data: ujian })
  } catch (error) {
    console.error("[ujian create] error:", error)
    return NextResponse.json({ error: "Gagal membuat ujian" }, { status: 500 })
  }
}
