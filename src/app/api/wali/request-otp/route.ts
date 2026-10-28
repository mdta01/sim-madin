import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizeWhatsApp, generateOTP, generateActivationToken } from "@/lib/wali/helpers"
import { canRequestOTP, incrementOTPRequest } from "@/lib/wali/auth"

/**
 * POST /api/wali/request-otp
 * Request OTP untuk aktivasi akun baru ATAU lupa PIN.
 *
 * Body: { phone: string, type: "INVITE" | "FORGOT_PIN" }
 * Return: { success, message, expiresIn, devOtp? } (devOtp hanya di dev mode)
 *
 * Catatan: OTP akan dikirim via WhatsApp di production.
 * Untuk development, OTP juga di-return di response untuk testing.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, type } = body

    if (!phone) {
      return NextResponse.json({ error: "Nomor WhatsApp wajib diisi" }, { status: 400 })
    }
    if (!["INVITE", "FORGOT_PIN"].includes(type)) {
      return NextResponse.json({ error: "Type tidak valid. Gunakan INVITE atau FORGOT_PIN" }, { status: 400 })
    }

    const normalizedPhone = normalizeWhatsApp(phone)
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Format nomor WhatsApp tidak valid" }, { status: 400 })
    }

    // Cari wali berdasarkan nomor
    const wali = await db.wali.findFirst({
      where: { phone: normalizedPhone, deletedAt: null },
    })

    if (!wali) {
      // Jangan reveal apakah nomor terdaftar atau tidak (security)
      return NextResponse.json({
        success: false,
        message: "Nomor tidak terdaftar. Hubungi madrasah untuk pendaftaran.",
      }, { status: 404 })
    }

    // Untuk FORGOT_PIN, wali harus sudah ACTIVE
    if (type === "FORGOT_PIN" && wali.activationStatus !== "ACTIVE") {
      return NextResponse.json({
        success: false,
        message: "Akun belum aktif. Hubungi madrasah.",
      }, { status: 400 })
    }

    // Untuk INVITE, wali harus belum ACTIVE
    if (type === "INVITE" && wali.activationStatus === "ACTIVE") {
      return NextResponse.json({
        success: false,
        message: "Akun sudah aktif. Silakan login langsung.",
      }, { status: 400 })
    }

    // Rate limiting
    const otpCheck = canRequestOTP(wali)
    if (!otpCheck.allowed) {
      return NextResponse.json({ error: otpCheck.reason }, { status: 429 })
    }

    // Generate OTP & token
    const otp = generateOTP()
    const token = generateActivationToken()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 menit untuk OTP

    // Save activation record
    await db.waliActivation.create({
      data: {
        waliId: wali.id,
        token,
        otpCode: otp,
        type,
        expiresAt,
      },
    })

    // Update wali dengan OTP aktif
    await db.wali.update({
      where: { id: wali.id },
      data: {
        otpCode: otp,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
      },
    })

    await incrementOTPRequest(wali.id)

    // ⚠️ DEV MODE: return OTP di response untuk testing
    // Production: kirim OTP via WhatsApp API di sini
    const isDev = process.env.NODE_ENV !== "production"

    return NextResponse.json({
      success: true,
      message: isDev
        ? `OTP dikirim (DEV MODE). Kode OTP: ${otp}`
        : "OTP telah dikirim ke nomor WhatsApp Anda",
      expiresIn: "15 menit",
      ...(isDev ? { devOtp: otp, devToken: token } : {}),
    })
  } catch (error) {
    console.error("[wali request-otp] error:", error)
    return NextResponse.json({ error: "Gagal memproses request" }, { status: 500 })
  }
}
