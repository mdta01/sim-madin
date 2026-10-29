import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/tugas/[id]/pengumpulan
 * List semua pengumpulan untuk sebuah tugas + santri kelas yang belum mengumpulkan.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("tugas:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params

    // V2 #11: support status filter & pagination
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status") // SUBMITTED | GRADED | LATE | NOT_SUBMITTED | RETURNED
    const limit = Math.min(Number(searchParams.get("limit")) || 500, 500)
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0)

    const tugas = await db.tugas.findUnique({
      where: { id, deletedAt: null },
      include: {
        kelas: true,
        submissions: {
          include: {
            santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    })
    if (!tugas) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })

    // Compute not-submitted list (santri aktif di kelas tugas tanpa record pengumpulan)
    const submittedIds = new Set(tugas.submissions.map((s) => s.santriId))
    const santriKelas = await db.santri.findMany({
      where: { kelasId: tugas.kelasId, status: "AKTIF", deletedAt: null },
      select: { id: true, name: true, nis: true, photoUrl: true },
      orderBy: { name: "asc" },
    })
    const notSubmitted = santriKelas
      .filter((s) => !submittedIds.has(s.id))
      .map((s) => ({
        id: `pending-${s.id}`,
        tugasId: id,
        santri: s,
        status: "NOT_SUBMITTED",
        submittedAt: null,
        fileUrl: null,
        textAnswer: null,
        score: null,
        feedback: null,
        gradedAt: null,
      }))

    const allSubmissions = [
      ...tugas.submissions.map((s) => {
        // Compute late status
        const isLate = new Date(s.submittedAt) > new Date(tugas.dueDate)
        return {
          ...s,
          status: s.status === "SUBMITTED" && isLate ? "LATE" : s.status,
        }
      }),
      ...notSubmitted,
    ]

    // V2 #11: apply status filter
    let filtered = allSubmissions
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter)
    }

    // V2 #11: pagination
    const paginated = filtered.slice(offset, offset + limit)

    return NextResponse.json({
      data: paginated,
      total: filtered.length,
      totalCount: allSubmissions.length,
      stats: {
        total: allSubmissions.length,
        submitted: allSubmissions.filter((s) => s.status === "SUBMITTED").length,
        late: allSubmissions.filter((s) => s.status === "LATE").length,
        graded: allSubmissions.filter((s) => s.status === "GRADED").length,
        notSubmitted: notSubmitted.length,
      },
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < filtered.length,
      },
    })
  } catch (error) {
    console.error("[pengumpulan list] error:", error)
    return NextResponse.json({ error: "Gagal memuat pengumpulan tugas" }, { status: 500 })
  }
}
