import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const guru = await db.guru.findUnique({
      where: { id },
      include: {
        kelasWali: { include: { _count: { select: { santri: { where: { status: "AKTIF" } } } } } },
        jadwal: { include: { kelas: true, mapel: true }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        _count: { select: { nilai: true, absensi: true } },
        user: { select: { id: true, email: true, name: true, isActive: true } },
      },
    })
    if (!guru) return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: guru })
  } catch (error) {
    console.error("[guru get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail guru" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.guru.update({
      where: { id },
      data: {
        ...body,
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
        joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
      },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[guru update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate guru" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.guru.update({ where: { id }, data: { deletedAt: new Date(), status: "KELUAR" } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[guru delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus guru" }, { status: 500 })
  }
}
