import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/admin/pengumpulan/[id]
 * Grade a submission (or update status/feedback).
 * Body: { score?, feedback?, status? }
 * Side effect: if score is set, status becomes "GRADED"; creates Nilai record with type "TUGAS".
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("pengumpulan:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.pengumpulanTugas.findUnique({
      where: { id },
      include: { tugas: true, santri: true },
    })
    if (!existing) return NextResponse.json({ error: "Pengumpulan tidak ditemukan" }, { status: 404 })

    const updateData: any = {}
    if (body.score !== undefined && body.score !== null) {
      updateData.score = Number(body.score)
      updateData.status = "GRADED"
      updateData.gradedAt = new Date()
      updateData.gradedById = session.user.id
    }
    if (body.feedback !== undefined) updateData.feedback = body.feedback
    if (body.status) updateData.status = body.status

    const updated = await db.pengumpulanTugas.update({
      where: { id },
      data: updateData,
      include: {
        santri: { select: { id: true, name: true, nis: true } },
        tugas: { select: { id: true, title: true, mapelId: true, kelasId: true, maxScore: true } },
      },
    })

    // If graded, upsert a Nilai record with type "TUGAS" so it appears in rapor aggregation
    if (body.score !== undefined && body.score !== null && updated.tugas) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      if (ta && sem) {
        // Score normalization: store as percentage of maxScore so KKM comparison is consistent
        const normalizedScore = updated.tugas.maxScore
          ? (Number(body.score) / updated.tugas.maxScore) * 100
          : Number(body.score)

        const existingNilai = await db.nilai.findFirst({
          where: {
            santriId: updated.santriId,
            mapelId: updated.tugas.mapelId,
            type: "TUGAS",
            semesterId: sem.id,
            tahunAjaranId: ta.id,
          },
        })

        if (existingNilai) {
          // Average with previous if already exists, else overwrite
          await db.nilai.update({
            where: { id: existingNilai.id },
            data: {
              score: normalizedScore,
              notes: `Tugas: ${updated.tugas.title}`,
              assessmentDate: new Date(),
            },
          })
        } else {
          await db.nilai.create({
            data: {
              tahunAjaranId: ta.id,
              semesterId: sem.id,
              santriId: updated.santriId,
              kelasId: updated.tugas.kelasId,
              mapelId: updated.tugas.mapelId,
              type: "TUGAS",
              score: normalizedScore,
              notes: `Tugas: ${updated.tugas.title}`,
              assessmentDate: new Date(),
            },
          })
        }
      }
    }

    await logAudit(session, "UPDATE", "PENGUMPULAN", id, {
      santri: updated.santri.name,
      tugas: updated.tugas.title,
      score: body.score,
      status: updateData.status,
    }, req)

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[pengumpulan update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui pengumpulan" }, { status: 500 })
  }
}
