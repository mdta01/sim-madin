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
    const existing = await db.hafalanKitab.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 })

    const data = await db.hafalanKitab.update({
      where: { id },
      data: {
        type: body.type ?? existing.type,
        kitabName: body.kitabName ?? existing.kitabName,
        halaman: body.halaman ?? existing.halaman,
        score: body.score ?? existing.score,
        status: body.status ?? existing.status,
        target: body.target ?? existing.target,
        catatan: body.catatan ?? existing.catatan,
      },
    })
    await logAudit(session, "UPDATE", "HAFALAN_KITAB", id, {}, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[kitab update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("perkembangan:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.hafalanKitab.delete({ where: { id } })
    await logAudit(session, "DELETE", "HAFALAN_KITAB", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[kitab delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 })
  }
}
