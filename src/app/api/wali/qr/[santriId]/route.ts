import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken, verifyWaliSantriAccess } from "@/lib/wali/auth"
import QRCode from "qrcode"

interface Params { params: Promise<{ santriId: string }> }

/**
 * GET /api/wali/qr/[santriId]
 * Returns QR code for wali's santri (digital card QR).
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { santriId } = await params
    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) {
      return NextResponse.json({ error: "Forbidden", message: access.reason }, { status: 403 })
    }

    const santri = await db.santri.findUnique({
      where: { id: santriId },
      select: { id: true, name: true, nis: true, nisn: true, gender: true, photoUrl: true, kelas: { select: { name: true } } },
    })
    if (!santri) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 })

    const qrContent = `MADIN:SANTRI:${santri.id}:${santri.nis}`
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 250, margin: 2,
      color: { dark: "#059669", light: "#ffffff" },
    })

    return NextResponse.json({
      data: { santri, qrContent, qrDataUrl },
    })
  } catch (error) {
    console.error("[wali qr] error:", error)
    return NextResponse.json({ error: "Gagal generate QR" }, { status: 500 })
  }
}
