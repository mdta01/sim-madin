import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { NILAI_BOBAT } from "@/lib/constants"

/**
 * GET /api/admin/rapor/[id]?detail=true
 * Mengembalikan rapor + rekap nilai per mapel + rata-rata + ranking.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("rapor:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const rapor = await db.rapor.findUnique({
      where: { id },
      include: {
        santri: { select: { id: true, name: true, nis: true, gender: true, birthPlace: true, birthDate: true, address: true } },
        kelas: true,
        semester: true,
        tahunAjaran: true,
      },
    })
    if (!rapor) return NextResponse.json({ error: "Rapor tidak ditemukan" }, { status: 404 })

    // Ambil semua nilai santri di semester ini
    const nilaiList = await db.nilai.findMany({
      where: { santriId: rapor.santriId, semesterId: rapor.semesterId, tahunAjaranId: rapor.tahunAjaranId },
      include: { mapel: true },
    })

    // Group by mapel
    const mapelMap: Record<string, { mapel: any; nilaiByType: Record<string, number[]>; rataRata: number }> = {}
    for (const n of nilaiList) {
      if (!mapelMap[n.mapelId]) {
        mapelMap[n.mapelId] = { mapel: n.mapel, nilaiByType: {}, rataRata: 0 }
      }
      if (!mapelMap[n.mapelId].nilaiByType[n.type]) {
        mapelMap[n.mapelId].nilaiByType[n.type] = []
      }
      mapelMap[n.mapelId].nilaiByType[n.type].push(n.score)
    }

    const rekapNilai = Object.values(mapelMap).map((m) => {
      let totalBobot = 0
      let totalNilai = 0
      const detail: { type: string; nilai: number }[] = []
      for (const [type, scores] of Object.entries(m.nilaiByType)) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        const bobot = NILAI_BOBAT[type] || 0.1
        totalNilai += avg * bobot
        totalBobot += bobot
        detail.push({ type, nilai: Math.round(avg * 10) / 10 })
      }
      const rataRata = totalBobot > 0 ? totalNilai / totalBobot : 0
      return {
        mapelId: m.mapel.id,
        mapelName: m.mapel.name,
        mapelCode: m.mapel.code,
        kkm: m.mapel.kkm,
        detail,
        rataRata: Math.round(rataRata * 10) / 10,
        tuntas: rataRata >= m.mapel.kkm,
      }
    })

    const rataRataKeseluruhan = rekapNilai.length > 0
      ? rekapNilai.reduce((sum, r) => sum + r.rataRata, 0) / rekapNilai.length
      : 0

    // Compute ranking
    const allRaporInKelas = await db.rapor.findMany({
      where: { kelasId: rapor.kelasId, semesterId: rapor.semesterId, tahunAjaranId: rapor.tahunAjaranId },
      select: { id: true, santriId: true },
    })
    const rankingList: { santriId: string; avg: number }[] = []
    for (const r of allRaporInKelas) {
      const nilai = await db.nilai.findMany({
        where: { santriId: r.santriId, semesterId: rapor.semesterId, tahunAjaranId: rapor.tahunAjaranId },
        include: { mapel: true },
      })
      const perMapel: Record<string, { total: number; bobot: number }> = {}
      for (const n of nilai) {
        if (!perMapel[n.mapelId]) perMapel[n.mapelId] = { total: 0, bobot: 0 }
        const bobot = NILAI_BOBAT[n.type] || 0.1
        perMapel[n.mapelId].total += n.score * bobot
        perMapel[n.mapelId].bobot += bobot
      }
      const mapelAvg = Object.values(perMapel).map(p => p.bobot > 0 ? p.total / p.bobot : 0)
      const avg = mapelAvg.length > 0 ? mapelAvg.reduce((a, b) => a + b, 0) / mapelAvg.length : 0
      rankingList.push({ santriId: r.santriId, avg })
    }
    rankingList.sort((a, b) => b.avg - a.avg)
    const rank = rankingList.findIndex(r => r.santriId === rapor.santriId) + 1

    return NextResponse.json({
      data: {
        ...rapor,
        rekapNilai,
        rataRataKeseluruhan: Math.round(rataRataKeseluruhan * 10) / 10,
        ranking: rank,
        totalSantriKelas: rankingList.length,
      },
    })
  } catch (error) {
    console.error("[rapor get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail rapor" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("rapor:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.rapor.update({ where: { id }, data: body })
    await logAudit(session, "UPDATE", "RAPOR", id, { changes: Object.keys(body) }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[rapor update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate rapor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("rapor:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.rapor.delete({ where: { id } })
    await logAudit(session, "DELETE", "RAPOR", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[rapor delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus rapor" }, { status: 500 })
  }
}
