import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

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
    const body = await req.json()
    const existing = await db.ujian.findUnique({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    const accessCheck = await validateGuruAccess(session, {
      kelasId: body.kelasId ?? existing.kelasId,
      mapelId: body.mapelId ?? existing.mapelId,
      guruId: body.guruId ?? existing.guruId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    // Validate time range if both provided
    if (body.startTime && body.endTime) {
      const st = new Date(body.startTime)
      const et = new Date(body.endTime)
      if (et <= st) {
        return NextResponse.json({ error: "Waktu selesai harus setelah waktu mulai" }, { status: 400 })
      }
    }

    const ujian = await db.ujian.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        type: body.type ?? existing.type,
        description: body.description ?? existing.description,
        startTime: body.startTime ? new Date(body.startTime) : existing.startTime,
        endTime: body.endTime ? new Date(body.endTime) : existing.endTime,
        durationMnt: body.durationMnt ?? existing.durationMnt,
        ruang: body.ruang ?? existing.ruang,
        pengawas: body.pengawas ?? existing.pengawas,
        isPublished: body.isPublished ?? existing.isPublished,
        // V3: ujian SELALU offline. No isOnline field.
        maxScore: body.maxScore ?? existing.maxScore,
        passingScore: body.passingScore !== undefined ? body.passingScore : existing.passingScore,
        mapelId: body.mapelId ?? existing.mapelId,
        kelasId: body.kelasId ?? existing.kelasId,
        guruId: body.guruId !== undefined ? body.guruId : existing.guruId,
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
