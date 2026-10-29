import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { getPredikat, NILAI_BOBAT } from "@/lib/constants"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/rapor/[id]/generate
 *
 * Auto-generate RaporMapel entries from Nilai records.
 * For each mapel that has nilai in this TA+Semester, compute nilaiAkhir using
 * bobot from NILAI_BOBAT (HARIAN 25%, TUGAS 15%, UTS 25%, UAS 25%, PRAKTIK 10%).
 *
 * Also updates Rapor.absensiHadir/Sakit/Izin/Alfa from absensi records.
 *
 * Body: { overwrite?: boolean } — if true, overwrite existing RaporMapel entries
 */
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("rapor:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const rapor = await db.rapor.findUnique({
      where: { id },
      include: {
        santri: { select: { id: true, name: true, kelasId: true } },
        kelas: { select: { name: true } },
      },
    })
    if (!rapor) return NextResponse.json({ error: "Rapor tidak ditemukan" }, { status: 404 })

    // Get all nilai for this santri in this TA+Semester, grouped by mapel
    const nilaiList = await db.nilai.findMany({
      where: {
        santriId: rapor.santriId,
        tahunAjaranId: rapor.tahunAjaranId,
        semesterId: rapor.semesterId,
      },
      include: {
        mapel: { select: { id: true, name: true, code: true, kkm: true } },
      },
    })

    // Group by mapelId
    const nilaiByMapel = new Map<string, {
      mapel: any
      byType: Record<string, number[]>
    }>()

    for (const n of nilaiList) {
      const key = n.mapelId
      if (!nilaiByMapel.has(key)) {
        nilaiByMapel.set(key, { mapel: n.mapel, byType: {} })
      }
      const entry = nilaiByMapel.get(key)!
      if (!entry.byType[n.type]) entry.byType[n.type] = []
      entry.byType[n.type].push(n.score)
    }

    // Compute nilaiAkhir per mapel using bobot
    const raporMapelData: any[] = []
    for (const [mapelId, entry] of nilaiByMapel) {
      const kkm = entry.mapel.kkm || 70
      let weightedSum = 0
      let totalBobot = 0
      const breakdown: Record<string, { avg: number; count: number }> = {}

      for (const [type, scores] of Object.entries(entry.byType)) {
        const bobot = NILAI_BOBAT[type] || 0
        if (bobot === 0 || scores.length === 0) continue
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        weightedSum += avg * bobot
        totalBobot += bobot
        breakdown[type] = { avg: Math.round(avg * 10) / 10, count: scores.length }
      }

      if (totalBobot === 0) continue // no nilai for this mapel

      const nilaiAkhir = Math.round((weightedSum / totalBobot) * 10) / 10
      const predikat = getPredikat(nilaiAkhir)
      const isTuntas = nilaiAkhir >= kkm

      raporMapelData.push({
        mapelId,
        mapel: entry.mapel,
        nilaiAkhir,
        predikat,
        kkm,
        isTuntas,
        breakdown,
      })
    }

    // Get overwrite flag
    const overwrite = body.overwrite === true

    // Upsert RaporMapel entries
    const results: any[] = []
    for (const data of raporMapelData) {
      const existing = await db.raporMapel.findUnique({
        where: { raporId_mapelId: { raporId: id, mapelId: data.mapelId } },
      })

      if (existing && !overwrite) {
        // Skip if exists and overwrite=false
        results.push({ ...existing, skipped: true, breakdown: data.breakdown })
        continue
      }

      if (existing) {
        const updated = await db.raporMapel.update({
          where: { id: existing.id },
          data: {
            nilaiAkhir: data.nilaiAkhir,
            predikat: data.predikat,
            kkm: data.kkm,
            isTuntas: data.isTuntas,
            // Preserve existing deskripsi if not overwritten
          },
        })
        results.push({ ...updated, breakdown: data.breakdown })
      } else {
        const created = await db.raporMapel.create({
          data: {
            raporId: id,
            mapelId: data.mapelId,
            nilaiAkhir: data.nilaiAkhir,
            predikat: data.predikat,
            kkm: data.kkm,
            isTuntas: data.isTuntas,
          },
        })
        results.push({ ...created, breakdown: data.breakdown })
      }
    }

    // Update Rapor absensi stats
    const absensiRecords = await db.absensi.findMany({
      where: {
        santriId: rapor.santriId,
        tahunAjaranId: rapor.tahunAjaranId,
      },
      select: { status: true },
    })

    const hadir = absensiRecords.filter((a) => a.status === "HADIR").length
    const sakit = absensiRecords.filter((a) => a.status === "SAKIT").length
    const izin = absensiRecords.filter((a) => a.status === "IZIN").length
    const alfa = absensiRecords.filter((a) => a.status === "ALFA").length

    await db.rapor.update({
      where: { id },
      data: {
        absensiHadir: hadir,
        absensiSakit: sakit,
        absensiIzin: izin,
        absensiAlfa: alfa,
      },
    })

    await logAudit(session, "GENERATE", "RAPOR", id, {
      mapelCount: results.length,
      overwritten: overwrite,
      absensiTotal: absensiRecords.length,
    }, req)

    return NextResponse.json({
      data: results,
      count: results.length,
      skipped: results.filter((r) => r.skipped).length,
      raporStats: {
        avgNilaiAkhir: results.length > 0
          ? Math.round((results.reduce((s, r) => s + r.nilaiAkhir, 0) / results.length) * 10) / 10
          : 0,
        tuntas: results.filter((r) => r.isTuntas).length,
        tidakTuntas: results.filter((r) => !r.isTuntas).length,
        absensi: { hadir, sakit, izin, alfa, total: absensiRecords.length },
      },
    })
  } catch (error) {
    console.error("[rapor generate] error:", error)
    return NextResponse.json({ error: "Gagal generate rapor" }, { status: 500 })
  }
}
