import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("mapel:read")
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const mapel = await db.mataPelajaran.findUnique({
      where: { id },
      include: {
        _count: { select: { jadwal: true, nilai: true } },
        jadwal: { take: 20, include: { kelas: true, guru: { select: { name: true } } }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      },
    })
    if (!mapel) return NextResponse.json({ error: "Mapel tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: mapel })
  } catch (error) {
    console.error("[mapel get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail mapel" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("mapel:update")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.mataPelajaran.update({ where: { id }, data: body })
    await logAudit(session, "UPDATE", "MAPEL", id, { changes: body }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[mapel update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate mapel" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("mapel:delete")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.mataPelajaran.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await logAudit(session, "DELETE", "MAPEL", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[mapel delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus mapel" }, { status: 500 })
  }
}
