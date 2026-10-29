import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("perkembangan:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.catatanWaliKelas.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 })

    const data = await db.catatanWaliKelas.update({
      where: { id },
      data: {
        catatan: body.catatan ?? existing.catatan,
        rekomendasi: body.rekomendasi ?? existing.rekomendasi,
        periode: body.periode ?? existing.periode,
        periodeDate: body.periodeDate ? new Date(body.periodeDate) : existing.periodeDate,
      },
    })
    await logAudit(session, "UPDATE", "CATATAN_WALI_KELAS", id, {}, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[catatan wali update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("perkembangan:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.catatanWaliKelas.delete({ where: { id } })
    await logAudit(session, "DELETE", "CATATAN_WALI_KELAS", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[catatan wali delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 })
  }
}
