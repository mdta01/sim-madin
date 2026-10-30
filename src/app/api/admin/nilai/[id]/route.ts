import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { nilaiUpdateSchema } from "@/lib/validation/akademik-detail"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/admin/nilai/[id]
 * Update a nilai record (score, notes, type, guruId, kompetensiId, assessmentDate).
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("nilai:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    // ── Validate body with Zod ─────────────────────────────────────
    const body = await validateBody(req, nilaiUpdateSchema)
    if (!body.ok) return body.error
    const data = body.data

    const existing = await db.nilai.findUnique({
      where: { id },
      include: { santri: true, mapel: true },
    })
    if (!existing) return NextResponse.json({ error: "Nilai tidak ditemukan" }, { status: 404 })

    const nilai = await db.nilai.update({
      where: { id },
      data: {
        score: data.score ?? existing.score,
        notes: data.notes ?? existing.notes,
        type: data.type ?? existing.type,
        guruId: data.guruId !== undefined ? data.guruId : existing.guruId,
        kompetensiId: data.kompetensiId !== undefined ? data.kompetensiId : existing.kompetensiId,
        assessmentDate: data.assessmentDate ?? existing.assessmentDate,
      },
      include: { santri: true, mapel: true, kompetensi: { select: { code: true, name: true } } },
    })
    await logAudit(session, "UPDATE", "NILAI", nilai.id, {
      santri: nilai.santri.name, mapel: nilai.mapel.name, type: nilai.type, score: nilai.score,
    }, req)
    return NextResponse.json({ data: nilai })
  } catch (error) {
    console.error("[nilai update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui nilai" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("nilai:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.nilai.delete({ where: { id } })
    await logAudit(session, "DELETE", "NILAI", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[nilai delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus nilai" }, { status: 500 })
  }
}
