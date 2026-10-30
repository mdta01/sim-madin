import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"
import { validateBody } from "@/lib/validation/helpers"
import { tugasUpdateSchema } from "@/lib/validation/akademik-detail"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("tugas:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const tugas = await db.tugas.findUnique({
      where: { id, deletedAt: null },
      include: {
        mapel: true,
        kelas: true,
        guru: { select: { id: true, name: true } },
        materi: { select: { id: true, title: true, fileUrl: true, type: true } },
        submissions: {
          include: {
            santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    })
    if (!tugas) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })

    // Get all santri in the kelas to compute "not submitted"
    const santriKelas = await db.santri.findMany({
      where: { kelasId: tugas.kelasId, status: "AKTIF", deletedAt: null },
      select: { id: true, name: true, nis: true, photoUrl: true },
    })

    const submittedIds = new Set(tugas.submissions.map((s) => s.santriId))
    const notSubmitted = santriKelas
      .filter((s) => !submittedIds.has(s.id))
      .map((s) => ({
        santri: s,
        status: "NOT_SUBMITTED" as const,
        submittedAt: null,
        score: null,
        feedback: null,
        fileUrl: null,
        textAnswer: null,
      }))

    return NextResponse.json({
      data: {
        ...tugas,
        submissions: [...tugas.submissions, ...notSubmitted],
      },
    })
  } catch (error) {
    console.error("[tugas detail] error:", error)
    return NextResponse.json({ error: "Gagal memuat tugas" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("tugas:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    // ── Validate body with Zod ─────────────────────────────────────
    const body = await validateBody(req, tugasUpdateSchema)
    if (!body.ok) return body.error
    const data = body.data

    const existing = await db.tugas.findUnique({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })

    // V2 security: validate GURU has teaching access
    const accessCheck = await validateGuruAccess(session, {
      kelasId: data.kelasId ?? existing.kelasId,
      mapelId: data.mapelId ?? existing.mapelId,
      guruId: data.guruId !== undefined ? (data.guruId ?? undefined) : existing.guruId ?? undefined,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    const tugas = await db.tugas.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        fileUrl: data.fileUrl !== undefined ? data.fileUrl : existing.fileUrl,
        maxScore: data.maxScore ?? existing.maxScore,
        dueDate: data.dueDate ?? existing.dueDate,
        isPublished: data.isPublished ?? existing.isPublished,
        mapelId: data.mapelId ?? existing.mapelId,
        kelasId: data.kelasId ?? existing.kelasId,
        guruId: data.guruId !== undefined ? data.guruId : existing.guruId,
        materiId: data.materiId !== undefined ? data.materiId : existing.materiId,
      },
      include: { mapel: { select: { name: true } } },
    })
    await logAudit(session, "UPDATE", "TUGAS", tugas.id, { title: tugas.title }, req)
    return NextResponse.json({ data: tugas })
  } catch (error) {
    console.error("[tugas update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui tugas" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("tugas:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const existing = await db.tugas.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })

    await db.tugas.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    })
    await logAudit(session, "DELETE", "TUGAS", id, { title: existing.title }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[tugas delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus tugas" }, { status: 500 })
  }
}
