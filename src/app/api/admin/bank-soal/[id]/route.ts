import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"
import { validateBody } from "@/lib/validation/helpers"
import { bankSoalUpdateSchema } from "@/lib/validation/akademik-detail"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("bank_soal:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const soal = await db.bankSoal.findUnique({
      where: { id },
      include: {
        mapel: true,
        guru: { select: { id: true, name: true } },
        kompetensi: { select: { id: true, code: true, name: true } },
        ujianLinks: {
          include: { ujian: { select: { id: true, title: true, type: true, startTime: true } } },
        },
      },
    })
    if (!soal) return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: soal })
  } catch (error) {
    console.error("[bank-soal detail] error:", error)
    return NextResponse.json({ error: "Gagal memuat soal" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("bank_soal:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    // ── Validate body with Zod ─────────────────────────────────────
    const body = await validateBody(req, bankSoalUpdateSchema)
    if (!body.ok) return body.error
    const data = body.data

    const existing = await db.bankSoal.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 })

    // V2 security: validate GURU has teaching access
    const accessCheck = await validateGuruAccess(session, {
      mapelId: data.mapelId ?? existing.mapelId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    // Serialize options array → JSON string if provided
    let optionsJson: string | null | undefined = undefined
    if (data.options !== undefined) {
      optionsJson = data.options && data.options.length > 0
        ? JSON.stringify(data.options)
        : null
    }

    const soal = await db.bankSoal.update({
      where: { id },
      data: {
        question: data.question ?? existing.question,
        type: data.type ?? existing.type,
        options: optionsJson !== undefined ? optionsJson : existing.options,
        correctAnswer: data.correctAnswer !== undefined ? data.correctAnswer : existing.correctAnswer,
        answerKey: data.answerKey !== undefined ? data.answerKey : existing.answerKey,
        bobot: data.bobot ?? existing.bobot,
        difficulty: data.difficulty ?? existing.difficulty,
        kompetensiId: data.kompetensiId !== undefined ? data.kompetensiId : existing.kompetensiId,
        tags: data.tags !== undefined ? (data.tags.length > 0 ? data.tags.join(",") : null) : existing.tags,
        isActive: data.isActive ?? existing.isActive,
        mapelId: data.mapelId ?? existing.mapelId,
      },
      include: { mapel: { select: { name: true } } },
    })
    await logAudit(session, "UPDATE", "BANK_SOAL", soal.id, { code: soal.code }, req)
    return NextResponse.json({ data: soal })
  } catch (error) {
    console.error("[bank-soal update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui soal" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("bank_soal:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const existing = await db.bankSoal.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 })

    // Soft delete via isActive = false
    await db.bankSoal.update({
      where: { id },
      data: { isActive: false },
    })
    await logAudit(session, "DELETE", "BANK_SOAL", id, { code: existing.code }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[bank-soal delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus soal" }, { status: 500 })
  }
}
