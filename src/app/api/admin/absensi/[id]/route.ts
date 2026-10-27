import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.absensi.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[absensi delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus absensi" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.absensi.update({ where: { id }, data: body })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[absensi update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate absensi" }, { status: 500 })
  }
}
