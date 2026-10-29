import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken, verifyWaliSantriAccess } from "@/lib/wali/auth"

interface Params { params: Promise<{ ujianId: string }> }

/**
 * GET /api/wali/ujian/[ujianId]?santriId=xxx
 * Get ujian detail with shuffled soal for this santri.
 * If sesi exists with soalOrder, use that order (reproducibility).
 * Otherwise generate new shuffled order.
 *
 * For PG soal, also shuffle options per santri.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { ujianId } = await params
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    if (!santriId) return NextResponse.json({ error: "santriId wajib diisi" }, { status: 400 })

    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) return NextResponse.json({ error: "Forbidden", message: access.reason }, { status: 403 })

    const ujian = await db.ujian.findUnique({
      where: { id: ujianId, deletedAt: null, isPublished: true },
      include: {
        mapel: { select: { name: true, code: true } },
        soalLinks: {
          include: {
            bankSoal: {
              select: {
                id: true, code: true, type: true, question: true,
                options: true, correctAnswer: true, bobot: true, difficulty: true,
              },
            },
          },
          orderBy: { urutan: "asc" },
        },
      },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    // Verify santri is in ujian's kelas
    const santri = await db.santri.findUnique({ where: { id: santriId }, select: { kelasId: true } })
    if (santri?.kelasId !== ujian.kelasId) {
      return NextResponse.json({ error: "Santri bukan dari kelas ujian ini" }, { status: 403 })
    }

    // Check if sesi exists — use stored soalOrder for reproducibility
    const sesi = await db.ujianSesi.findUnique({
      where: { ujianId_santriId: { ujianId, santriId } },
      include: { jawaban: true },
    })

    // Determine soal order
    let soalOrder: number[] = []
    if (sesi?.soalOrder) {
      soalOrder = JSON.parse(sesi.soalOrder)
    } else {
      // Generate shuffled order
      const indices = ujian.soalLinks.map((_, i) => i)
      soalOrder = shuffleArray(indices)
    }

    // Build soal list with shuffled order + shuffled options for PG
    const soalList = soalOrder.map((originalIdx, displayIdx) => {
      const link = ujian.soalLinks[originalIdx]
      const soal = link.bankSoal

      // For PG, shuffle options
      let options: string[] = []
      let optionOrder: number[] = []
      if (soal.options) {
        try {
          const originalOptions = JSON.parse(soal.options)
          if (Array.isArray(originalOptions)) {
            // Use stored option order if jawaban exists
            const existingJawaban = sesi?.jawaban.find((j) => j.ujianSoalId === link.id)
            if (existingJawaban?.optionOrder) {
              optionOrder = JSON.parse(existingJawaban.optionOrder)
              options = optionOrder.map((i) => originalOptions[i])
            } else {
              // Generate new shuffled options
              const optIndices = originalOptions.map((_, i) => i)
              optionOrder = shuffleArray(optIndices)
              options = optionOrder.map((i) => originalOptions[i])
            }
          }
        } catch {}
      }

      return {
        ujianSoalId: link.id,
        urutan: displayIdx + 1,
        type: soal.type,
        question: soal.question,
        bobot: link.bobot,
        options: soal.type === "PG" ? options : undefined,
        // Don't send correctAnswer to client!
        // For ISIAN/ESSAY/PRAKTIK, client just sends text answer
        existingAnswer: sesi?.jawaban.find((j) => j.ujianSoalId === link.id)?.answer || null,
        optionOrder, // store for later submission
      }
    })

    // Compute remaining time if IN_PROGRESS
    let remainingSeconds: number | null = null
    if (sesi?.status === "IN_PROGRESS") {
      const elapsed = Math.floor((Date.now() - new Date(sesi.startTime).getTime()) / 1000)
      remainingSeconds = Math.max(0, ujian.durationMnt * 60 - elapsed)
    }

    return NextResponse.json({
      data: {
        ujian: {
          id: ujian.id,
          title: ujian.title,
          type: ujian.type,
          mapel: ujian.mapel,
          durationMnt: ujian.durationMnt,
          maxScore: ujian.maxScore,
          startTime: ujian.startTime,
          endTime: ujian.endTime,
          soalCount: soalList.length,
        },
        sesi: sesi ? {
          id: sesi.id,
          status: sesi.status,
          startTime: sesi.startTime,
          score: sesi.score,
        } : null,
        remainingSeconds,
        soalList,
      },
    })
  } catch (error) {
    console.error("[wali ujian detail] error:", error)
    return NextResponse.json({ error: "Gagal memuat ujian" }, { status: 500 })
  }
}

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
