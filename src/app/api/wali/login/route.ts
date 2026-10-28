import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizeWhatsApp } from "@/lib/wali/helpers"
import {
  verifyPIN, isWaliLocked, recordFailedLogin, resetFailedLogin,
  signWaliToken, getWaliSantriList, type WaliSession,
} from "@/lib/wali/auth"

/**
 * POST /api/wali/login
 * Login wali dengan Nomor WhatsApp + PIN.
 *
 * Body: { phone, pin }
 * Return: { token, wali, santriList }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, pin } = body

    if (!phone || !pin) {
      return NextResponse.json({ error: "Nomor WhatsApp dan PIN wajib diisi" }, { status: 400 })
    }

    const normalizedPhone = normalizeWhatsApp(phone)
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Format nomor WhatsApp tidak valid" }, { status: 400 })
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "PIN harus 6 digit angka" }, { status: 400 })
    }

    const wali = await db.wali.findFirst({
      where: { phone: normalizedPhone, deletedAt: null },
    })

    if (!wali) {
      return NextResponse.json({ error: "Nomor tidak terdaftar" }, { status: 404 })
    }

    if (wali.activationStatus !== "ACTIVE") {
      return NextResponse.json({
        error: `Akun belum aktif (status: ${wali.activationStatus}). Hubungi madrasah untuk aktivasi.`,
      }, { status: 403 })
    }

    // Cek apakah akun terkunci
    if (isWaliLocked(wali)) {
      const remaining = Math.ceil((new Date(wali.lockedUntil!).getTime() - Date.now()) / 60000)
      return NextResponse.json({
        error: `Akun terkunci. Coba lagi dalam ${remaining} menit.`,
      }, { status: 423 })
    }

    // Verify PIN
    if (!wali.pinHash) {
      return NextResponse.json({ error: "PIN belum di-set. Lakukan aktivasi akun." }, { status: 400 })
    }

    const isValid = await verifyPIN(pin, wali.pinHash)
    if (!isValid) {
      const result = await recordFailedLogin(wali.id)
      if (result.locked) {
        return NextResponse.json({
          error: "Akun terkunci karena 5x salah PIN. Coba lagi dalam 15 menit.",
        }, { status: 423 })
      }
      const remaining = 5 - (wali.failedLoginAttempts + 1)
      return NextResponse.json({
        error: `PIN salah. Sisa percobaan: ${remaining}`,
      }, { status: 400 })
    }

    // Login berhasil
    await resetFailedLogin(wali.id)

    const santriList = await getWaliSantriList(wali.id)

    const session: WaliSession = {
      waliId: wali.id,
      phone: wali.phone!,
      name: wali.name,
      santriIds: santriList.map((s) => s.id),
    }

    const token = signWaliToken(session)

    return NextResponse.json({
      success: true,
      token,
      wali: {
        id: wali.id,
        name: wali.name,
        phone: wali.phone,
        email: wali.email,
      },
      santriList,
    })
  } catch (error) {
    console.error("[wali login] error:", error)
    return NextResponse.json({ error: "Gagal login" }, { status: 500 })
  }
}
