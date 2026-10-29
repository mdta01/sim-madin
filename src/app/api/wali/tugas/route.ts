import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken, verifyWaliSantriAccess } from "@/lib/wali/auth"

/**
 * GET /api/wali/tugas?santriId=xxx
 *
 * List all published tugas for a santri's kelas + mapel in active TA/Semester,
 * along with the santri's submission status for each.
 *
 * Returns: { data: [{ ...tugas, submission: PengumpulanTugas | null, isOverdue: boolean }] }
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    if (!santriId) return NextResponse.json({ error: "santriId wajib diisi" }, { status: 400 })

    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) {
      return NextResponse.json({
        error: "Forbidden",
        message: access.reason || "Anda tidak memiliki akses ke santri ini",
      }, { status: 403 })
    }

    const santri = await db.santri.findUnique({
      where: { id: santriId, deletedAt: null, status: "AKTIF" },
      select: { id: true, name: true, kelasId: true },
    })
    if (!santri) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 })
    if (!santri.kelasId) {
      return NextResponse.json({ data: [], total: 0, message: "Santri belum ditugaskan ke kelas" })
    }

    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })
    if (!ta || !sem) {
      return NextResponse.json({ data: [], total: 0, message: "Tidak ada TA/Semester aktif" })
    }

    const tugasList = await db.tugas.findMany({
      where: {
        kelasId: santri.kelasId,
        tahunAjaranId: ta.id,
        semesterId: sem.id,
        deletedAt: null,
        isPublished: true,
      },
      include: {
        mapel: { select: { id: true, name: true, code: true } },
        guru: { select: { id: true, name: true } },
        submissions: {
          where: { santriId },
          select: {
            id: true, status: true, score: true, feedback: true,
            submittedAt: true, fileUrl: true, textAnswer: true, gradedAt: true,
          },
        },
      },
      orderBy: { dueDate: "desc" },
      take: 50,
    })

    const now = new Date()
    const enriched = tugasList.map((t) => {
      const submission = t.submissions[0] || null
      const isOverdue = !submission && new Date(t.dueDate) < now
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        type: t.type,
        maxScore: t.maxScore,
        dueDate: t.dueDate,
        mapel: t.mapel,
        guru: t.guru,
        submission,
        isOverdue,
      }
    })

    return NextResponse.json({
      data: enriched,
      total: enriched.length,
      stats: {
        total: enriched.length,
        submitted: enriched.filter((t) => t.submission && t.submission.status !== "NOT_SUBMITTED").length,
        graded: enriched.filter((t) => t.submission?.status === "GRADED").length,
        notSubmitted: enriched.filter((t) => !t.submission).length,
        overdue: enriched.filter((t) => t.isOverdue).length,
      },
    })
  } catch (error) {
    console.error("[wali tugas list] error:", error)
    return NextResponse.json({ error: "Gagal memuat daftar tugas" }, { status: 500 })
  }
}
