import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizeWhatsApp } from "@/lib/wali/helpers"
import { validateBody } from "@/lib/validation/helpers"
import { waliOtpVerifySchema } from "@/lib/validation/wali"
import jwt from "jsonwebtoken"

const JWT_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.NEXT_PUBLIC_WALI_JWT_SECRET ||
  "sim-madin-dev-secret-change-in-production-2025"

/**
 * POST /api/wali/verify-otp
 * Verify OTP yang diinput wali.
 *
 * Body: { phone, otp }
 * Return: { verifyToken } (token sementara untuk set-pin, valid 10 menit)
 */
export async function POST(req: NextRequest) {
  try {
    // ── Validate body with Zod ────────────────────────────────────────────
    const body = await validateBody(req, waliOtpVerifySchema)
    if (!body.ok) return body.error
    const { phone, otp: otpCode } = body.data

    const normalizedPhone = normalizeWhatsApp(phone)
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Format nomor WhatsApp tidak valid" }, { status: 400 })
    }

    const wali = await db.wali.findFirst({
      where: { phone: normalizedPhone, deletedAt: null },
    })

    if (!wali) {
      return NextResponse.json({ error: "Nomor tidak terdaftar" }, { status: 404 })
    }

    // Cek apakah OTP sudah expired
    if (!wali.otpExpiresAt || wali.otpExpiresAt < new Date()) {
      return NextResponse.json({ error: "OTP sudah kadaluarsa. Silakan request ulang." }, { status: 400 })
    }

    // Cek apakah OTP cocok
    if (wali.otpCode !== otpCode) {
      // Increment attempts
      await db.wali.update({
        where: { id: wali.id },
        data: { otpAttempts: { increment: 1 } },
      })

      // Jika sudah 3x salah, invalidate OTP
      if (wali.otpAttempts + 1 >= 3) {
        await db.wali.update({
          where: { id: wali.id },
          data: {
            otpCode: null,
            otpExpiresAt: null,
            otpAttempts: 0,
          },
        })
        return NextResponse.json({
          error: "Terlalu banyak percobaan salah. OTP telah dihapus, silakan request ulang.",
        }, { status: 400 })
      }

      return NextResponse.json({
        error: `Kode OTP salah. Sisa percobaan: ${3 - (wali.otpAttempts + 1)}`,
      }, { status: 400 })
    }

    // OTP valid — generate verifyToken (untuk set-pin)
    const verifyToken = jwt.sign(
      { waliId: wali.id, phone: normalizedPhone, purpose: "set-pin" },
      JWT_SECRET,
      { expiresIn: "10m" },
    )

    // Clear OTP dari wali (sudah dipakai)
    await db.wali.update({
      where: { id: wali.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    })

    return NextResponse.json({
      success: true,
      message: "OTP terverifikasi. Silakan buat PIN baru.",
      verifyToken,
      waliName: wali.name,
    })
  } catch (error) {
    console.error("[wali verify-otp] error:", error)
    return NextResponse.json({ error: "Gagal verifikasi OTP" }, { status: 500 })
  }
}
