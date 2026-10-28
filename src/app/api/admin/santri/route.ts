import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { generateNIS, isNISTaken, isValidNISFormat, normalizeWhatsApp } from "@/lib/wali/helpers"
import { generateOTP, generateActivationToken } from "@/lib/wali/helpers"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("santri:read", req)
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const kelasId = searchParams.get("kelasId")
    const status = searchParams.get("status")
    const gender = searchParams.get("gender")

    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nis: { contains: search } },
        { nisn: { contains: search } },
      ]
    }
    if (kelasId) where.kelasId = kelasId
    if (status) where.status = status
    if (gender) where.gender = gender

    const santri = await db.santri.findMany({
      where,
      include: {
        kelas: { select: { id: true, name: true, code: true } },
        wali: { select: { id: true, name: true, phone: true, activationStatus: true } },
        waliLinks: {
          include: {
            wali: { select: { id: true, name: true, phone: true, activationStatus: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: santri, total: santri.length })
  } catch (error) {
    console.error("[santri list] error:", error)
    return NextResponse.json({ error: "Gagal memuat data santri" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("santri:create", req)
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const body = await req.json()
    const {
      nis, nisn, name, gender, birthPlace, birthDate, address, phone,
      waliId, kelasId, tahunAjaranId, entryDate, status, photoUrl,
      // New wali fields (untuk auto-create wali)
      waliName, waliPhone, waliRelationship,
    } = body

    if (!name || !gender) {
      return NextResponse.json({ error: "Nama dan Jenis Kelamin wajib diisi" }, { status: 400 })
    }

    // === AUTO-GENERATE NIS jika tidak diisi manual ===
    let finalNIS = nis
    if (!finalNIS) {
      finalNIS = await generateNIS()
    } else {
      // Validate format kalau diisi manual
      if (!isValidNISFormat(finalNIS)) {
        return NextResponse.json({ error: "Format NIS tidak valid (harus 8 digit angka)" }, { status: 400 })
      }
      if (await isNISTaken(finalNIS)) {
        return NextResponse.json({ error: "NIS sudah terdaftar" }, { status: 400 })
      }
    }

    // Double-check unique (race condition safety)
    if (await isNISTaken(finalNIS)) {
      // Generate ulang jika collision
      finalNIS = await generateNIS()
    }

    if (nisn) {
      const existingNisn = await db.santri.findFirst({ where: { nisn } })
      if (existingNisn) {
        return NextResponse.json({ error: "NISN sudah terdaftar" }, { status: 400 })
      }
    }

    // === AUTO-LINK/CREATE WALI jika waliPhone diberikan ===
    let finalWaliId = waliId
    let waliActivation = null

    if (!finalWaliId && waliPhone) {
      const normalizedPhone = normalizeWhatsApp(waliPhone)
      if (!normalizedPhone) {
        return NextResponse.json({ error: "Format nomor WhatsApp tidak valid" }, { status: 400 })
      }
      if (!waliName) {
        return NextResponse.json({ error: "Nama wali wajib diisi jika nomor WhatsApp diisi" }, { status: 400 })
      }

      // Cari wali existing berdasarkan nomor WA
      const existingWali = await db.wali.findFirst({
        where: { phone: normalizedPhone, deletedAt: null },
      })

      if (existingWali) {
        finalWaliId = existingWali.id
        waliActivation = { wali: existingWali, isNew: false }
      } else {
        // Buat wali baru dengan status PENDING
        const newWali = await db.wali.create({
          data: {
            name: waliName,
            phone: normalizedPhone,
            relationship: waliRelationship || "WALI",
            activationStatus: "PENDING",
          },
        })
        finalWaliId = newWali.id
        waliActivation = { wali: newWali, isNew: true }
      }
    } else if (!finalWaliId && waliName && !waliPhone) {
      // Wali tanpa nomor WA — status PENDING_NO_PHONE
      const newWali = await db.wali.create({
        data: {
          name: waliName,
          phone: null,
          relationship: waliRelationship || "WALI",
          activationStatus: "PENDING_NO_PHONE",
        },
      })
      finalWaliId = newWali.id
      waliActivation = { wali: newWali, isNew: true }
    }

    // === CREATE SANTRI ===
    const santri = await db.santri.create({
      data: {
        nis: finalNIS,
        nisn: nisn || null,
        name, gender,
        birthPlace: birthPlace || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        address: address || null,
        phone: phone || null,
        photoUrl: photoUrl || null,
        waliId: finalWaliId || null,
        kelasId: kelasId || null,
        tahunAjaranId: tahunAjaranId || null,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        status: status || "AKTIF",
      },
      include: { kelas: true, wali: true },
    })

    // === CREATE SANTRI-WALI PIVOT (link relasi) ===
    if (finalWaliId) {
      // Cek apakah santri sudah punya wali primary
      const existingPrimary = await db.santriWali.findFirst({
        where: { santriId: santri.id, isPrimary: true },
      })
      await db.santriWali.create({
        data: {
          santriId: santri.id,
          waliId: finalWaliId,
          relationship: waliRelationship || "WALI",
          isPrimary: !existingPrimary, // true jika belum ada primary
          canAccess: true,
        },
      })
    }

    // === GENERATE ACTIVATION TOKEN + OTP jika wali baru ===
    let activationInfo = null
    if (waliActivation?.isNew) {
      const token = generateActivationToken()
      const otp = generateOTP()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 jam untuk invite

      await db.waliActivation.create({
        data: {
          waliId: waliActivation.wali.id,
          token,
          otpCode: otp,
          type: "INVITE",
          expiresAt,
        },
      })

      // Update wali dengan activation info
      await db.wali.update({
        where: { id: waliActivation.wali.id },
        data: {
          otpCode: otp,
          otpExpiresAt: expiresAt,
        },
      })

      activationInfo = {
        waliId: waliActivation.wali.id,
        waliName: waliActivation.wali.name,
        waliPhone: waliActivation.wali.phone,
        activationToken: token,
        otpCode: otp, // ⚠️ Dev only — di production kirim via WhatsApp, jangan return ke client
        activationUrl: `/activate?token=${token}`,
        expiresIn: "24 jam",
      }
    }

    await logAudit(session, "CREATE", "SANTRI", santri.id, {
      name: santri.name, nis: santri.nis, waliAutoCreated: waliActivation?.isNew || false,
    }, req)

    return NextResponse.json({
      data: santri,
      nis: finalNIS, // eksplisit untuk admin tahu NIS yang di-generate
      waliActivation: activationInfo, // info aktivasi wali jika baru dibuat
    })
  } catch (error) {
    console.error("[santri create] error:", error)
    return NextResponse.json({ error: "Gagal menambah santri" }, { status: 500 })
  }
}
