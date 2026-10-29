import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import QRCode from "qrcode"

interface Params { params: Promise<{ santriId: string }> }

/**
 * GET /api/admin/qr/santri/[santriId]
 * Returns QR code as data URL for santri (base64 PNG).
 * QR content: MADIN:SANTRI:{santriId}:{nis}
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("qr:read", req)
  if (guard.error) return guard.error
  try {
    const { santriId } = await params
    const santri = await db.santri.findUnique({
      where: { id: santriId },
      select: { id: true, name: true, nis: true, kelas: { select: { name: true } } },
    })
    if (!santri) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 })

    const qrContent = `MADIN:SANTRI:${santri.id}:${santri.nis}`
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: { dark: "#059669", light: "#ffffff" },
    })

    return NextResponse.json({
      data: {
        santri,
        qrContent,
        qrDataUrl,
      },
    })
  } catch (error) {
    console.error("[qr santri] error:", error)
    return NextResponse.json({ error: "Gagal generate QR" }, { status: 500 })
  }
}
