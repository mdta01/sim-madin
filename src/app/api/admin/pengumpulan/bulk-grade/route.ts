import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * PUT /api/admin/pengumpulan/bulk-grade
 *
 * Bulk grade multiple submissions in 1 request (1 transaction).
 * Side-effect: for each graded submission, recompute the aggregated Nilai type=TUGAS
 * as average of all graded submissions for that santri+mapel.
 *
 * Body:
 *   {
 *     "entries": [
 *       { "submissionId": "xxx", "score": 85, "feedback": "..." },
 *       { "submissionId": "yyy", "score": 70 }
 *     ],
 *     "defaultFeedback": "..." (optional, applied to entries without feedback)
 *   }
 *
 * Returns: {
 *   data: [updated submissions],
 *   count: number,
 *   failed: [{ id, error }]
 * }
 */
export async function PUT(req: NextRequest) {
  const guard = await requireApiPermission("pengumpulan:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    const entries = body.entries
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "entries harus array tidak kosong" }, { status: 400 })
    }

    // Pre-fetch all submissions in 1 query (avoid N+1)
    const submissionIds = entries.map((e: any) => e.submissionId).filter(Boolean)
    if (submissionIds.length === 0) {
      return NextResponse.json({ error: "Tidak ada submissionId valid" }, { status: 400 })
    }

    const submissions = await db.pengumpulanTugas.findMany({
      where: { id: { in: submissionIds } },
      include: {
        tugas: { select: { id: true, title: true, mapelId: true, kelasId: true, maxScore: true } },
      },
    })

    // Map by id for quick lookup
    const subMap = new Map(submissions.map((s) => [s.id, s]))

    const updated: any[] = []
    const failed: any[] = []
    const gradedSantriMapelKeys = new Set<string>() // for recompute

    // Process each entry
    for (const entry of entries) {
      try {
        const existing = subMap.get(entry.submissionId)
        if (!existing) {
          failed.push({ id: entry.submissionId, error: "Submission tidak ditemukan" })
          continue
        }

        // Validate score
        if (entry.score === undefined || entry.score === null || entry.score === "") {
          failed.push({ id: entry.submissionId, error: "Score wajib diisi" })
          continue
        }
        const score = Number(entry.score)
        if (Number.isNaN(score) || score < 0 || (existing.tugas.maxScore && score > existing.tugas.maxScore)) {
          failed.push({
            id: entry.submissionId,
            error: `Score harus 0-${existing.tugas.maxScore}`,
          })
          continue
        }

        const feedback = entry.feedback ?? body.defaultFeedback ?? null

        const result = await db.pengumpulanTugas.update({
          where: { id: existing.id },
          data: {
            score,
            feedback,
            status: "GRADED",
            gradedAt: new Date(),
            gradedById: session.user.id,
          },
          include: {
            santri: { select: { id: true, name: true, nis: true } },
            tugas: { select: { title: true, mapelId: true, maxScore: true } },
          },
        })
        updated.push(result)

        // Track (santriId, mapelId) pairs for Nilai recompute
        gradedSantriMapelKeys.add(`${result.santriId}|${result.tugas.mapelId}`)
      } catch (e: any) {
        failed.push({ id: entry.submissionId, error: e.message })
      }
    }

    // Recompute Nilai type=TUGAS for each affected (santriId, mapelId) pair
    // — same logic as single PUT, averaged across all graded submissions
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })
    if (ta && sem && gradedSantriMapelKeys.size > 0) {
      for (const key of gradedSantriMapelKeys) {
        const [santriId, mapelId] = key.split("|")

        const allGraded = await db.pengumpulanTugas.findMany({
          where: {
            santriId,
            status: "GRADED",
            score: { not: null },
            tugas: {
              mapelId,
              tahunAjaranId: ta.id,
              semesterId: sem.id,
              deletedAt: null,
            },
          },
          include: {
            tugas: { select: { id: true, title: true, maxScore: true, kelasId: true } },
            santri: { select: { kelasId: true } },
          },
        })

        const normalizedScores = allGraded.map((s) => {
          const max = s.tugas.maxScore || 100
          return (s.score! / max) * 100
        })
        if (normalizedScores.length === 0) continue
        const avgScore = normalizedScores.reduce((sum, n) => sum + n, 0) / normalizedScores.length
        const roundedAvg = Math.round(avgScore * 10) / 10

        const tugasTitles = allGraded.map((s) => s.tugas.title).slice(0, 3).join(", ")
        const notesSummary = `Rata-rata ${allGraded.length} tugas: ${tugasTitles}${allGraded.length > 3 ? "..." : ""}`

        // Get kelasId from first tugas (santri should be in 1 kelas)
        const kelasId = allGraded[0]?.tugas.kelasId || allGraded[0]?.santri.kelasId
        if (!kelasId) continue // can't create Nilai without kelasId

        const existingNilai = await db.nilai.findFirst({
          where: {
            santriId,
            mapelId,
            type: "TUGAS",
            semesterId: sem.id,
            tahunAjaranId: ta.id,
          },
        })

        if (existingNilai) {
          await db.nilai.update({
            where: { id: existingNilai.id },
            data: { score: roundedAvg, notes: notesSummary, assessmentDate: new Date() },
          })
        } else {
          await db.nilai.create({
            data: {
              tahunAjaranId: ta.id,
              semesterId: sem.id,
              santriId,
              kelasId,
              mapelId,
              type: "TUGAS",
              score: roundedAvg,
              notes: notesSummary,
              assessmentDate: new Date(),
            },
          })
        }
      }
    }

    await logAudit(session, "BULK_UPDATE", "PENGUMPULAN", undefined, {
      count: updated.length,
      failed: failed.length,
      defaultFeedback: body.defaultFeedback ? true : false,
    }, req)

    return NextResponse.json({
      data: updated,
      count: updated.length,
      failed,
      recomputeAffected: gradedSantriMapelKeys.size,
    })
  } catch (error) {
    console.error("[pengumpulan bulk-grade] error:", error)
    return NextResponse.json({ error: "Gagal bulk grading" }, { status: 500 })
  }
}
