import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tagihan = await db.tagihan.findUnique({
      where: { id },
      include: { santri: true, kelas: true, jenisTagihan: true, payments: { orderBy: { paymentDate: "desc" } } },
    })
    if (!tagihan) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: tagihan })
  } catch (error) {
    console.error("[tagihan get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail tagihan" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.tagihan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[tagihan delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus tagihan" }, { status: 500 })
  }
}
