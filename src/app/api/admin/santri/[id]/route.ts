import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const santri = await db.santri.findUnique({
      where: { id },
      include: {
        kelas: true,
        wali: { include: { santri: { select: { id: true, name: true, nis: true, kelas: { select: { name: true } } } } } },
        tahunAjaran: true,
        absensi: { take: 30, orderBy: { date: "desc" } },
        nilai: { include: { mapel: true, guru: { select: { name: true } } }, orderBy: { assessmentDate: "desc" } },
        tagihan: { include: { jenisTagihan: true }, orderBy: { createdAt: "desc" } },
        payments: { include: { tagihan: { include: { jenisTagihan: true } } }, orderBy: { paymentDate: "desc" } },
        rapor: { include: { semester: true, tahunAjaran: true } },
      },
    })
    if (!santri) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: santri })
  } catch (error) {
    console.error("[santri get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail santri" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await db.santri.update({
      where: { id },
      data: {
        ...body,
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
        entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
      },
      include: { kelas: true, wali: true },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[santri update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate santri" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // Soft delete
    await db.santri.update({ where: { id }, data: { deletedAt: new Date(), status: "KELUAR" } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[santri delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus santri" }, { status: 500 })
  }
}
