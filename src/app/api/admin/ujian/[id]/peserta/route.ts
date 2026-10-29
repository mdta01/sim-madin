import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/ujian/[id]/peserta
 * List peserta for this ujian (with santri detail).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const ujian = await db.ujian.findUnique({
      where: { id, deletedAt: null },
      include: { kelas: true },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    // Get all santri in kelas + their peserta status
    const [santriKelas, pesertaRecords] = await Promise.all([
      db.santri.findMany({
        where: { kelasId: ujian.kelasId, status: "AKTIF", deletedAt: null },
        select: { id: true, name: true, nis: true, photoUrl: true, gender: true },
        orderBy: { name: "asc" },
      }),
      db.ujianPeserta.findMany({
        where: { ujianId: id },
        include: {
          santri: { select: { id: true, name: true, nis: true, photoUrl: true, gender: true } },
        },
      }),
    ])

    const pesertaMap = new Map(pesertaRecords.map((p) => [p.santriId, p]))
    const allPeserta: any[] = santriKelas.map((s) => {
      const peserta = pesertaMap.get(s.id)
      return peserta || {
        id: `pending-${s.id}`,
        ujianId: id,
        santriId: s.id,
        santri: s,
        ruang: null,
        pengawas: null,
        isHadir: null, // null = belum di-set, true = hadir, false = absen
        catatan: null,
        isAssigned: false,
      }
    })

    return NextResponse.json({
      data: allPeserta,
      total: allPeserta.length,
      stats: {
        assigned: pesertaRecords.length,
        notAssigned: santriKelas.length - pesertaRecords.length,
        hadir: pesertaRecords.filter((p) => p.isHadir).length,
        absen: pesertaRecords.filter((p) => !p.isHadir).length,
      },
    })
  } catch (error) {
    console.error("[ujian peserta list] error:", error)
    return NextResponse.json({ error: "Gagal memuat peserta ujian" }, { status: 500 })
  }
}

/**
 * POST /api/admin/ujian/[id]/peserta
 * Bulk assign peserta to ujian.
 * Body: {
 *   santriIds: ["santriId1", "santriId2"], // assign these santri as peserta
 *   ruang?: "Aula",
 *   pengawas?: "Ust. Ahmad",
 *   isHadir?: true,
 * }
 *
 * Or: { all: true, ruang?, pengawas? } — assign all santri in kelas
 * Or: { santriId, ruang?, pengawas?, isHadir?, catatan? } — single
 */
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const ujian = await db.ujian.findUnique({ where: { id, deletedAt: null } })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    let santriIds: string[] = []
    if (body.all === true) {
      const allSantri = await db.santri.findMany({
        where: { kelasId: ujian.kelasId, status: "AKTIF", deletedAt: null },
        select: { id: true },
      })
      santriIds = allSantri.map((s) => s.id)
    } else if (Array.isArray(body.santriIds)) {
      santriIds = body.santriIds
    } else if (body.santriId) {
      santriIds = [body.santriId]
    } else {
      return NextResponse.json({ error: "santriIds, santriId, atau all=true wajib diisi" }, { status: 400 })
    }

    const created: any[] = []
    for (const santriId of santriIds) {
      const existing = await db.ujianPeserta.findUnique({
        where: { ujianId_santriId: { ujianId: id, santriId } },
      })
      if (existing) {
        // Update if fields provided
        const updateData: any = {}
        if (body.ruang !== undefined) updateData.ruang = body.ruang
        if (body.pengawas !== undefined) updateData.pengawas = body.pengawas
        if (body.isHadir !== undefined) updateData.isHadir = body.isHadir
        if (body.catatan !== undefined) updateData.catatan = body.catatan
        if (Object.keys(updateData).length > 0) {
          const updated = await db.ujianPeserta.update({
            where: { id: existing.id },
            data: updateData,
          })
          created.push(updated)
        }
        continue
      }
      const peserta = await db.ujianPeserta.create({
        data: {
          ujianId: id,
          santriId,
          ruang: body.ruang || null,
          pengawas: body.pengawas || null,
          isHadir: body.isHadir ?? true,
          catatan: body.catatan || null,
        },
      })
      created.push(peserta)
    }

    await logAudit(session, "UPDATE", "UJIAN_PESERTA", id, { count: created.length }, req)
    return NextResponse.json({ data: created, count: created.length })
  } catch (error) {
    console.error("[ujian peserta assign] error:", error)
    return NextResponse.json({ error: "Gagal assign peserta" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/ujian/[id]/peserta?pesertaId=xxx
 * Remove peserta from ujian.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const pesertaId = searchParams.get("pesertaId")
    const santriId = searchParams.get("santriId")

    if (pesertaId) {
      await db.ujianPeserta.delete({ where: { id: pesertaId } })
    } else if (santriId) {
      await db.ujianPeserta.delete({
        where: { ujianId_santriId: { ujianId: id, santriId } },
      })
    } else {
      return NextResponse.json({ error: "pesertaId atau santriId wajib diisi" }, { status: 400 })
    }
    await logAudit(session, "DELETE", "UJIAN_PESERTA", id, { pesertaId, santriId }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ujian peserta remove] error:", error)
    return NextResponse.json({ error: "Gagal menghapus peserta" }, { status: 500 })
  }
}
