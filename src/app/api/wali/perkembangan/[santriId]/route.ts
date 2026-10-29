import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken, verifyWaliSantriAccess } from "@/lib/wali/auth"

/**
 * GET /api/wali/perkembangan/[santriId]
 * Rekap perkembangan akademik santri untuk wali.
 *
 * Returns:
 * - Absensi summary (30 hari terakhir) + persentase kehadiran
 * - Nilai per mapel (latest per type)
 * - Tugas status (submitted/graded/not submitted count)
 * - Materi yang dipublikasikan untuk kelas santri
 * - Pertemuan terbaru dengan topic & absensi santri
 * - Catatan trend (naik/turun/stabil berdasarkan nilai harian)
 *
 * Header: Authorization: Bearer <token>
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ santriId: string }> }) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })
    }

    const { santriId } = await params
    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) {
      return NextResponse.json({
        error: "Forbidden",
        message: access.reason || "Anda tidak memiliki akses ke santri ini",
      }, { status: 403 })
    }

    const santri = await db.santri.findUnique({
      where: { id: santriId },
      select: { id: true, name: true, nis: true, kelasId: true, kelas: true },
    })
    if (!santri) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 })

    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })
    if (!ta || !sem) {
      return NextResponse.json({ error: "Tahun ajaran/semester aktif tidak ditemukan" }, { status: 400 })
    }

    // Parallel fetch
    const [absensiAll, nilaiAll, tugasList, pertemuanList, materiList] = await Promise.all([
      // Absensi: 90 hari terakhir
      db.absensi.findMany({
        where: {
          santriId,
          tahunAjaranId: ta.id,
          date: { gte: new Date(Date.now() - 90 * 86400000) },
        },
        orderBy: { date: "desc" },
      }),
      // Nilai: semua semester ini
      db.nilai.findMany({
        where: { santriId, semesterId: sem.id, tahunAjaranId: ta.id },
        include: { mapel: { select: { id: true, name: true, code: true, kkm: true } } },
        orderBy: { assessmentDate: "desc" },
      }),
      // Tugas: dari kelas santri
      santri.kelasId
        ? db.tugas.findMany({
            where: {
              kelasId: santri.kelasId,
              tahunAjaranId: ta.id,
              semesterId: sem.id,
              deletedAt: null,
              isPublished: true,
            },
            include: {
              mapel: { select: { name: true } },
              submissions: {
                where: { santriId },
                select: { id: true, status: true, score: true, submittedAt: true, feedback: true },
              },
            },
            orderBy: { dueDate: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
      // Pertemuan: 5 terakhir untuk kelas santri
      santri.kelasId
        ? db.pertemuan.findMany({
            where: { kelasId: santri.kelasId, tahunAjaranId: ta.id, semesterId: sem.id },
            include: { mapel: { select: { name: true } } },
            orderBy: { date: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      // Materi: yang dipublikasikan untuk kelas santri
      santri.kelasId
        ? db.materi.findMany({
            where: {
              OR: [{ kelasId: santri.kelasId }, { kelasId: null }],
              tahunAjaranId: ta.id,
              semesterId: sem.id,
              deletedAt: null,
              isPublished: true,
            },
            include: { mapel: { select: { name: true } } },
            orderBy: { publishedAt: "desc" },
            take: 10,
          })
        : Promise.resolve([]),
    ])

    // Compute absensi summary
    const totalAbsensi = absensiAll.length
    const absensiSummary = {
      total: totalAbsensi,
      hadir: absensiAll.filter((a) => a.status === "HADIR").length,
      sakit: absensiAll.filter((a) => a.status === "SAKIT").length,
      izin: absensiAll.filter((a) => a.status === "IZIN").length,
      alfa: absensiAll.filter((a) => a.status === "ALFA").length,
      persentaseHadir: totalAbsensi > 0
        ? Math.round((absensiAll.filter((a) => a.status === "HADIR").length / totalAbsensi) * 100)
        : 0,
    }

    // Compute nilai per mapel (latest per type)
    const nilaiByMapel = new Map<string, {
      mapel: any
      nilaiByType: Record<string, any[]>
      rataRata: number | null
      trend: "NAIK" | "TURUN" | "STABIL" | "BARU"
    }>()

    for (const n of nilaiAll) {
      const key = n.mapelId
      if (!nilaiByMapel.has(key)) {
        nilaiByMapel.set(key, {
          mapel: n.mapel,
          nilaiByType: {},
          rataRata: null,
          trend: "BARU",
        })
      }
      const entry = nilaiByMapel.get(key)!
      if (!entry.nilaiByType[n.type]) entry.nilaiByType[n.type] = []
      entry.nilaiByType[n.type].push({
        score: n.score,
        assessmentDate: n.assessmentDate,
        notes: n.notes,
      })
    }

    // Compute rata-rata per mapel + trend (compare first half vs second half of HARIAN)
    for (const [, entry] of nilaiByMapel) {
      const allScores: { score: number; date: Date }[] = []
      for (const type in entry.nilaiByType) {
        for (const n of entry.nilaiByType[type]) {
          allScores.push({ score: n.score, date: new Date(n.assessmentDate) })
        }
      }
      allScores.sort((a, b) => a.date.getTime() - b.date.getTime())
      if (allScores.length > 0) {
        entry.rataRata = Math.round(allScores.reduce((s, n) => s + n.score, 0) / allScores.length)
      }
      // Trend: split harian into first/second half
      const harian = entry.nilaiByType["HARIAN"] || []
      if (harian.length >= 4) {
        const sortedHarian = [...harian].sort(
          (a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime(),
        )
        const half = Math.floor(sortedHarian.length / 2)
        const firstAvg = sortedHarian.slice(0, half).reduce((s, n) => s + n.score, 0) / half
        const secondAvg = sortedHarian.slice(half).reduce((s, n) => s + n.score, 0) / (sortedHarian.length - half)
        const diff = secondAvg - firstAvg
        entry.trend = Math.abs(diff) < 3 ? "STABIL" : diff > 0 ? "NAIK" : "TURUN"
      }
    }

    // Compute tugas summary
    const tugasSummary = {
      total: tugasList.length,
      submitted: tugasList.filter((t) => t.submissions.length > 0 && t.submissions[0].status !== "NOT_SUBMITTED").length,
      graded: tugasList.filter((t) => t.submissions.length > 0 && t.submissions[0].status === "GRADED").length,
      notSubmitted: tugasList.filter((t) => t.submissions.length === 0).length,
      overdueNotSubmitted: tugasList.filter(
        (t) => t.submissions.length === 0 && new Date(t.dueDate) < new Date(),
      ).length,
    }

    // Annotate pertemuan with this santri's absensi on that date
    const pertemuanWithAbsensi = await Promise.all(
      pertemuanList.map(async (p) => {
        const dStart = new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate())
        const dEnd = new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate(), 23, 59, 59)
        const absensi = await db.absensi.findFirst({
          where: { santriId, date: { gte: dStart, lte: dEnd }, tahunAjaranId: ta.id },
          select: { status: true, note: true },
        })
        return {
          id: p.id,
          pertemuanKe: p.pertemuanKe,
          date: p.date,
          topic: p.topic,
          mapel: p.mapel?.name,
          isCompleted: p.isCompleted,
          santriAbsensi: absensi?.status || "BELUM",
        }
      }),
    )

    return NextResponse.json({
      data: {
        santri: {
          id: santri.id,
          name: santri.name,
          nis: santri.nis,
          kelas: santri.kelas,
        },
        activePeriod: { tahunAjaran: ta.name, semester: sem.name },
        absensiSummary,
        absensiTerbaru: absensiAll.slice(0, 10),
        nilaiPerMapel: Array.from(nilaiByMapel.values()),
        tugasSummary,
        tugasTerbaru: tugasList.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title,
          mapel: t.mapel?.name,
          dueDate: t.dueDate,
          type: t.type,
          maxScore: t.maxScore,
          submission: t.submissions[0] || null,
        })),
        materiTerbaru: materiList.map((m) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          mapel: m.mapel?.name,
          fileUrl: m.fileUrl,
          externalUrl: m.externalUrl,
          publishedAt: m.publishedAt,
        })),
        pertemuanTerbaru: pertemuanWithAbsensi,
      },
    })
  } catch (error) {
    console.error("[wali perkembangan] error:", error)
    return NextResponse.json({ error: "Gagal memuat perkembangan santri" }, { status: 500 })
  }
}
