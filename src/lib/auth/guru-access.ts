/**
 * ============================================================================
 * GURU ACCESS VALIDATION — V2 Akademik & Pembelajaran
 * ============================================================================
 * Security helper: validate that a logged-in Guru user actually has the right
 * to act on a specific kelas+mapel combination.
 *
 * Without this check, ANY user with role GURU could create/update/delete
 * materi, tugas, pertemuan, absensi, nilai for ANY kelas+mapel — a security gap.
 *
 * Rules:
 * - SUPER_ADMIN: bypass — full access
 * - KEPALA: bypass — monitoring role, read-only by permission
 * - GURU: must have an active Jadwal entry linking them to the kelas+mapel
 *         (during the active Tahun Ajaran + Semester). If no Jadwal exists,
 *         the guru is not assigned to teach that class+subject.
 * - Other roles: denied by default
 *
 * Usage:
 *   const check = await validateGuruAccess(session, { kelasId, mapelId }, req)
 *   if (check.error) return check.error
 * ============================================================================
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import type { AppSession } from "./guards"

export interface GuruAccessCheck {
  allowed: boolean
  error?: NextResponse
  guru?: { id: string; name: string } | null
}

/**
 * Validate that the current session user (if GURU role) has teaching access
 * to the given kelasId + mapelId combo.
 *
 * For non-GURU roles with the required permission (SUPER_ADMIN, etc.),
 * the check passes through.
 *
 * @param session - AppSession from requireApiPermission
 * @param scope - { kelasId?, mapelId?, guruId? } — at least mapelId should be set
 * @param _req - NextRequest (reserved for future IP/UA logging)
 */
export async function validateGuruAccess(
  session: AppSession,
  scope: { kelasId?: string | null; mapelId?: string | null; guruId?: string | null },
  _req?: { headers: Headers },
): Promise<GuruAccessCheck> {
  // SUPER_ADMIN bypass
  if (session.user.roles?.includes("SUPER_ADMIN")) {
    return { allowed: true }
  }

  // Non-GURU roles (KEPALA, BENDAHARA) — they pass through permission check,
  // we don't enforce guru-scope validation here.
  if (!session.user.roles?.includes("GURU")) {
    return { allowed: true }
  }

  // Find the Guru record linked to this user
  const guru = await db.guru.findFirst({
    where: { userId: session.user.id, status: "AKTIF", deletedAt: null },
    select: { id: true, name: true },
  })

  if (!guru) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: "Forbidden",
          message: "Akun Anda tidak terhubung ke data Guru aktif. Hubungi admin.",
        },
        { status: 403 },
      ),
    }
  }

  // If a specific guruId was passed (e.g. user wants to assign materi to another guru),
  // GURU role is NOT allowed to do this — only SUPER_ADMIN can.
  if (scope.guruId && scope.guruId !== guru.id) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: "Forbidden",
          message: "Anda hanya dapat mengelola materi/tugas untuk diri Anda sendiri.",
        },
        { status: 403 },
      ),
      guru,
    }
  }

  // If no kelasId or mapelId provided, we can't validate scope — allow with caution
  // (e.g. for list endpoints where filter is optional)
  if (!scope.kelasId && !scope.mapelId) {
    return { allowed: true, guru }
  }

  // Get active TA + Semester
  const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
  const sem = await db.semester.findFirst({ where: { isActive: true } })

  if (!ta || !sem) {
    // No active period — can't validate jadwal; allow (will fail elsewhere if needed)
    return { allowed: true, guru }
  }

  // Check Jadwal: is this guru assigned to teach this kelas+mapel in active period?
  const where: any = {
    guruId: guru.id,
    tahunAjaranId: ta.id,
    semesterId: sem.id,
  }
  if (scope.kelasId) where.kelasId = scope.kelasId
  if (scope.mapelId) where.mapelId = scope.mapelId

  const assignedJadwal = await db.jadwal.findFirst({ where })

  if (!assignedJadwal) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: "Forbidden",
          message: `Anda tidak memiliki jadwal mengajar untuk kelas+mapel ini di TA ${ta.code} semester ${sem.name}. Hubungi admin untuk penugasan jadwal.`,
        },
        { status: 403 },
      ),
      guru,
    }
  }

  return { allowed: true, guru }
}

/**
 * Convenience: filter Jadwal-based scope for GURU.
 * Returns the list of (kelasId, mapelId) pairs the guru is allowed to teach.
 *
 * Use this for list endpoints where GURU should only see their own data.
 */
export async function getGuruScope(session: AppSession): Promise<{
  isGuru: boolean
  guruId: string | null
  allowedPairs: { kelasId: string; mapelId: string }[]
}> {
  if (!session.user.roles?.includes("GURU") || session.user.roles?.includes("SUPER_ADMIN")) {
    return { isGuru: false, guruId: null, allowedPairs: [] }
  }

  const guru = await db.guru.findFirst({
    where: { userId: session.user.id, status: "AKTIF", deletedAt: null },
    select: { id: true },
  })
  if (!guru) return { isGuru: true, guruId: null, allowedPairs: [] }

  const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
  const sem = await db.semester.findFirst({ where: { isActive: true } })
  if (!ta || !sem) return { isGuru: true, guruId: guru.id, allowedPairs: [] }

  const jadwalList = await db.jadwal.findMany({
    where: { guruId: guru.id, tahunAjaranId: ta.id, semesterId: sem.id },
    select: { kelasId: true, mapelId: true },
  })

  return {
    isGuru: true,
    guruId: guru.id,
    allowedPairs: jadwalList.map((j) => ({ kelasId: j.kelasId, mapelId: j.mapelId })),
  }
}
