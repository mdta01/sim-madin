import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import QRCode from "qrcode"

interface Params { params: Promise<{ guruId: string }> }

/**
 * GET /api/admin/qr/guru/[guruId]
 * Returns QR code as data URL for guru (base64 PNG).
 * QR content: MADIN:GURU:{guruId}:{nip or id}
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("qr:read", req)
  if (guard.error) return guard.error
  try {
    const { guruId } = await params
    const guru = await db.guru.findUnique({
      where: { id: guruId },
      select: { id: true, name: true, nip: true },
    })
    if (!guru) return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 })

    const qrContent = `MADIN:GURU:${guru.id}:${guru.nip || guru.id}`
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: { dark: "#7c3aed", light: "#ffffff" },
    })

    return NextResponse.json({
      data: {
        guru,
        qrContent,
        qrDataUrl,
      },
    })
  } catch (error) {
    console.error("[qr guru] error:", error)
    return NextResponse.json({ error: "Gagal generate QR" }, { status: 500 })
  }
}
