import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"
import { validateBody } from "@/lib/validation/helpers"
import { ujianUpdateSchema } from "@/lib/validation/akademik-detail"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const ujian = await db.ujian.findUnique({
      where: { id, deletedAt: null },
      include: {
        mapel: true,
        kelas: true,
        guru: { select: { id: true, name: true } },
        soalLinks: {
          include: {
            bankSoal: {
              select: {
                id: true, code: true, type: true, question: true, difficulty: true,
                options: true, correctAnswer: true, bobot: true,
              },
            },
          },
          orderBy: { urutan: "asc" },
        },
        peserta: {
          include: {
            santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
          },
          orderBy: { santri: { name: "asc" } },
        },
        nilai: {
          include: {
            santri: { select: { id: true, name: true, nis: true } },
          },
        },
      },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    const now = new Date()
    const isUpcoming = new Date(ujian.startTime) > now
    const isOngoing = new Date(ujian.startTime) <= now && new Date(ujian.endTime) >= now
    const status = isUpcoming ? "UPCOMING" : isOngoing ? "ONGOING" : "COMPLETED"

    return NextResponse.json({ data: { ...ujian, status } })
  } catch (error) {
    console.error("[ujian detail] error:", error)
    return NextResponse.json({ error: "Gagal memuat ujian" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await validateBody(req, ujianUpdateSchema)
    if (!body.ok) return body.error
    const {
      title, type, mapelId, kelasId, guruId, description, startTime,
      endTime, durationMnt, ruang, pengawas, isPublished, maxScore, passingScore,
    } = body.data
    const existing = await db.ujian.findUnique({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    const accessCheck = await validateGuruAccess(session, {
      kelasId: kelasId ?? existing.kelasId,
      mapelId: mapelId ?? existing.mapelId,
      guruId: guruId ?? existing.guruId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    const ujian = await db.ujian.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        type: type ?? existing.type,
        description: description ?? existing.description,
        startTime: startTime ?? existing.startTime,
        endTime: endTime ?? existing.endTime,
        durationMnt: durationMnt ?? existing.durationMnt,
        ruang: ruang !== undefined ? ruang : existing.ruang,
        pengawas: pengawas !== undefined ? pengawas : existing.pengawas,
        isPublished: isPublished ?? existing.isPublished,
        // V3: ujian SELALU offline. No isOnline field.
        maxScore: maxScore ?? existing.maxScore,
        passingScore: passingScore !== undefined ? passingScore : existing.passingScore,
        mapelId: mapelId ?? existing.mapelId,
        kelasId: kelasId ?? existing.kelasId,
        guruId: guruId !== undefined ? guruId : existing.guruId,
      },
      include: { mapel: { select: { name: true } }, kelas: { select: { name: true } } },
    })
    await logAudit(session, "UPDATE", "UJIAN", ujian.id, { title: ujian.title }, req)
    return NextResponse.json({ data: ujian })
  } catch (error) {
    console.error("[ujian update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui ujian" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const existing = await db.ujian.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    await db.ujian.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    })
    await logAudit(session, "DELETE", "UJIAN", id, { title: existing.title }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ujian delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus ujian" }, { status: 500 })
  }
}
