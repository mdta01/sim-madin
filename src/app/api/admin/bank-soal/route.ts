import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

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
    const body = await req.json()
    if (!body.code || !body.question || !body.type || !body.mapelId) {
      return NextResponse.json({ error: "Kode, Pertanyaan, Tipe, dan Mapel wajib diisi" }, { status: 400 })
    }

    let tahunAjaranId = body.tahunAjaranId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }
    if (!tahunAjaranId) {
      return NextResponse.json({ error: "Tahun ajaran aktif tidak ditemukan" }, { status: 400 })
    }

    // V2 security: validate GURU has teaching access to this mapel
    const accessCheck = await validateGuruAccess(session, { mapelId: body.mapelId }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    const existing = await db.bankSoal.findFirst({ where: { code: body.code } })
    if (existing) return NextResponse.json({ error: "Kode soal sudah ada" }, { status: 400 })

    // Validate options for PG type
    let optionsJson = body.options
    if (body.type === "PG") {
      if (typeof body.options === "object") {
        optionsJson = JSON.stringify(body.options)
      }
      if (!optionsJson || JSON.parse(optionsJson).length < 2) {
        return NextResponse.json({ error: "Soal PG wajib punya minimal 2 opsi jawaban" }, { status: 400 })
      }
    }

    const soal = await db.bankSoal.create({
      data: {
        mapelId: body.mapelId,
        tahunAjaranId,
        guruId: accessCheck.guru?.id || body.guruId || null,
        code: body.code,
        type: body.type,
        question: body.question,
        options: optionsJson || null,
        correctAnswer: body.correctAnswer || null,
        answerKey: body.answerKey || null,
        bobot: body.bobot || 1,
        difficulty: body.difficulty || "SEDANG",
        kompetensiId: body.kompetensiId || null,
        tags: body.tags || null,
        isActive: body.isActive !== false,
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
