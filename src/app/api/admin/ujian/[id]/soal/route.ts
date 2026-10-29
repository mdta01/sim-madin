import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/ujian/[id]/soal
 * List soal assigned to this ujian (with urutan).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const links = await db.ujianSoal.findMany({
      where: { ujianId: id },
      include: {
        bankSoal: {
          include: {
            mapel: { select: { name: true } },
            kompetensi: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { urutan: "asc" },
    })
    return NextResponse.json({ data: links, total: links.length })
  } catch (error) {
    console.error("[ujian soal list] error:", error)
    return NextResponse.json({ error: "Gagal memuat soal ujian" }, { status: 500 })
  }
}

/**
 * POST /api/admin/ujian/[id]/soal
 * Assign soal to ujian.
 * Body: { soalIds: ["soalId1", "soalId2"] } — append to existing
 *    OR { entries: [{ bankSoalId, urutan, bobot }] } — replace all (will delete existing)
 *    OR { bankSoalId, urutan?, bobot? } — add single
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

    // Mode 1: replace all entries
    if (Array.isArray(body.entries)) {
      await db.ujianSoal.deleteMany({ where: { ujianId: id } })
      const created: any[] = []
      for (let i = 0; i < body.entries.length; i++) {
        const e = body.entries[i]
        const link = await db.ujianSoal.create({
          data: {
            ujianId: id,
            bankSoalId: e.bankSoalId,
            urutan: e.urutan ?? i + 1,
            bobot: e.bobot ?? 1,
          },
        })
        created.push(link)
      }
      await logAudit(session, "UPDATE", "UJIAN_SOAL", id, { mode: "replace", count: created.length }, req)
      return NextResponse.json({ data: created, count: created.length })
    }

    // Mode 2: append multiple soalIds
    if (Array.isArray(body.soalIds)) {
      // Get current max urutan
      const lastLink = await db.ujianSoal.findFirst({
        where: { ujianId: id },
        orderBy: { urutan: "desc" },
      })
      let nextUrutan = (lastLink?.urutan || 0) + 1

      const created: any[] = []
      for (const bankSoalId of body.soalIds) {
        // Skip if already linked
        const existing = await db.ujianSoal.findUnique({
          where: { ujianId_bankSoalId: { ujianId: id, bankSoalId } },
        })
        if (existing) continue
        const link = await db.ujianSoal.create({
          data: { ujianId: id, bankSoalId, urutan: nextUrutan++ },
        })
        created.push(link)
      }
      await logAudit(session, "UPDATE", "UJIAN_SOAL", id, { mode: "append", count: created.length }, req)
      return NextResponse.json({ data: created, count: created.length })
    }

    // Mode 3: add single
    if (body.bankSoalId) {
      const existing = await db.ujianSoal.findUnique({
        where: { ujianId_bankSoalId: { ujianId: id, bankSoalId: body.bankSoalId } },
      })
      if (existing) {
        return NextResponse.json({ error: "Soal sudah ada di ujian ini" }, { status: 400 })
      }
      const lastLink = await db.ujianSoal.findFirst({
        where: { ujianId: id },
        orderBy: { urutan: "desc" },
      })
      const urutan = body.urutan ?? (lastLink?.urutan || 0) + 1
      const link = await db.ujianSoal.create({
        data: {
          ujianId: id,
          bankSoalId: body.bankSoalId,
          urutan,
          bobot: body.bobot ?? 1,
        },
      })
      await logAudit(session, "UPDATE", "UJIAN_SOAL", id, { mode: "single", soalId: body.bankSoalId }, req)
      return NextResponse.json({ data: link })
    }

    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 })
  } catch (error) {
    console.error("[ujian soal assign] error:", error)
    return NextResponse.json({ error: "Gagal assign soal" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/ujian/[id]/soal?linkId=xxx
 * Remove soal from ujian.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const linkId = searchParams.get("linkId")
    const bankSoalId = searchParams.get("bankSoalId")

    if (linkId) {
      await db.ujianSoal.delete({ where: { id: linkId } })
    } else if (bankSoalId) {
      await db.ujianSoal.delete({
        where: { ujianId_bankSoalId: { ujianId: id, bankSoalId } },
      })
    } else {
      return NextResponse.json({ error: "linkId atau bankSoalId wajib diisi" }, { status: 400 })
    }
    await logAudit(session, "DELETE", "UJIAN_SOAL", id, { linkId, bankSoalId }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ujian soal remove] error:", error)
    return NextResponse.json({ error: "Gagal menghapus soal dari ujian" }, { status: 500 })
  }
}
