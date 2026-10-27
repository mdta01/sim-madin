import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ann = await db.announcement.findUnique({
      where: { id },
      include: { createdBy: { select: { name: true } } },
    })
    if (!ann) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: ann })
  } catch (error) {
    console.error("[pengumuman get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail pengumuman" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.announcement.update({
      where: { id },
      data: {
        ...body,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : (body.expiresAt === null ? null : undefined),
      },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[pengumuman update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate pengumuman" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.announcement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[pengumuman delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus pengumuman" }, { status: 500 })
  }
}
