import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizeWhatsApp } from "@/lib/wali/helpers"
import {
  verifyPIN, isWaliLocked, recordFailedLogin, resetFailedLogin,
  signWaliToken, getWaliSantriList, type WaliSession,
} from "@/lib/wali/auth"
import { rateLimit, getClientIP, rateLimitHeaders, RATE_LIMITS } from "@/lib/auth/rate-limit"
import { validateBody } from "@/lib/validation/helpers"
import { waliLoginSchema } from "@/lib/validation/wali"

/**
 * POST /api/wali/login
 * Login wali dengan Nomor WhatsApp + PIN.
 *
 * Body: { phone, pin }
 * Return: { token, wali, santriList }
 *
 * Rate limit: 5 attempts per minute per IP (RATE_LIMITS.login)
 * — blocks brute-force PIN guessing even before per-account lockout kicks in.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Rate limit check (before any DB call) ─────────────────────────────
    const ip = getClientIP(req)
    const rl = rateLimit(ip, "/api/wali/login", RATE_LIMITS.login)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
        { status: 429, headers: rateLimitHeaders(rl) },
      )
    }

    // ── Validate body with Zod ────────────────────────────────────────────
    const body = await validateBody(req, waliLoginSchema)
    if (!body.ok) return body.error
    const { phone, pin } = body.data

    // waliLoginSchema already enforces PIN format (6 digits), so the
    // explicit regex check below is redundant — but kept as defense-in-depth.
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "PIN harus 6 digit angka" }, { status: 400 })
    }

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
