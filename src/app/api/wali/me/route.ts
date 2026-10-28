import { NextRequest, NextResponse } from "next/server"
import { verifyWaliToken, getWaliSantriList } from "@/lib/wali/auth"
import { db } from "@/lib/db"

/**
 * GET /api/wali/me
 * Ambil profil wali yang sedang login + list santri yang bisa diakses.
 *
 * Header: Authorization: Bearer <token>
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) {
      return NextResponse.json({ error: "Token tidak valid atau sudah kadaluarsa" }, { status: 401 })
    }

    const wali = await db.wali.findUnique({
      where: { id: session.waliId },
      select: {
        id: true, name: true, phone: true, email: true,
        activationStatus: true, lastLoginAt: true,
      },
    })

    if (!wali) {
      return NextResponse.json({ error: "Wali tidak ditemukan" }, { status: 404 })
    }

    const santriList = await getWaliSantriList(wali.id)

    return NextResponse.json({
      data: { ...wali, santriList },
    })
  } catch (error) {
    console.error("[wali me] error:", error)
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 })
  }
}
