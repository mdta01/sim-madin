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
    const existing = await db.perkembanganQuran.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 })

    const data = await db.perkembanganQuran.update({
      where: { id },
      data: {
        type: body.type ?? existing.type,
        surah: body.surah ?? existing.surah,
        juz: body.juz ?? existing.juz,
        ayatFrom: body.ayatFrom ?? existing.ayatFrom,
        ayatTo: body.ayatTo ?? existing.ayatTo,
        score: body.score ?? existing.score,
        status: body.status ?? existing.status,
        target: body.target ?? existing.target,
        catatan: body.catatan ?? existing.catatan,
      },
    })
    await logAudit(session, "UPDATE", "PERKEMBANGAN_QURAN", id, { type: data.type }, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[quran update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("perkembangan:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const existing = await db.perkembanganQuran.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 })

    await db.perkembanganQuran.delete({ where: { id } })
    await logAudit(session, "DELETE", "PERKEMBANGAN_QURAN", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[quran delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 })
  }
}
