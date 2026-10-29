import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { getAkhlakPredikat } from "@/lib/constants"

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
    const existing = await db.akhlakPenilaian.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 })

    // Recompute rata-rata & predikat
    const scores = [
      Number(body.adabGuru ?? existing.adabGuru) || 0,
      Number(body.adabOrangTua ?? existing.adabOrangTua) || 0,
      Number(body.adabTeman ?? existing.adabTeman) || 0,
      Number(body.kedisiplinan ?? existing.kedisiplinan) || 0,
      Number(body.kebersihan ?? existing.kebersihan) || 0,
      Number(body.tanggungJawab ?? existing.tanggungJawab) || 0,
    ]
    const rataRata = Math.round((scores.reduce((a, b) => a + b, 0) / 6) * 10) / 10
    const predikat = body.predikat || getAkhlakPredikat(rataRata)

    const data = await db.akhlakPenilaian.update({
      where: { id },
      data: {
        adabGuru: Number(body.adabGuru ?? existing.adabGuru) || 0,
        adabOrangTua: Number(body.adabOrangTua ?? existing.adabOrangTua) || 0,
        adabTeman: Number(body.adabTeman ?? existing.adabTeman) || 0,
        kedisiplinan: Number(body.kedisiplinan ?? existing.kedisiplinan) || 0,
        kebersihan: Number(body.kebersihan ?? existing.kebersihan) || 0,
        tanggungJawab: Number(body.tanggungJawab ?? existing.tanggungJawab) || 0,
        rataRata,
        predikat,
        catatan: body.catatan ?? existing.catatan,
        periode: body.periode ?? existing.periode,
      },
    })
    await logAudit(session, "UPDATE", "AKHLAK_PENILAIAN", id, { rataRata, predikat }, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[akhlak update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("perkembangan:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.akhlakPenilaian.delete({ where: { id } })
    await logAudit(session, "DELETE", "AKHLAK_PENILAIAN", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[akhlak delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 })
  }
}
