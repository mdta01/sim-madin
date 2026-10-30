import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { createNotifikasi, getWaliIdFromSantri } from "@/lib/notifikasi/helper"

/**
 * POST /api/admin/siklus/kenaikan-kelas
 *
 * Bulk promote santri to next class (Siklus Santri: ... → Kenaikan Kelas → ...)
 *
 * Body: {
 *   kelasId: string,         // kelas saat ini
 *   tahunAjaranIdBaru: string, // TA baru setelah naik kelas
 *   semesterIdBaru: string,   // semester baru
 *   dryRun?: boolean,         // preview tanpa execute
 *   santriIds?: string[],     // optional: hanya santri tertentu (default: semua AKTIF di kelas)
 *   skipLulus?: boolean,      // skip santri yang sudah LULUS
 * }
 *
 * Logic:
 * - Untuk santri kelas terakhir (MDI-6): status → LULUS (via V10 Alumni)
 * - Untuk santri kelas lain: update kelasId ke kelas berikutnya (sortOrder + 1)
 * - Update tahunAjaranId ke TA baru
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("santri:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.kelasId) {
      return NextResponse.json({ error: "kelasId wajib diisi" }, { status: 400 })
    }

    const kelas = await db.kelas.findUnique({
      where: { id: body.kelasId, deletedAt: null, isActive: true },
      select: { id: true, name: true, code: true, level: true, sortOrder: true },
    })
    if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })

    // Find next kelas (sortOrder + 1, same level prefix)
    const nextKelas = await db.kelas.findFirst({
      where: {
        sortOrder: kelas.sortOrder + 1,
        deletedAt: null,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    })

    // Get santri in this kelas
    const where: any = { kelasId: body.kelasId, status: "AKTIF", deletedAt: null }
    if (body.santriIds && Array.isArray(body.santriIds)) {
      where.id = { in: body.santriIds }
    }
    const santriList = await db.santri.findMany({
      where,
      select: { id: true, name: true, nis: true, status: true },
      orderBy: { name: "asc" },
    })

    const results: any[] = []
    const dryRun = body.dryRun === true

    // Determine action per santri
    for (const santri of santriList) {
      if (body.skipLulus && santri.status === "LULUS") {
        results.push({ santriId: santri.id, name: santri.name, action: "SKIP", reason: "Sudah LULUS" })
        continue
      }

      if (!nextKelas) {
        // Last class — promote to LULUS via Alumni
        results.push({
          santriId: santri.id,
          name: santri.name,
          action: "LULUS",
          reason: "Kelas terakhir, akan diubah menjadi alumni",
          kelasLama: kelas.name,
        })
      } else {
        // Promote to next kelas
        results.push({
          santriId: santri.id,
          name: santri.name,
          action: "NAIK_KELAS",
          kelasLama: kelas.name,
          kelasBaru: nextKelas.name,
          nextKelasId: nextKelas.id,
        })
      }
    }

    if (dryRun) {
      return NextResponse.json({
        preview: true,
        kelas: kelas.name,
        nextKelas: nextKelas?.name || "LULUS (kelas terakhir)",
        totalSantri: santriList.length,
        results,
      })
    }

    // Execute
    const updated: any[] = []
    await db.$transaction(async (tx) => {
      for (const r of results) {
        if (r.action === "NAIK_KELAS") {
          const u = await tx.santri.update({
            where: { id: r.santriId },
            data: {
              kelasId: r.nextKelasId,
              tahunAjaranId: body.tahunAjaranIdBaru || undefined,
            },
          })
          updated.push({ ...u, action: "NAIK_KELAS", kelasBaru: r.kelasBaru })

          // V12 → V6 integration: notify wali that santri has been promoted.
          // Best-effort — failures are logged but do not break the bulk operation.
          try {
            const waliId = await getWaliIdFromSantri(r.santriId)
            if (waliId) {
              await createNotifikasi({
                waliId,
                santriId: r.santriId,
                type: "KENAIKAN_KELAS",
                title: "Kenaikan Kelas",
                message: `Ananda ${r.name} telah naik ke kelas ${r.kelasBaru}.`,
                priority: "NORMAL",
                entityType: "KENAIKAN_KELAS",
                entityId: r.santriId,
              })
            }
          } catch (e) {
            console.warn(`[kenaikan-kelas] notifikasi gagal untuk santri ${r.santriId}:`, e)
          }
        } else if (r.action === "LULUS") {
          // Create Alumni record + update santri status
          const ta = await tx.tahunAjaran.findFirst({ where: { isActive: true } })
          const existingAlumni = await tx.alumni.findUnique({ where: { santriId: r.santriId } })
          if (!existingAlumni) {
            await tx.alumni.create({
              data: {
                santriId: r.santriId,
                tahunLulus: new Date().getFullYear(),
                tahunAjaranLulusId: ta?.id || null,
                statusKelulusan: "LULUS",
                tanggalLulus: new Date(),
                createdById: session.user.id,
              },
            })
          }
          const u = await tx.santri.update({
            where: { id: r.santriId },
            data: { status: "LULUS" },
          })
          updated.push({ ...u, action: "LULUS" })

          // V12 → V6 integration: notify wali about graduation.
          try {
            const waliId = await getWaliIdFromSantri(r.santriId)
            if (waliId) {
              await createNotifikasi({
                waliId,
                santriId: r.santriId,
                type: "KELULUSAN",
                title: "Selamat Kelulusan",
                message: `Ananda ${r.name} telah dinyatakan LULUS. Selamat kepada keluarga.`,
                priority: "TINGGI",
                entityType: "KELULUSAN",
                entityId: r.santriId,
              })
            }
          } catch (e) {
            console.warn(`[kenaikan-kelas] notifikasi lulus gagal untuk santri ${r.santriId}:`, e)
          }
        }
      }
    })

    await logAudit(session, "BULK_UPDATE", "KENAIKAN_KELAS", undefined, {
      kelas: kelas.name,
      nextKelas: nextKelas?.name || "LULUS",
      count: updated.length,
      lulus: updated.filter((u) => u.action === "LULUS").length,
      naikKelas: updated.filter((u) => u.action === "NAIK_KELAS").length,
    }, req)

    return NextResponse.json({
      success: true,
      kelas: kelas.name,
      nextKelas: nextKelas?.name || "LULUS (kelas terakhir)",
      totalProcessed: updated.length,
      naikKelas: updated.filter((u) => u.action === "NAIK_KELAS").length,
      lulus: updated.filter((u) => u.action === "LULUS").length,
      results: updated,
    })
  } catch (error) {
    console.error("[kenaikan kelas] error:", error)
    return NextResponse.json({ error: "Gagal memproses kenaikan kelas" }, { status: 500 })
  }
}
