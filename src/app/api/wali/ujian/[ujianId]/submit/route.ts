import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken, verifyWaliSantriAccess } from "@/lib/wali/auth"

interface Params { params: Promise<{ ujianId: string }> }

/**
 * POST /api/wali/ujian/[ujianId]/submit
 * Submit ujian answers + auto-correct soal objektif (PG/ISIAN) + compute score otomatis.
 *
 * Body: {
 *   santriId,
 *   answers: [{ ujianSoalId, answer, optionOrder? }]
 * }
 *
 * Auto-correction:
 * - PG: compare answer with correctAnswer (mapped through optionOrder)
 * - ISIAN: compare answer with correctAnswer (case-insensitive, trimmed)
 * - ESSAY/PRAKTIK: no auto-correction (score null, needs manual grading)
 *
 * Side effect: upsert UjianNilai with auto-computed score + create Nilai type matching ujian.type
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { ujianId } = await params
    const body = await req.json()
    const santriId = body.santriId
    const answers = body.answers
    if (!santriId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "santriId dan answers wajib diisi" }, { status: 400 })
    }

    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) return NextResponse.json({ error: "Forbidden", message: access.reason }, { status: 403 })

    const ujian = await db.ujian.findUnique({
      where: { id: ujianId, deletedAt: null },
      include: {
        soalLinks: {
          include: {
            bankSoal: { select: { id: true, type: true, correctAnswer: true, answerKey: true, bobot: true } },
          },
        },
        mapel: { select: { kkm: true } },
      },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    // Verify sesi exists and is IN_PROGRESS
    const sesi = await db.ujianSesi.findUnique({
      where: { ujianId_santriId: { ujianId, santriId } },
    })
    if (!sesi || sesi.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Sesi ujian tidak ditemukan atau sudah selesai" }, { status: 400 })
    }

    // Process answers + auto-correct
    const jawabanResults: any[] = []
    let totalScore = 0
    let totalBobot = 0
    let autoCorrectedCount = 0
    let needsManualGrading = false

    for (const ans of answers) {
      const link = ujian.soalLinks.find((l) => l.id === ans.ujianSoalId)
      if (!link) continue

      const soal = link.bankSoal
      const bobot = link.bobot
      totalBobot += bobot

      let isCorrect: boolean | null = null
      let jawabanScore: number | null = null
      let isAutoCorrected = false

      if (soal.type === "PG" && soal.correctAnswer && ans.answer) {
        // PG: auto-correct
        // The answer from client is the displayed option letter (A/B/C/D)
        // Need to map back to original option index using optionOrder
        let optionOrder: number[] = []
        if (ans.optionOrder) {
          optionOrder = Array.isArray(ans.optionOrder) ? ans.optionOrder : JSON.parse(ans.optionOrder)
        }

        // Client sends "A" / "B" / "C" / "D" which maps to display index 0/1/2/3
        const displayIdx = ["A", "B", "C", "D", "E"].indexOf(ans.answer.toUpperCase())
        if (displayIdx >= 0 && optionOrder.length > displayIdx) {
          // Map display index back to original index
          const originalIdx = optionOrder[displayIdx]
          const originalAnswerLetter = String.fromCharCode(65 + originalIdx) // 0→A, 1→B, etc
          isCorrect = originalAnswerLetter === soal.correctAnswer.toUpperCase()
          jawabanScore = isCorrect ? bobot : 0
          isAutoCorrected = true
          autoCorrectedCount++
        }
      } else if (soal.type === "ISIAN" && soal.correctAnswer && ans.answer) {
        // ISIAN: case-insensitive comparison, trimmed
        const normalizedAnswer = ans.answer.trim().toLowerCase()
        const normalizedCorrect = soal.correctAnswer.trim().toLowerCase()
        isCorrect = normalizedAnswer === normalizedCorrect
        jawabanScore = isCorrect ? bobot : 0
        isAutoCorrected = true
        autoCorrectedCount++
      } else {
        // ESSAY/PRAKTIK: needs manual grading
        needsManualGrading = true
        isCorrect = null
        jawabanScore = null
      }

      if (jawabanScore !== null) totalScore += jawabanScore

      jawabanResults.push({
        sesiId: sesi.id,
        ujianSoalId: ans.ujianSoalId,
        santriId,
        answer: ans.answer || null,
        optionOrder: ans.optionOrder ? (typeof ans.optionOrder === "string" ? ans.optionOrder : JSON.stringify(ans.optionOrder)) : null,
        isCorrect,
        score: jawabanScore,
        isAutoCorrected,
      })
    }

    // Compute final score (0-100 scale)
    const finalScore = totalBobot > 0 ? Math.round((totalScore / totalBobot) * ujian.maxScore * 10) / 10 : 0
    const endTime = new Date()
    const durationUsed = Math.floor((endTime.getTime() - new Date(sesi.startTime).getTime()) / 1000)

    // Update sesi
    await db.$transaction(async (tx) => {
      // Delete existing jawaban (in case of resubmit)
      await tx.ujianJawaban.deleteMany({ where: { sesiId: sesi.id } })

      // Create new jawaban
      for (const j of jawabanResults) {
        await tx.ujianJawaban.create({ data: j })
      }

      // Update sesi
      await tx.ujianSesi.update({
        where: { id: sesi.id },
        data: {
          endTime,
          durationUsed,
          score: finalScore,
          status: needsManualGrading ? "SUBMITTED" : "GRADED",
          isAutoCorrected: !needsManualGrading,
        },
      })

      // Upsert UjianNilai
      const existingNilai = await tx.ujianNilai.findUnique({
        where: { ujianId_santriId: { ujianId, santriId } },
      })
      if (existingNilai) {
        await tx.ujianNilai.update({
          where: { id: existingNilai.id },
          data: {
            score: finalScore,
            notes: needsManualGrading ? "Auto-corrected PG/ISAN, menunggu grading essay/praktik" : "Auto-corrected",
            isAutoCorrect: !needsManualGrading,
            gradedAt: endTime,
            gradedById: null, // auto-graded, no human
          },
        })
      } else {
        await tx.ujianNilai.create({
          data: {
            ujianId,
            santriId,
            score: finalScore,
            notes: needsManualGrading ? "Auto-corrected PG/ISAN, menunggu grading essay/praktik" : "Auto-corrected",
            isAutoCorrect: !needsManualGrading,
            gradedAt: endTime,
          },
        })
      }

      // Also upsert Nilai (for rapor aggregation) — same logic as manual nilai input
      const normalizedScore = ujian.maxScore ? (finalScore / ujian.maxScore) * 100 : finalScore
      const nilaiType = ujian.type === "UTS" ? "UTS"
        : ujian.type === "UAS" ? "UAS"
        : ujian.type === "PRAKTIK" || ujian.type === "MAKEUP" ? "PRAKTIK"
        : "UTS"

      const existingNilaiRapor = await tx.nilai.findFirst({
        where: {
          santriId,
          mapelId: ujian.mapelId,
          type: nilaiType,
          semesterId: ujian.semesterId,
          tahunAjaranId: ujian.tahunAjaranId,
        },
      })
      if (existingNilaiRapor) {
        await tx.nilai.update({
          where: { id: existingNilaiRapor.id },
          data: { score: normalizedScore, notes: `${ujian.title} (auto)`, assessmentDate: endTime },
        })
      } else {
        await tx.nilai.create({
          data: {
            tahunAjaranId: ujian.tahunAjaranId,
            semesterId: ujian.semesterId,
            santriId,
            kelasId: ujian.kelasId,
            mapelId: ujian.mapelId,
            type: nilaiType,
            score: normalizedScore,
            notes: `${ujian.title} (auto)`,
            assessmentDate: endTime,
          },
        })
      }
    })

    return NextResponse.json({
      data: {
        score: finalScore,
        maxScore: ujian.maxScore,
        status: needsManualGrading ? "SUBMITTED" : "GRADED",
        autoCorrectedCount,
        totalSoal: answers.length,
        needsManualGrading,
      },
      message: needsManualGrading
        ? `Ujian dikumpulkan. ${autoCorrectedCount} soal dikoreksi otomatis. Menunggu guru menilai soal essay/praktik.`
        : `Ujian dikumpulkan & dikoreksi otomatis. Nilai: ${finalScore}/${ujian.maxScore}`,
    })
  } catch (error) {
    console.error("[wali ujian submit] error:", error)
    return NextResponse.json({ error: "Gagal submit ujian" }, { status: 500 })
  }
}
