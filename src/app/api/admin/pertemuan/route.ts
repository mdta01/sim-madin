import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"
import { markOverduePertemuanCompletedSafe } from "@/lib/pertemuan/auto-complete"
import { validateBody } from "@/lib/validation/helpers"
import { pertemuanCreateSchema } from "@/lib/validation/akademik-detail"

/**
 * GET /api/admin/pertemuan
 * Query params: kelasId, mapelId, guruId, tahunAjaranId, semesterId, dateFrom, dateTo, isCompleted, search
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("pertemuan:read", req)
  if (guard.error) return guard.error
  try {
    // V2 #5: Auto-mark overdue pertemuan as completed (compute-on-read).
    // Runs silently in background — failures don't break the list request.
    await markOverduePertemuanCompletedSafe()

    const { searchParams } = new URL(req.url)
    const kelasId = searchParams.get("kelasId")
    const mapelId = searchParams.get("mapelId")
    const guruId = searchParams.get("guruId")
    const isCompleted = searchParams.get("isCompleted")
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

    const where: any = {}
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (semesterId) where.semesterId = semesterId
    if (kelasId) where.kelasId = kelasId
    if (mapelId) where.mapelId = mapelId
    if (guruId) where.guruId = guruId
    if (isCompleted === "true") where.isCompleted = true
    if (isCompleted === "false") where.isCompleted = false
    if (search) where.topic = { contains: search, mode: "insensitive" }

    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(new Date(dateTo).getTime() + 86400000 - 1)
    }

    const pertemuan = await db.pertemuan.findMany({
      where,
      include: {
        mapel: { select: { id: true, name: true, code: true, kkm: true } },
        kelas: { select: { id: true, name: true, code: true } },
        guru: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { pertemuanKe: "desc" }],
      take: 500,
    })

    // Fetch absensi counts separately for performance (1 query, then group in JS)
    const pertemuanIds = pertemuan.map((p) => p.id)
    // Note: the V1 Absensi model is keyed by date+santriId+TA. For V2 per-pertemuan, we group
    // by date AND kelasId AND mapelId match (Absensi has no direct pertemuanId FK in V1 schema).
    // For simplicity, we expose pertemuan list with kelas+date so UI can fetch absensi by kelas+date.
    return NextResponse.json({ data: pertemuan, total: pertemuan.length })
  } catch (error) {
    console.error("[pertemuan list] error:", error)
    return NextResponse.json({ error: "Gagal memuat pertemuan" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("pertemuan:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    // ── Validate body with Zod ─────────────────────────────────────
    const body = await validateBody(req, pertemuanCreateSchema)
    if (!body.ok) return body.error
    const {
      kelasId, mapelId, date, pertemuanKe, guruId: bodyGuruId,
      tahunAjaranId: bodyTA, semesterId: bodySem,
      topic, description, isCompleted,
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

    // Verify uniqueness: 1 kelas+mapel+pertemuanKe per TA+Semester
    const existing = await db.pertemuan.findFirst({
      where: {
        kelasId,
        mapelId,
        pertemuanKe,
        tahunAjaranId,
        semesterId,
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Pertemuan ke-${pertemuanKe} untuk mapel ini sudah ada` },
        { status: 400 },
      )
    }

    // V2 security: validate GURU has teaching access to this kelas+mapel
    const accessCheck = await validateGuruAccess(session, {
      kelasId,
      mapelId,
      guruId: bodyGuruId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    // Auto-bind guruId
    let guruId = bodyGuruId
    if (!guruId && accessCheck.guru) guruId = accessCheck.guru.id

    const pertemuan = await db.pertemuan.create({
      data: {
        tahunAjaranId,
        semesterId,
        kelasId,
        mapelId,
        guruId,
        pertemuanKe,
        date,
        topic: topic || null,
        description: description || null,
        isCompleted,
      },
      include: {
        mapel: { select: { name: true } },
        kelas: { select: { name: true } },
      },
    })
    await logAudit(session, "CREATE", "PERTEMUAN", pertemuan.id, {
      kelas: pertemuan.kelas?.name, mapel: pertemuan.mapel?.name, pertemuanKe: pertemuan.pertemuanKe,
    }, req)
    return NextResponse.json({ data: pertemuan })
  } catch (error) {
    console.error("[pertemuan create] error:", error)
    return NextResponse.json({ error: "Gagal membuat pertemuan" }, { status: 500 })
  }
}
