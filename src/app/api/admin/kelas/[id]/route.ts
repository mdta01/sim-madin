import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("kelas:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const kelas = await db.kelas.findUnique({
      where: { id },
      include: {
        waliKelas: true,
        santri: { where: { deletedAt: null }, orderBy: { name: "asc" }, include: { wali: { select: { name: true, phone: true } } } },
        jadwal: { include: { mapel: true, guru: { select: { name: true } } }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        _count: { select: { santri: true } },
      },
    })
    if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: kelas })
  } catch (error) {
    console.error("[kelas get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail kelas" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("kelas:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.kelas.update({
      where: { id },
      data: body,
      include: { waliKelas: { select: { name: true } } },
    })
    await logAudit(session, "UPDATE", "KELAS", id, { changes: body }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[kelas update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate kelas" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("kelas:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.kelas.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await logAudit(session, "DELETE", "KELAS", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[kelas delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus kelas" }, { status: 500 })
  }
}
