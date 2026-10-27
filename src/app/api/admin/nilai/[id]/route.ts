import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.nilai.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[nilai delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus nilai" }, { status: 500 })
  }
}
