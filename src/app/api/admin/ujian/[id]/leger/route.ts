import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/ujian/[id]/leger
 * Leger (ranking) for this ujian.
 *
 * Returns sorted list of santri by score desc, with rank, lulus/tidak status.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const ujian = await db.ujian.findUnique({
      where: { id, deletedAt: null },
      include: { mapel: true, kelas: true },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    // Get all nilai for this ujian
    const nilaiList = await db.ujianNilai.findMany({
      where: { ujianId: id },
      include: {
        santri: {
          select: {
            id: true, name: true, nis: true, photoUrl: true, gender: true,
          },
        },
      },
      orderBy: { score: "desc" },
    })

    if (nilaiList.length === 0) {
      return NextResponse.json({
        data: [],
        stats: {
          total: 0,
          avgScore: 0,
          maxScore: 0,
          minScore: 0,
          lulus: 0,
          tidakLulus: 0,
          passingScore: ujian.passingScore || ujian.mapel.kkm,
        },
      })
    }

    const passingScore = ujian.passingScore || ujian.mapel.kkm

    // Sort + assign rank (handle ties)
    const sorted = [...nilaiList].sort((a, b) => b.score - a.score)
    let currentRank = 1
    let prevScore: number | null = null
    const leger = sorted.map((n, i) => {
      if (prevScore !== null && n.score !== prevScore) {
        currentRank = i + 1
      }
      prevScore = n.score
      return {
        rank: currentRank,
        santriId: n.santriId,
        santriName: n.santri.name,
        nis: n.santri.nis,
        gender: n.santri.gender,
        photoUrl: n.santri.photoUrl,
        score: n.score,
        scoreUts: n.scoreUts,
        scoreUas: n.scoreUas,
        scorePraktik: n.scorePraktik,
        isLulus: n.score >= passingScore,
        notes: n.notes,
      }
    })

    // Compute stats
    const scores = nilaiList.map((n) => n.score)
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    const lulus = scores.filter((s) => s >= passingScore).length

    return NextResponse.json({
      data: leger,
      total: leger.length,
      ujian: {
        id: ujian.id,
        title: ujian.title,
        type: ujian.type,
        mapel: ujian.mapel.name,
        kelas: ujian.kelas.name,
        startTime: ujian.startTime,
        maxScore: ujian.maxScore,
        passingScore,
      },
      stats: {
        total: leger.length,
        avgScore: Math.round(avgScore * 10) / 10,
        maxScore,
        minScore,
        lulus,
        tidakLulus: leger.length - lulus,
        passingScore,
        persentaseLulus: Math.round((lulus / leger.length) * 100),
      },
    })
  } catch (error) {
    console.error("[ujian leger] error:", error)
    return NextResponse.json({ error: "Gagal memuat leger ujian" }, { status: 500 })
  }
}
