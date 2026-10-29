import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { notifikasiTugasBaru } from "@/lib/notifikasi/helper"
import { validateGuruAccess } from "@/lib/auth/guru-access"

/**
 * GET /api/admin/tugas
 * Query params: mapelId, kelasId, guruId, materiId, tahunAjaranId, semesterId, status (overdue|active|completed), search
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("tugas:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const mapelId = searchParams.get("mapelId")
    const kelasId = searchParams.get("kelasId")
    const guruId = searchParams.get("guruId")
    const materiId = searchParams.get("materiId")
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
    if (materiId) where.materiId = materiId
    if (search) where.title = { contains: search, mode: "insensitive" }

    const now = new Date()
    const status = searchParams.get("status")
    if (status === "overdue") {
      where.dueDate = { lt: now }
      where.isPublished = true
    } else if (status === "active") {
      where.dueDate = { gte: now }
      where.isPublished = true
    }

    const tugas = await db.tugas.findMany({
      where,
      include: {
        mapel: { select: { id: true, name: true, code: true } },
        kelas: { select: { id: true, name: true, code: true } },
        guru: { select: { id: true, name: true } },
        materi: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: [{ dueDate: "asc" }, { publishedAt: "desc" }],
      take: 500,
    })

    // Annotate with submission stats for UI
    const enriched = tugas.map((t) => {
      const isOverdue = new Date(t.dueDate) < now
      return {
        ...t,
        isOverdue,
        status: isOverdue ? "OVERDUE" : "ACTIVE",
      }
    })

    return NextResponse.json({ data: enriched, total: enriched.length })
  } catch (error) {
    console.error("[tugas list] error:", error)
    return NextResponse.json({ error: "Gagal memuat tugas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("tugas:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.title || !body.mapelId || !body.kelasId || !body.dueDate) {
      return NextResponse.json({ error: "Judul, Mapel, Kelas, dan Tenggat wajib diisi" }, { status: 400 })
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

    // Auto-bind guruId
    let guruId = body.guruId
    if (!guruId && accessCheck.guru) guruId = accessCheck.guru.id

    // Validate dueDate is in the future for new tugas
    if (body.dueDate && new Date(body.dueDate) < new Date()) {
      return NextResponse.json(
        { error: "Tenggat waktu tugas harus di masa depan" },
        { status: 400 },
      )
    }

    const tugas = await db.tugas.create({
      data: {
        tahunAjaranId,
        semesterId,
        mapelId: body.mapelId,
        kelasId: body.kelasId,
        guruId,
        materiId: body.materiId || null,
        title: body.title,
        description: body.description || null,
        type: body.type || "INDIVIDU",
        fileUrl: body.fileUrl || null,
        maxScore: body.maxScore || 100,
        dueDate: new Date(body.dueDate),
        isPublished: body.isPublished !== false,
        createdById: session.user.id,
      },
      include: {
        mapel: { select: { name: true } },
        kelas: { select: { name: true } },
      },
    })
    await logAudit(session, "CREATE", "TUGAS", tugas.id, {
      title: tugas.title, mapel: tugas.mapel?.name, dueDate: tugas.dueDate,
    }, req)
    // V6: Auto-notify all wali in kelas about new tugas
    if (tugas.isPublished) {
      const santriList = await db.santri.findMany({
        where: { kelasId: body.kelasId, status: "AKTIF", deletedAt: null },
        select: { id: true },
      })
      for (const s of santriList) {
        await notifikasiTugasBaru(s.id, tugas.title, tugas.mapel?.name || "", tugas.id)
      }
    }

    return NextResponse.json({ data: tugas })
  } catch (error) {
    console.error("[tugas create] error:", error)
    return NextResponse.json({ error: "Gagal membuat tugas" }, { status: 500 })
  }
}
