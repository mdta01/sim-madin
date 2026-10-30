import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("pengumuman:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.announcement.update({
      where: { id },
      data: {
        ...body,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : (body.expiresAt === null ? null : undefined),
      },
    })
    await logAudit(session, "UPDATE", "PENGUMUMAN", id, { changes: body }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[pengumuman update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate pengumuman" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("pengumuman:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.announcement.delete({ where: { id } })
    await logAudit(session, "DELETE", "PENGUMUMAN", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[pengumuman delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus pengumuman" }, { status: 500 })
  }
}
