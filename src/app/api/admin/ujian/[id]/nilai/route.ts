import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/ujian/[id]/nilai
 * List all nilai for this ujian + santri who haven't been graded yet.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const ujian = await db.ujian.findUnique({
      where: { id, deletedAt: null },
      include: { kelas: true, mapel: true },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    // Get peserta + nilai
    const [peserta, nilaiRecords] = await Promise.all([
      db.ujianPeserta.findMany({
        where: { ujianId: id },
        include: { santri: { select: { id: true, name: true, nis: true, photoUrl: true } } },
        orderBy: { santri: { name: "asc" } },
      }),
      db.ujianNilai.findMany({
        where: { ujianId: id },
        include: { santri: { select: { id: true, name: true, nis: true } } },
      }),
    ])

    const nilaiMap = new Map(nilaiRecords.map((n) => [n.santriId, n]))
    const allNilai = peserta.map((p) => ({
      ...p,
      nilai: nilaiMap.get(p.santriId) || null,
      isGraded: nilaiMap.has(p.santriId),
    }))

    // Stats
    const scores = nilaiRecords.map((n) => n.score)
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0
    const minScore = scores.length > 0 ? Math.min(...scores) : 0
    const passingScore = ujian.passingScore || ujian.mapel.kkm
    const lulus = scores.filter((s) => s >= passingScore).length

    return NextResponse.json({
      data: allNilai,
      total: allNilai.length,
      stats: {
        total: peserta.length,
        graded: nilaiRecords.length,
        notGraded: peserta.length - nilaiRecords.length,
        avgScore: Math.round(avgScore * 10) / 10,
        maxScore,
        minScore,
        lulus,
        tidakLulus: scores.length - lulus,
        passingScore,
      },
    })
  } catch (error) {
    console.error("[ujian nilai list] error:", error)
    return NextResponse.json({ error: "Gagal memuat nilai ujian" }, { status: 500 })
  }
}

/**
 * POST /api/admin/ujian/[id]/nilai
 * Bulk input nilai for ujian.
 * Body: {
 *   entries: [{ santriId, score, scoreUts?, scoreUas?, scorePraktik?, notes? }],
 *   gradedById?: string
 * }
 *
 * Side effect: also upserts Nilai record with type matching ujian.type (UTS/UAS/PRAKTIK)
 * so it appears in rapor aggregation.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const ujian = await db.ujian.findUnique({
      where: { id, deletedAt: null },
      include: { mapel: true, kelas: true },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    // V2 security: validate GURU has teaching access
    const accessCheck = await validateGuruAccess(session, {
      kelasId: ujian.kelasId,
      mapelId: ujian.mapelId,
      guruId: body.gradedById || ujian.guruId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    if (!Array.isArray(body.entries) || body.entries.length === 0) {
      return NextResponse.json({ error: "entries harus array tidak kosong" }, { status: 400 })
    }

    const results: any[] = []
    const gradedAt = new Date()
    const gradedById = session.user.id

    await db.$transaction(async (tx) => {
      for (const entry of body.entries) {
        if (!entry.santriId || entry.score === undefined || entry.score === null) continue
        const score = Number(entry.score)
        if (Number.isNaN(score) || score < 0 || score > ujian.maxScore) {
          continue // skip invalid
        }

        // Upsert UjianNilai
        const existing = await tx.ujianNilai.findUnique({
          where: { ujianId_santriId: { ujianId: id, santriId: entry.santriId } },
        })
        let ujianNilai
        if (existing) {
          ujianNilai = await tx.ujianNilai.update({
            where: { id: existing.id },
            data: {
              score,
              scoreUts: entry.scoreUts ?? existing.scoreUts,
              scoreUas: entry.scoreUas ?? existing.scoreUas,
              scorePraktik: entry.scorePraktik ?? existing.scorePraktik,
              notes: entry.notes ?? existing.notes,
              gradedById,
              gradedAt,
            },
          })
        } else {
          ujianNilai = await tx.ujianNilai.create({
            data: {
              ujianId: id,
              santriId: entry.santriId,
              score,
              scoreUts: entry.scoreUts || null,
              scoreUas: entry.scoreUas || null,
              scorePraktik: entry.scorePraktik || null,
              notes: entry.notes || null,
              gradedById,
              gradedAt,
            },
          })
        }
        results.push(ujianNilai)

        // Side effect: upsert Nilai with type matching ujian.type
        // Normalize score to 0-100 for rapor aggregation
        const normalizedScore = ujian.maxScore ? (score / ujian.maxScore) * 100 : score
        const nilaiType = ujian.type === "UTS" ? "UTS"
          : ujian.type === "UAS" ? "UAS"
          : ujian.type === "PRAKTIK" || ujian.type === "MAKEUP" ? "PRAKTIK"
          : "UTS" // default for QUIZ

        const ta = ujian.tahunAjaranId
        const sem = ujian.semesterId

        const existingNilai = await tx.nilai.findFirst({
          where: {
            santriId: entry.santriId,
            mapelId: ujian.mapelId,
            type: nilaiType,
            semesterId: sem,
            tahunAjaranId: ta,
          },
        })

        if (existingNilai) {
          await tx.nilai.update({
            where: { id: existingNilai.id },
            data: {
              score: normalizedScore,
              notes: `${ujian.title} (${ujian.type})`,
              guruId: accessCheck.guru?.id || gradedById,
              assessmentDate: gradedAt,
            },
          })
        } else {
          await tx.nilai.create({
            data: {
              tahunAjaranId: ta,
              semesterId: sem,
              santriId: entry.santriId,
              kelasId: ujian.kelasId,
              mapelId: ujian.mapelId,
              guruId: accessCheck.guru?.id || null,
              type: nilaiType,
              score: normalizedScore,
              notes: `${ujian.title} (${ujian.type})`,
              assessmentDate: gradedAt,
            },
          })
        }
      }
    })

    await logAudit(session, "BULK_UPDATE", "UJIAN_NILAI", id, {
      count: results.length,
      ujianTitle: ujian.title,
    }, req)

    return NextResponse.json({ data: results, count: results.length })
  } catch (error) {
    console.error("[ujian nilai input] error:", error)
    return NextResponse.json({ error: "Gagal input nilai ujian" }, { status: 500 })
  }
}
