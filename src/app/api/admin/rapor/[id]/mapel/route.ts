import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { getPredikat, NILAI_BOBAT } from "@/lib/constants"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/rapor/[id]/mapel
 * List RaporMapel for this rapor (with mapel detail).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("rapor:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const rapor = await db.rapor.findUnique({
      where: { id },
      include: {
        santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
        kelas: { select: { name: true, code: true } },
        semester: { select: { name: true, type: true } },
        tahunAjaran: { select: { name: true, code: true } },
      },
    })
    if (!rapor) return NextResponse.json({ error: "Rapor tidak ditemukan" }, { status: 404 })

    const raporMapel = await db.raporMapel.findMany({
      where: { raporId: id },
      include: {
        mapel: { select: { id: true, name: true, code: true, kkm: true, category: true } },
      },
      orderBy: [{ mapel: { category: "asc" } }, { mapel: { name: "asc" } }],
    })

    return NextResponse.json({
      data: raporMapel,
      rapor,
      total: raporMapel.length,
    })
  } catch (error) {
    console.error("[rapor mapel list] error:", error)
    return NextResponse.json({ error: "Gagal memuat rapor mapel" }, { status: 500 })
  }
}

/**
 * PUT /api/admin/rapor/[id]/mapel
 * Update or create RaporMapel entry.
 * Body: {
 *   entries: [{ mapelId, nilaiAkhir, deskripsi?, predikat?, kkm? }]
 *   — upsert each entry
 * }
 *
 * Or single: { mapelId, nilaiAkhir, deskripsi?, predikat?, kkm? }
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("rapor:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const rapor = await db.rapor.findUnique({ where: { id } })
    if (!rapor) return NextResponse.json({ error: "Rapor tidak ditemukan" }, { status: 404 })

    const body = await req.json()
    const entries = Array.isArray(body.entries) ? body.entries : [body]

    const results: any[] = []
    for (const entry of entries) {
      if (!entry.mapelId || entry.nilaiAkhir === undefined) continue

      const kkm = entry.kkm || 70
      const nilaiAkhir = Number(entry.nilaiAkhir)
      const predikat = entry.predikat || getPredikat(nilaiAkhir)
      const isTuntas = nilaiAkhir >= kkm

      const existing = await db.raporMapel.findUnique({
        where: { raporId_mapelId: { raporId: id, mapelId: entry.mapelId } },
      })

      if (existing) {
        const updated = await db.raporMapel.update({
          where: { id: existing.id },
          data: {
            nilaiAkhir,
            predikat,
            deskripsi: entry.deskripsi ?? existing.deskripsi,
            kkm,
            isTuntas,
          },
          include: { mapel: { select: { name: true } } },
        })
        results.push(updated)
      } else {
        const created = await db.raporMapel.create({
          data: {
            raporId: id,
            mapelId: entry.mapelId,
            nilaiAkhir,
            predikat,
            deskripsi: entry.deskripsi || null,
            kkm,
            isTuntas,
          },
          include: { mapel: { select: { name: true } } },
        })
        results.push(created)
      }
    }

    await logAudit(session, "BULK_UPDATE", "RAPOR_MAPEL", id, {
      count: results.length,
    }, req)

    return NextResponse.json({ data: results, count: results.length })
  } catch (error) {
    console.error("[rapor mapel update] error:", error)
    return NextResponse.json({ error: "Gagal update rapor mapel" }, { status: 500 })
  }
}
