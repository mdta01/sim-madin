import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import jwt from "jsonwebtoken"
import { hashPIN, validatePIN } from "@/lib/wali/auth"

const JWT_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.NEXT_PUBLIC_WALI_JWT_SECRET ||
  "sim-madin-dev-secret-change-in-production-2025"

/**
 * POST /api/wali/set-pin
 * Set PIN baru setelah OTP terverifikasi.
 *
 * Body: { verifyToken, pin }
 * Return: { success, message }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { verifyToken, pin } = body

    if (!verifyToken || !pin) {
      return NextResponse.json({ error: "Token verifikasi dan PIN wajib diisi" }, { status: 400 })
    }

    // Verify token
    let decoded: any
    try {
      decoded = jwt.verify(verifyToken, JWT_SECRET)
    } catch {
      return NextResponse.json({ error: "Token tidak valid atau sudah kadaluarsa" }, { status: 400 })
    }

    if (decoded.purpose !== "set-pin") {
      return NextResponse.json({ error: "Token tidak valid untuk set-pin" }, { status: 400 })
    }

    // Validate PIN
    const pinValidation = validatePIN(pin)
    if (!pinValidation.valid) {
      return NextResponse.json({ error: pinValidation.error }, { status: 400 })
    }

    // Hash PIN
    const pinHash = await hashPIN(pin)

    // Update wali
    await db.wali.update({
      where: { id: decoded.waliId },
      data: {
        pinHash,
        activationStatus: "ACTIVE",
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "PIN berhasil dibuat. Akun Anda sekarang aktif. Silakan login.",
    })
  } catch (error) {
    console.error("[wali set-pin] error:", error)
    return NextResponse.json({ error: "Gagal menyimpan PIN" }, { status: 500 })
  }
}
