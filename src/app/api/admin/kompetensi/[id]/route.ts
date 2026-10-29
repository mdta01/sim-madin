import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("kompetensi:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const kompetensi = await db.kompetensi.findUnique({
      where: { id },
      include: { mapel: true },
    })
    if (!kompetensi) return NextResponse.json({ error: "Kompetensi tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: kompetensi })
  } catch (error) {
    console.error("[kompetensi detail] error:", error)
    return NextResponse.json({ error: "Gagal memuat kompetensi" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("kompetensi:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.kompetensi.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Kompetensi tidak ditemukan" }, { status: 404 })

    // V2 security: validate GURU has teaching access to this mapel
    const accessCheck = await validateGuruAccess(session, {
      mapelId: body.mapelId ?? existing.mapelId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    const kompetensi = await db.kompetensi.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        category: body.category ?? existing.category,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        isActive: body.isActive ?? existing.isActive,
        mapelId: body.mapelId ?? existing.mapelId,
      },
      include: { mapel: { select: { name: true } } },
    })
    await logAudit(session, "UPDATE", "KOMPETENSI", kompetensi.id, {
      name: kompetensi.name,
    }, req)
    return NextResponse.json({ data: kompetensi })
  } catch (error) {
    console.error("[kompetensi update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui kompetensi" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("kompetensi:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const existing = await db.kompetensi.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Kompetensi tidak ditemukan" }, { status: 404 })

    // Soft delete via isActive = false (preserve history)
    await db.kompetensi.update({
      where: { id },
      data: { isActive: false },
    })
    await logAudit(session, "DELETE", "KOMPETENSI", id, {
      code: existing.code, name: existing.name,
    }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[kompetensi delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus kompetensi" }, { status: 500 })
  }
}
