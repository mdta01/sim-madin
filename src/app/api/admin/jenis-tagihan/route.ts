import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const jt = await db.jenisTagihan.findMany({ orderBy: { name: "asc" } })
    return NextResponse.json({ data: jt })
  } catch (error) {
    console.error("[jenis-tagihan list] error:", error)
    return NextResponse.json({ error: "Gagal memuat jenis tagihan" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.code || !body.name || !body.defaultAmount) {
      return NextResponse.json({ error: "Kode, Nama, dan Nominal wajib diisi" }, { status: 400 })
    }
    const existing = await db.jenisTagihan.findFirst({ where: { code: body.code } })
    if (existing) return NextResponse.json({ error: "Kode sudah terdaftar" }, { status: 400 })

    const jt = await db.jenisTagihan.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description || null,
        defaultAmount: Number(body.defaultAmount),
        category: body.category || "RUTIN",
        isActive: body.isActive !== false,
      },
    })
    return NextResponse.json({ data: jt })
  } catch (error) {
    console.error("[jenis-tagihan create] error:", error)
    return NextResponse.json({ error: "Gagal menambah jenis tagihan" }, { status: 500 })
  }
}
