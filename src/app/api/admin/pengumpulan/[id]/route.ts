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
 *
 * Side effect: if score is set, status becomes "GRADED" and we recompute the
 * aggregated Nilai (type=TUGAS) by averaging ALL graded submissions for this
 * santri+mapel+semester — instead of overwriting the value with the latest
 * single tugas score (which was a data-loss bug).
 *
 * Score normalization: each submission's score is converted to 0-100 scale
 * (percentage of tugas.maxScore) so multi-tugas averaging is consistent.
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

    // Validate score range
    if (body.score !== undefined && body.score !== null && body.score !== "") {
      const scoreNum = Number(body.score)
      if (Number.isNaN(scoreNum)) {
        return NextResponse.json({ error: "Skor harus angka" }, { status: 400 })
      }
      if (scoreNum < 0 || (existing.tugas.maxScore && scoreNum > existing.tugas.maxScore)) {
        return NextResponse.json(
          { error: `Skor harus antara 0 dan ${existing.tugas.maxScore}` },
          { status: 400 },
        )
      }
    }

    const updateData: any = {}
    if (body.score !== undefined && body.score !== null && body.score !== "") {
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

    // If graded, recompute aggregated Nilai type=TUGAS as AVERAGE of all graded submissions
    if (body.score !== undefined && body.score !== null && body.score !== "" && updated.tugas) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      if (ta && sem) {
        // Fetch ALL graded submissions for this santri + this mapel (across all tugas in the mapel)
        const allGraded = await db.pengumpulanTugas.findMany({
          where: {
            santriId: updated.santriId,
            status: "GRADED",
            score: { not: null },
            tugas: {
              mapelId: updated.tugas.mapelId,
              tahunAjaranId: ta.id,
              semesterId: sem.id,
              deletedAt: null,
            },
          },
          include: {
            tugas: { select: { id: true, title: true, maxScore: true } },
          },
        })

        // Normalize each submission's score to 0-100 scale and average
        const normalizedScores = allGraded.map((s) => {
          const max = s.tugas.maxScore || 100
          return (s.score! / max) * 100
        })
        const avgScore = normalizedScores.length > 0
          ? normalizedScores.reduce((sum, n) => sum + n, 0) / normalizedScores.length
          : 0
        const roundedAvg = Math.round(avgScore * 10) / 10 // 1 decimal precision

        // Upsert the aggregated Nilai type=TUGAS
        const existingNilai = await db.nilai.findFirst({
          where: {
            santriId: updated.santriId,
            mapelId: updated.tugas.mapelId,
            type: "TUGAS",
            semesterId: sem.id,
            tahunAjaranId: ta.id,
          },
        })

        const tugasTitles = allGraded.map((s) => s.tugas.title).slice(0, 3).join(", ")
        const notesSummary = `Rata-rata ${allGraded.length} tugas: ${tugasTitles}${allGraded.length > 3 ? "..." : ""}`

        if (existingNilai) {
          await db.nilai.update({
            where: { id: existingNilai.id },
            data: {
              score: roundedAvg,
              notes: notesSummary,
              guruId: session.user.id ? undefined : existingNilai.guruId,
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
              score: roundedAvg,
              notes: notesSummary,
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
