import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth } from "@/lib/auth/guards"
import { getGuruScope } from "@/lib/auth/guru-access"

/**
 * GET /api/admin/guru/stats
 *
 * Returns V2 dashboard stats for the logged-in guru:
 *   - pertemuanToday: pertemuan count for today (across guru's assigned kelas+mapel)
 *   - pendingGrading: pengumpulan count with status SUBMITTED/LATE (for this guru's tugas)
 *   - materiCount: materi published by this guru
 *   - tugasActive: tugas published by this guru with dueDate >= now
 *
 * For SUPER_ADMIN/KEPALA/BENDAHARA: returns aggregated stats across all gurus.
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error
  try {
    const session = guard.session

    // Determine if user is GURU (with guruId) — use guru-specific filters
    // For non-GURU (admin/kepala/bendahara), return global stats (less specific but still useful)
    const guruScope = await getGuruScope(session)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })

    // Build where clauses based on whether this is a guru (with guruId) or admin
    const tugasWhere: any = { deletedAt: null, isPublished: true }
    const materiWhere: any = { deletedAt: null, isPublished: true }
    const pertemuanWhere: any = {}
    const pengumpulanWhere: any = { status: { in: ["SUBMITTED", "LATE"] } }

    if (guruScope.isGuru && guruScope.guruId) {
      tugasWhere.guruId = guruScope.guruId
      materiWhere.guruId = guruScope.guruId
      pertemuanWhere.guruId = guruScope.guruId
      pengumpulanWhere.tugas = { guruId: guruScope.guruId, deletedAt: null }
    }

    if (ta) {
      tugasWhere.tahunAjaranId = ta.id
      materiWhere.tahunAjaranId = ta.id
      pertemuanWhere.tahunAjaranId = ta.id
    }
    if (sem) {
      tugasWhere.semesterId = sem.id
      materiWhere.semesterId = sem.id
      pertemuanWhere.semesterId = sem.id
    }

    const [pertemuanToday, pendingGrading, materiCount, tugasActive] = await Promise.all([
      db.pertemuan.count({
        where: { ...pertemuanWhere, date: { gte: todayStart, lte: todayEnd } },
      }),
      db.pengumpulanTugas.count({ where: pengumpulanWhere }),
      db.materi.count({ where: materiWhere }),
      db.tugas.count({
        where: { ...tugasWhere, dueDate: { gte: now } },
      }),
    ])

    return NextResponse.json({
      data: {
        pertemuanToday,
        pendingGrading,
        materiCount,
        tugasActive,
        guruId: guruScope.guruId,
        isGuru: guruScope.isGuru,
      },
    })
  } catch (error) {
    console.error("[guru stats] error:", error)
    return NextResponse.json({ error: "Gagal memuat stats guru" }, { status: 500 })
  }
}
