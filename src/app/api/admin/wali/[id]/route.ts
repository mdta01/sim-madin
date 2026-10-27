import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const wali = await db.wali.findUnique({
      where: { id },
      include: { santri: { include: { kelas: true }, orderBy: { name: "asc" } }, user: { select: { id: true, email: true, name: true, isActive: true } } },
    })
    if (!wali) return NextResponse.json({ error: "Wali tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: wali })
  } catch (error) {
    console.error("[wali get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail wali" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.wali.update({ where: { id }, data: body, include: { _count: { select: { santri: true } } } })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[wali update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate wali" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.wali.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[wali delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus wali" }, { status: 500 })
  }
}
