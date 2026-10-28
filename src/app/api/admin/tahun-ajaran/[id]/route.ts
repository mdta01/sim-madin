import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("tahun_ajaran:read")
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const ta = await db.tahunAjaran.findUnique({
      where: { id },
      include: { semesters: { orderBy: { type: "asc" } } },
    })
    if (!ta) return NextResponse.json({ error: "Tahun ajaran tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: ta })
  } catch (error) {
    console.error("[tahun-ajaran get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail tahun ajaran" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("tahun_ajaran:update")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()

    if (body.isActive) {
      const ta = await db.tahunAjaran.findUnique({ where: { id } })
      if (ta) {
        await db.tahunAjaran.updateMany({ where: { isActive: true, NOT: { id } }, data: { isActive: false } })
        await db.semester.updateMany({ where: { isActive: true, NOT: { tahunAjaranId: id } }, data: { isActive: false } })
        await db.semester.updateMany({ where: { tahunAjaranId: id, type: "GANJIL" }, data: { isActive: true } })
      }
    }

    const updated = await db.tahunAjaran.update({
      where: { id },
      data: {
        ...(body.code && { code: body.code }),
        ...(body.name && { name: body.name }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { semesters: true },
    })
    await logAudit(session, "UPDATE", "TAHUN_AJARAN", id, { changes: Object.keys(body) }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[tahun-ajaran update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate tahun ajaran" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("tahun_ajaran:delete")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.tahunAjaran.delete({ where: { id } })
    await logAudit(session, "DELETE", "TAHUN_AJARAN", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[tahun-ajaran delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus tahun ajaran" }, { status: 500 })
  }
}
