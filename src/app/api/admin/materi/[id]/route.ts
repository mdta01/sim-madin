import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

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
    const body = await req.json()
    const existing = await db.materi.findUnique({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 })

    const materi = await db.materi.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        type: body.type ?? existing.type,
        fileUrl: body.fileUrl !== undefined ? body.fileUrl : existing.fileUrl,
        externalUrl: body.externalUrl !== undefined ? body.externalUrl : existing.externalUrl,
        pertemuan: body.pertemuan !== undefined ? body.pertemuan : existing.pertemuan,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        isPublished: body.isPublished ?? existing.isPublished,
        mapelId: body.mapelId ?? existing.mapelId,
        kelasId: body.kelasId !== undefined ? body.kelasId : existing.kelasId,
        guruId: body.guruId !== undefined ? body.guruId : existing.guruId,
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
