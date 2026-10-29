import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

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
    const body = await req.json()
    const existing = await db.tugas.findUnique({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })

    const tugas = await db.tugas.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        type: body.type ?? existing.type,
        fileUrl: body.fileUrl !== undefined ? body.fileUrl : existing.fileUrl,
        maxScore: body.maxScore ?? existing.maxScore,
        dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
        isPublished: body.isPublished ?? existing.isPublished,
        mapelId: body.mapelId ?? existing.mapelId,
        kelasId: body.kelasId ?? existing.kelasId,
        guruId: body.guruId !== undefined ? body.guruId : existing.guruId,
        materiId: body.materiId !== undefined ? body.materiId : existing.materiId,
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
