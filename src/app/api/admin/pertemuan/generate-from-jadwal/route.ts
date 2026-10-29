import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

/**
 * POST /api/admin/pertemuan/generate-from-jadwal
 *
 * Auto-generate Pertemuan records from existing Jadwal entries for a given week.
 *
 * Body:
 *   {
 *     "weekStartDate": "2025-11-03",       // ISO date of Monday (or any date in the week)
 *     "kelasId": "abc...",                  // optional — limit to one kelas
 *     "mapelId": "xyz...",                  // optional — limit to one mapel
 *     "pertemuanKeOffset": 0,                // optional — start counting from N+1
 *     "dryRun": false                        // optional — preview without saving
 *   }
 *
 * Logic:
 * 1. Find active TA + Semester
 * 2. Find all Jadwal entries in active period (optionally filtered by kelas/mapel)
 * 3. For each Jadwal, compute the date within the given week that matches dayOfWeek
 * 4. Find next pertemuanKe for this kelas+mapel+TA+Semester
 * 5. Create Pertemuan if not exists (idempotent by kelas+mapel+pertemuanKe+TA+Semester uniqueness)
 *
 * Returns: { created, skipped, errors, total }
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("pertemuan:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    const weekStartDateStr = body.weekStartDate
    if (!weekStartDateStr) {
      return NextResponse.json({ error: "weekStartDate wajib diisi (format YYYY-MM-DD)" }, { status: 400 })
    }

    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })
    if (!ta || !sem) {
      return NextResponse.json({ error: "Tahun ajaran/semester aktif tidak ditemukan" }, { status: 400 })
    }

    // Determine week start (Monday). weekStartDate can be any day; we compute Monday of that week.
    const inputDate = new Date(weekStartDateStr)
    if (Number.isNaN(inputDate.getTime())) {
      return NextResponse.json({ error: "Format weekStartDate tidak valid" }, { status: 400 })
    }
    // Adjust to local midnight to avoid timezone drift
    inputDate.setHours(0, 0, 0, 0)
    const dayOfWeekInput = inputDate.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
    // Convert to Monday-based offset: Monday=0, Tuesday=1, ..., Sunday=6
    const mondayOffset = dayOfWeekInput === 0 ? -6 : 1 - dayOfWeekInput
    const mondayDate = new Date(inputDate.getTime() + mondayOffset * 86400000)

    // Build where clause for Jadwal
    const jadwalWhere: any = {
      tahunAjaranId: ta.id,
      semesterId: sem.id,
    }
    if (body.kelasId) jadwalWhere.kelasId = body.kelasId
    if (body.mapelId) jadwalWhere.mapelId = body.mapelId

    // V2 security: if GURU role, auto-filter to their own jadwal
    const guruAccess = await validateGuruAccess(session, {
      kelasId: body.kelasId,
      mapelId: body.mapelId,
    }, req)
    if (!guruAccess.allowed && guruAccess.error) return guruAccess.error
    if (guruAccess.guru) {
      jadwalWhere.guruId = guruAccess.guru.id
    }

    const jadwalList = await db.jadwal.findMany({
      where: jadwalWhere,
      include: {
        kelas: { select: { id: true, name: true } },
        mapel: { select: { id: true, name: true } },
        guru: { select: { id: true, name: true } },
      },
    })

    if (jadwalList.length === 0) {
      return NextResponse.json({
        message: "Tidak ada jadwal mengajar ditemukan untuk filter ini",
        created: [],
        skipped: [],
        total: 0,
      })
    }

    const created: any[] = []
    const skipped: any[] = []
    const errors: any[] = []

    // Group by (kelasId, mapelId) to compute next pertemuanKe
    const groupedByKelasMapel = new Map<string, typeof jadwalList>()
    for (const j of jadwalList) {
      const key = `${j.kelasId}|${j.mapelId}`
      if (!groupedByKelasMapel.has(key)) groupedByKelasMapel.set(key, [])
      groupedByKelasMapel.get(key)!.push(j)
    }

    for (const [, groupJadwal] of groupedByKelasMapel) {
      // Find existing max pertemuanKe for this kelas+mapel+TA+Semester
      const existingPertemuan = await db.pertemuan.findMany({
        where: {
          kelasId: groupJadwal[0].kelasId,
          mapelId: groupJadwal[0].mapelId,
          tahunAjaranId: ta.id,
          semesterId: sem.id,
        },
        select: { pertemuanKe: true, date: true },
        orderBy: { pertemuanKe: "desc" },
      })
      const nextPertemuanKe = (existingPertemuan[0]?.pertemuanKe || 0) + 1
      const offset = Number(body.pertemuanKeOffset) || 0
      const targetPertemuanKe = nextPertemuanKe + offset

      // For each jadwal entry, compute its date in the target week
      // dayOfWeek: 1=Senin, 7=Ahad (Minggu)
      // We need to skip jadwal whose dayOfWeek falls outside the active TA period
      for (const j of groupJadwal) {
        const daysFromMonday = j.dayOfWeek === 7 ? 6 : j.dayOfWeek - 1 // Convert to Monday=0..Sunday=6
        const pertemuanDate = new Date(mondayDate.getTime() + daysFromMonday * 86400000)

        // Skip if pertemuanDate falls outside active TA period
        if (pertemuanDate < ta.startDate || pertemuanDate > ta.endDate) {
          errors.push({
            jadwalId: j.id,
            kelas: j.kelas?.name,
            mapel: j.mapel?.name,
            reason: `Tanggal ${pertemuanDate.toISOString().slice(0, 10)} di luar periode TA aktif`,
          })
          continue
        }

        // Skip if pertemuan for this date already exists (idempotent per date)
        const dStart = new Date(pertemuanDate.getFullYear(), pertemuanDate.getMonth(), pertemuanDate.getDate())
        const dEnd = new Date(pertemuanDate.getFullYear(), pertemuanDate.getMonth(), pertemuanDate.getDate(), 23, 59, 59)
        const existingOnDate = await db.pertemuan.findFirst({
          where: {
            kelasId: j.kelasId,
            mapelId: j.mapelId,
            tahunAjaranId: ta.id,
            semesterId: sem.id,
            date: { gte: dStart, lte: dEnd },
          },
        })
        if (existingOnDate) {
          skipped.push({
            jadwalId: j.id,
            kelas: j.kelas?.name,
            mapel: j.mapel?.name,
            date: dStart.toISOString().slice(0, 10),
            reason: "Pertemuan sudah ada untuk tanggal ini",
          })
          continue
        }

        if (body.dryRun) {
          created.push({
            dryRun: true,
            kelas: j.kelas?.name,
            mapel: j.mapel?.name,
            guru: j.guru?.name,
            pertemuanKe: targetPertemuanKe,
            date: dStart.toISOString().slice(0, 10),
            dayOfWeek: j.dayOfWeek,
          })
          continue
        }

        try {
          const newPertemuan = await db.pertemuan.create({
            data: {
              tahunAjaranId: ta.id,
              semesterId: sem.id,
              kelasId: j.kelasId,
              mapelId: j.mapelId,
              guruId: j.guruId,
              pertemuanKe: targetPertemuanKe,
              date: dStart,
              topic: null,
              description: `Auto-generated dari Jadwal: ${j.kelas?.name} - ${j.mapel?.name} (${DAYS_LABEL[j.dayOfWeek]})`,
              isCompleted: false,
            },
            include: {
              kelas: { select: { name: true } },
              mapel: { select: { name: true } },
            },
          })
          created.push({
            id: newPertemuan.id,
            pertemuanKe: newPertemuan.pertemuanKe,
            date: dStart.toISOString().slice(0, 10),
            kelas: newPertemuan.kelas?.name,
            mapel: newPertemuan.mapel?.name,
            guru: j.guru?.name,
          })
        } catch (err: any) {
          errors.push({
            jadwalId: j.id,
            kelas: j.kelas?.name,
            mapel: j.mapel?.name,
            reason: err.message,
          })
        }
      }
    }

    await logAudit(session, "CREATE", "PERTEMUAN_BULK", undefined, {
      weekStart: mondayDate.toISOString().slice(0, 10),
      kelasId: body.kelasId || "ALL",
      mapelId: body.mapelId || "ALL",
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      dryRun: !!body.dryRun,
    }, req)

    return NextResponse.json({
      created,
      skipped,
      errors,
      weekStart: mondayDate.toISOString().slice(0, 10),
      total: created.length + skipped.length + errors.length,
      summary: {
        createdCount: created.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
        targetPertemuanKe: body.pertemuanKeOffset ? undefined : undefined, // informational
      },
    })
  } catch (error) {
    console.error("[pertemuan generate-from-jadwal] error:", error)
    return NextResponse.json({ error: "Gagal generate pertemuan dari jadwal" }, { status: 500 })
  }
}

const DAYS_LABEL: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Ahad",
}
