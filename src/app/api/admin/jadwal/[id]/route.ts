import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.jadwal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[jadwal delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus jadwal" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.jadwal.update({
      where: { id },
      data: {
        ...body,
        dayOfWeek: body.dayOfWeek ? Number(body.dayOfWeek) : undefined,
      },
      include: { kelas: true, mapel: true, guru: { select: { name: true } } },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[jadwal update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate jadwal" }, { status: 500 })
  }
}
