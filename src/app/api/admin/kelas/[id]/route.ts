import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const kelas = await db.kelas.findUnique({
      where: { id },
      include: {
        waliKelas: true,
        santri: { where: { deletedAt: null }, orderBy: { name: "asc" }, include: { wali: { select: { name: true, phone: true } } } },
        jadwal: { include: { mapel: true, guru: { select: { name: true } } }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        _count: { select: { santri: true } },
      },
    })
    if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: kelas })
  } catch (error) {
    console.error("[kelas get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail kelas" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.kelas.update({
      where: { id },
      data: body,
      include: { waliKelas: { select: { name: true } } },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[kelas update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate kelas" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.kelas.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[kelas delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus kelas" }, { status: 500 })
  }
}
