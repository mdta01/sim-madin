import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const category = searchParams.get("category")
    const where: any = { deletedAt: null, isActive: true }
    if (search) where.name = { contains: search }
    if (category) where.category = category

    const mapel = await db.mataPelajaran.findMany({
      where,
      include: { _count: { select: { jadwal: true, nilai: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
    return NextResponse.json({ data: mapel, total: mapel.length })
  } catch (error) {
    console.error("[mapel list] error:", error)
    return NextResponse.json({ error: "Gagal memuat data mata pelajaran" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.code || !body.name || !body.category) {
      return NextResponse.json({ error: "Kode, Nama, dan Kategori wajib diisi" }, { status: 400 })
    }
    const existing = await db.mataPelajaran.findFirst({ where: { code: body.code } })
    if (existing) return NextResponse.json({ error: "Kode mapel sudah terdaftar" }, { status: 400 })

    const mapel = await db.mataPelajaran.create({
      data: {
        code: body.code,
        name: body.name,
        category: body.category,
        description: body.description || null,
        kkm: body.kkm || 70,
        durationMnt: body.durationMnt || 60,
        sortOrder: body.sortOrder || 0,
        isActive: body.isActive !== false,
      },
    })
    return NextResponse.json({ data: mapel })
  } catch (error) {
    console.error("[mapel create] error:", error)
    return NextResponse.json({ error: "Gagal menambah mapel" }, { status: 500 })
  }
}
