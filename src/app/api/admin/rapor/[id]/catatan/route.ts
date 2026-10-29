import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/rapor/[id]/catatan
 * Get RaporCatatan for this rapor (catatan wali kelas + prestasi + akhlak + kehadiran + saran).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("rapor:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const catatan = await db.raporCatatan.findUnique({
      where: { raporId: id },
    })
    return NextResponse.json({ data: catatan })
  } catch (error) {
    console.error("[rapor catatan get] error:", error)
    return NextResponse.json({ error: "Gagal memuat catatan rapor" }, { status: 500 })
  }
}

/**
 * PUT /api/admin/rapor/[id]/catatan
 * Upsert RaporCatatan for this rapor.
 * Body: { catatanWaliKelas?, prestasi?, akhlak?, kehadiran?, saran? }
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("rapor:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const rapor = await db.rapor.findUnique({ where: { id } })
    if (!rapor) return NextResponse.json({ error: "Rapor tidak ditemukan" }, { status: 404 })

    const catatan = await db.raporCatatan.upsert({
      where: { raporId: id },
      update: {
        catatanWaliKelas: body.catatanWaliKelas ?? undefined,
        prestasi: body.prestasi ?? undefined,
        akhlak: body.akhlak ?? undefined,
        kehadiran: body.kehadiran ?? undefined,
        saran: body.saran ?? undefined,
      },
      create: {
        raporId: id,
        catatanWaliKelas: body.catatanWaliKelas || null,
        prestasi: body.prestasi || null,
        akhlak: body.akhlak || null,
        kehadiran: body.kehadiran || null,
        saran: body.saran || null,
      },
    })

    await logAudit(session, "UPDATE", "RAPOR_CATATAN", id, {
      hasCatatan: !!body.catatanWaliKelas,
      hasPrestasi: !!body.prestasi,
    }, req)

    return NextResponse.json({ data: catatan })
  } catch (error) {
    console.error("[rapor catatan update] error:", error)
    return NextResponse.json({ error: "Gagal update catatan rapor" }, { status: 500 })
  }
}
