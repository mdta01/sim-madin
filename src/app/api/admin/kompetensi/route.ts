import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

/**
 * GET /api/admin/kompetensi
 * Query params: mapelId, tahunAjaranId, category, search
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("kompetensi:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const mapelId = searchParams.get("mapelId")
    const category = searchParams.get("category")
    const search = searchParams.get("search") || ""
    let tahunAjaranId = searchParams.get("tahunAjaranId")

    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }

    const where: any = { isActive: true }
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (mapelId) where.mapelId = mapelId
    if (category) where.category = category
    if (search) where.name = { contains: search, mode: "insensitive" }

    const kompetensi = await db.kompetensi.findMany({
      where,
      include: {
        mapel: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ mapel: { name: "asc" } }, { sortOrder: "asc" }],
      take: 500,
    })
    return NextResponse.json({ data: kompetensi, total: kompetensi.length })
  } catch (error) {
    console.error("[kompetensi list] error:", error)
    return NextResponse.json({ error: "Gagal memuat kompetensi" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("kompetensi:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.code || !body.name || !body.mapelId) {
      return NextResponse.json({ error: "Kode, Nama, dan Mapel wajib diisi" }, { status: 400 })
    }

    let tahunAjaranId = body.tahunAjaranId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }
    if (!tahunAjaranId) {
      return NextResponse.json({ error: "Tahun ajaran aktif tidak ditemukan" }, { status: 400 })
    }

    const existing = await db.kompetensi.findFirst({ where: { code: body.code } })
    if (existing) return NextResponse.json({ error: "Kode kompetensi sudah ada" }, { status: 400 })

    // V2 security: validate GURU has teaching access to this mapel
    const accessCheck = await validateGuruAccess(session, {
      mapelId: body.mapelId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    const kompetensi = await db.kompetensi.create({
      data: {
        mapelId: body.mapelId,
        tahunAjaranId,
        code: body.code,
        name: body.name,
        description: body.description || null,
        category: body.category || "UMUM",
        sortOrder: body.sortOrder || 0,
        isActive: body.isActive !== false,
      },
      include: { mapel: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "KOMPETENSI", kompetensi.id, {
      code: kompetensi.code, name: kompetensi.name, mapel: kompetensi.mapel?.name,
    }, req)
    return NextResponse.json({ data: kompetensi })
  } catch (error) {
    console.error("[kompetensi create] error:", error)
    return NextResponse.json({ error: "Gagal menambah kompetensi" }, { status: 500 })
  }
}
