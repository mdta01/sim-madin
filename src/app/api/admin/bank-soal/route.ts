import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"
import { validateBody } from "@/lib/validation/helpers"
import { bankSoalCreateSchema } from "@/lib/validation/akademik-detail"

/**
 * GET /api/admin/bank-soal
 * Query params: mapelId, type, difficulty, kompetensiId, search
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("bank_soal:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const mapelId = searchParams.get("mapelId")
    const type = searchParams.get("type")
    const difficulty = searchParams.get("difficulty")
    const kompetensiId = searchParams.get("kompetensiId")
    const search = searchParams.get("search") || ""
    let tahunAjaranId = searchParams.get("tahunAjaranId")

    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }

    const where: any = { isActive: true }
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (mapelId) where.mapelId = mapelId
    if (type) where.type = type
    if (difficulty) where.difficulty = difficulty
    if (kompetensiId) where.kompetensiId = kompetensiId
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { question: { contains: search, mode: "insensitive" } },
      ]
    }

    const soal = await db.bankSoal.findMany({
      where,
      include: {
        mapel: { select: { id: true, name: true, code: true } },
        guru: { select: { id: true, name: true } },
        kompetensi: { select: { id: true, code: true, name: true } },
        _count: { select: { ujianLinks: true } },
      },
      orderBy: [{ mapel: { name: "asc" } }, { code: "asc" }],
      take: 500,
    })
    return NextResponse.json({ data: soal, total: soal.length })
  } catch (error) {
    console.error("[bank-soal list] error:", error)
    return NextResponse.json({ error: "Gagal memuat bank soal" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("bank_soal:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    // ── Validate body with Zod ─────────────────────────────────────
    const body = await validateBody(req, bankSoalCreateSchema)
    if (!body.ok) return body.error
    const {
      mapelId, code, type, question, options, correctAnswer, answerKey,
      bobot, difficulty, kompetensiId, tags, isActive, tahunAjaranId: bodyTA,
      guruId: bodyGuruId,
    } = body.data

    let tahunAjaranId: string | null | undefined = bodyTA
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }
    if (!tahunAjaranId) {
      return NextResponse.json({ error: "Tahun ajaran aktif tidak ditemukan" }, { status: 400 })
    }

    // V2 security: validate GURU has teaching access to this mapel
    const accessCheck = await validateGuruAccess(session, { mapelId }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    const existing = await db.bankSoal.findFirst({ where: { code } })
    if (existing) return NextResponse.json({ error: "Kode soal sudah ada" }, { status: 400 })

    // Serialize options array → JSON string for Prisma storage (PG type)
    let optionsJson: string | null = null
    if (type === "PG" && options && options.length > 0) {
      optionsJson = JSON.stringify(options)
    }

    const soal = await db.bankSoal.create({
      data: {
        mapelId,
        tahunAjaranId,
        guruId: accessCheck.guru?.id || bodyGuruId || null,
        code,
        type,
        question,
        options: optionsJson,
        correctAnswer: correctAnswer || null,
        answerKey: answerKey || null,
        bobot: bobot ?? 1,
        difficulty: difficulty ?? "SEDANG",
        kompetensiId: kompetensiId || null,
        tags: tags && tags.length > 0 ? tags.join(",") : null,
        isActive,
      },
      include: { mapel: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "BANK_SOAL", soal.id, {
      code: soal.code, type: soal.type, mapel: soal.mapel?.name,
    }, req)
    return NextResponse.json({ data: soal })
  } catch (error) {
    console.error("[bank-soal create] error:", error)
    return NextResponse.json({ error: "Gagal menambah soal" }, { status: 500 })
  }
}
