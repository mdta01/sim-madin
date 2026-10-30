import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"
import { validateBody } from "@/lib/validation/helpers"
import { materiUpdateSchema } from "@/lib/validation/akademik-detail"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("materi:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const materi = await db.materi.findUnique({
      where: { id, deletedAt: null },
      include: {
        mapel: true,
        kelas: true,
        guru: { select: { id: true, name: true } },
        tugas: { select: { id: true, title: true, dueDate: true, _count: { select: { submissions: true } } } },
      },
    })
    if (!materi) return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: materi })
  } catch (error) {
    console.error("[materi detail] error:", error)
    return NextResponse.json({ error: "Gagal memuat materi" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("materi:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    // ── Validate body with Zod ─────────────────────────────────────
    const body = await validateBody(req, materiUpdateSchema)
    if (!body.ok) return body.error
    const data = body.data

    const existing = await db.materi.findUnique({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 })

    // V2 security: validate GURU has teaching access to this kelas+mapel
    const accessCheck = await validateGuruAccess(session, {
      kelasId: data.kelasId !== undefined ? (data.kelasId ?? undefined) : existing.kelasId ?? undefined,
      mapelId: data.mapelId ?? existing.mapelId,
      guruId: data.guruId !== undefined ? (data.guruId ?? undefined) : existing.guruId ?? undefined,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    const materi = await db.materi.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        fileUrl: data.fileUrl !== undefined ? data.fileUrl : existing.fileUrl,
        externalUrl: data.externalUrl !== undefined ? data.externalUrl : existing.externalUrl,
        pertemuan: data.pertemuan !== undefined ? data.pertemuan : existing.pertemuan,
        sortOrder: data.sortOrder ?? existing.sortOrder,
        isPublished: data.isPublished ?? existing.isPublished,
        mapelId: data.mapelId ?? existing.mapelId,
        kelasId: data.kelasId !== undefined ? data.kelasId : existing.kelasId,
        guruId: data.guruId !== undefined ? data.guruId : existing.guruId,
      },
      include: { mapel: { select: { name: true } } },
    })
    await logAudit(session, "UPDATE", "MATERI", materi.id, { title: materi.title }, req)
    return NextResponse.json({ data: materi })
  } catch (error) {
    console.error("[materi update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui materi" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("materi:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const existing = await db.materi.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 })

    // Soft delete — pertahankan referensi untuk audit & tugas terkait
    await db.materi.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    })
    await logAudit(session, "DELETE", "MATERI", id, { title: existing.title }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[materi delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus materi" }, { status: 500 })
  }
}
