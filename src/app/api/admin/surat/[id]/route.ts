import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("surat:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.surat.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 })

    const surat = await db.surat.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        content: body.content ?? existing.content,
        tempat: body.tempat ?? existing.tempat,
        tanggalSurat: body.tanggalSurat ? new Date(body.tanggalSurat) : existing.tanggalSurat,
        status: body.status ?? existing.status,
        signedBy: body.signedBy ?? existing.signedBy,
        signedAt: body.status === "DITERBITKAN" ? new Date() : existing.signedAt,
        periodeMulai: body.periodeMulai ? new Date(body.periodeMulai) : existing.periodeMulai,
        periodeSelesai: body.periodeSelesai ? new Date(body.periodeSelesai) : existing.periodeSelesai,
      },
    })
    await logAudit(session, "UPDATE", "SURAT", id, { status: surat.status }, req)
    return NextResponse.json({ data: surat })
  } catch (error) {
    console.error("[surat update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui surat" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("surat:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.surat.delete({ where: { id } })
    await logAudit(session, "DELETE", "SURAT", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[surat delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus surat" }, { status: 500 })
  }
}
