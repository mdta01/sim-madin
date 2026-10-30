import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { jadwalUpdateSchema } from "@/lib/validation/akademik-detail"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("jadwal:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    await db.jadwal.delete({ where: { id } })
    await logAudit(session, "DELETE", "JADWAL", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[jadwal delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus jadwal" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("jadwal:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await validateBody(req, jadwalUpdateSchema)
    if (!body.ok) return body.error
    const { kelasId, mapelId, guruId, dayOfWeek, startTime, endTime } = body.data
    // Build update payload only with provided fields — Zod ensures all
    // values are valid; we strip undefined so Prisma doesn't overwrite
    // existing rows with null.
    const data: Record<string, unknown> = {}
    if (kelasId !== undefined) data.kelasId = kelasId
    if (mapelId !== undefined) data.mapelId = mapelId
    if (guruId !== undefined) data.guruId = guruId
    if (dayOfWeek !== undefined) data.dayOfWeek = dayOfWeek
    if (startTime !== undefined) data.startTime = startTime
    if (endTime !== undefined) data.endTime = endTime

    const updated = await db.jadwal.update({
      where: { id },
      data,
      include: { kelas: true, mapel: true, guru: { select: { name: true } } },
    })
    await logAudit(session, "UPDATE", "JADWAL", id, { changes: body.data }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[jadwal update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate jadwal" }, { status: 500 })
  }
}
