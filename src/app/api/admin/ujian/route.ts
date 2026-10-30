import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"
import { notifikasiUjianTomorrow, getWaliIdFromSantri } from "@/lib/notifikasi/helper"
import { validateBody } from "@/lib/validation/helpers"
import { ujianCreateSchema } from "@/lib/validation/akademik-detail"

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
    const body = await validateBody(req, ujianCreateSchema)
    if (!body.ok) return body.error
    const {
      title, type, mapelId, kelasId, guruId: bodyGuruId, tahunAjaranId: bodyTA,
      semesterId: bodySem, description, startTime, endTime, durationMnt,
      ruang, pengawas, isPublished, maxScore, passingScore,
    } = body.data

    let tahunAjaranId: string | null | undefined = bodyTA
    let semesterId: string | null | undefined = bodySem
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
      kelasId,
      mapelId,
      guruId: bodyGuruId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    let guruId = bodyGuruId
    if (!guruId && accessCheck.guru) guruId = accessCheck.guru.id

    const ujian = await db.ujian.create({
      data: {
        tahunAjaranId,
        semesterId,
        mapelId,
        kelasId,
        guruId,
        title,
        type,
        description: description || null,
        startTime,
        endTime,
        durationMnt,
        ruang: ruang || null,
        pengawas: pengawas || null,
        isPublished,
        // V3: ujian SELALU offline (manual input). Online exam = future V3.5.
        maxScore,
        passingScore: passingScore || null,
      },
      include: {
        mapel: { select: { name: true } },
        kelas: { select: { name: true } },
      },
    })
    await logAudit(session, "CREATE", "UJIAN", ujian.id, {
      title: ujian.title, type: ujian.type, mapel: ujian.mapel?.name, kelas: ujian.kelas?.name,
    }, req)

    // V6 → V3 integration: notify wali of every santri in this kelas that
    // an ujian is scheduled. If startTime is tomorrow, the notification
    // reads "Besok terdapat ujian ..."; otherwise it reads "Ujian dijadwalkan".
    // Best-effort — failures do not roll back the ujian creation.
    try {
      const santriList = await db.santri.findMany({
        where: { kelasId, status: "AKTIF", deletedAt: null },
        select: { id: true },
      })
      const mapelName = ujian.mapel?.name || "mapel"
      // Fire notifications in parallel; we don't `await` each individually
      // to avoid blocking the response — Promise.all is fine since each
      // helper has its own try/catch internally.
      await Promise.all(
        santriList.map((s) =>
          notifikasiUjianTomorrow(s.id, ujian.title, mapelName, ujian.id),
        ),
      )
    } catch (e) {
      console.warn(`[ujian create] notifikasi gagal untuk kelas ${kelasId}:`, e)
    }

    return NextResponse.json({ data: ujian })
  } catch (error) {
    console.error("[ujian create] error:", error)
    return NextResponse.json({ error: "Gagal membuat ujian" }, { status: 500 })
  }
}
