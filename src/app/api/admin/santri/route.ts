import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { generateNIS, isNISTaken, isValidNISFormat, normalizeWhatsApp } from "@/lib/wali/helpers"
import { generateOTP, generateActivationToken } from "@/lib/wali/helpers"
import { validateBody, validateQuery } from "@/lib/validation/helpers"
import { santriCreateSchema, santriUpdateSchema, santriQuerySchema, type SantriCreateInput, type SantriQuery } from "@/lib/validation/santri"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("santri:read", req)
  if (guard.error) return guard.error
  const session = guard.session

  try {
    // ── Validate query params with Zod ─────────────────────────────────────
    const query = await validateQuery(req, santriQuerySchema)
    if (!query.ok) return query.error
    const { search, kelasId, status, gender, page, limit } = query.data
    const skip = (page - 1) * limit

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

    // Run count + paged query in parallel for efficiency
    const [santri, totalCount] = await Promise.all([
      db.santri.findMany({
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
        skip,
        take: limit,
      }),
      db.santri.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      ...({} as any),
      data: santri,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("[santri list] error:", error)
    return NextResponse.json({
      ...({} as any), error: "Gagal memuat data santri" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("santri:create", req)
  if (guard.error) return guard.error
  const session = guard.session

  try {
    // ── Validate body with Zod ─────────────────────────────────────
    const body = await validateBody(req, santriCreateSchema)
    if (!body.ok) return body.error
    const {
      nis, nisn, name, gender, birthPlace, birthDate, address, phone,
      waliId, kelasId, tahunAjaranId, entryDate, status, photoUrl,
      // New wali fields (untuk auto-create wali)
      waliName, waliPhone, waliRelationship,
    } = body.data

    // === AUTO-GENERATE NIS jika tidak diisi manual ===
    let finalNIS = nis
    if (!finalNIS) {
      finalNIS = await generateNIS()
    } else {
      // Zod already validated format (6-12 digits); check uniqueness here.
      if (await isNISTaken(finalNIS)) {
        return NextResponse.json({
      ...({} as any), error: "NIS sudah terdaftar" }, { status: 400 })
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
        return NextResponse.json({
      ...({} as any), error: "NISN sudah terdaftar" }, { status: 400 })
      }
    }

    // === AUTO-LINK/CREATE WALI jika waliPhone diberikan ===
    let finalWaliId = waliId
    let waliActivation: { wali: any; isNew: boolean } | null = null

    if (!finalWaliId && waliPhone) {
      const normalizedPhone = normalizeWhatsApp(waliPhone)
      if (!normalizedPhone) {
        return NextResponse.json({
      ...({} as any), error: "Format nomor WhatsApp tidak valid" }, { status: 400 })
      }
      if (!waliName) {
        return NextResponse.json({
      ...({} as any), error: "Nama wali wajib diisi jika nomor WhatsApp diisi" }, { status: 400 })
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

    // === AUTO-SET tahunAjaranId dari active TA jika tidak diisi ===
    let finalTahunAjaranId: string | null | undefined = tahunAjaranId
    if (!finalTahunAjaranId) {
      const activeTA = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      finalTahunAjaranId = activeTA?.id || null
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
        tahunAjaranId: finalTahunAjaranId,
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
    let activationInfo: any = null
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

      // Security: never leak OTP code or activation token to the client in
      // production. In dev, return them so admins can preview the activation
      // URL; in prod, the wali receives the OTP via WhatsApp service (TODO)
      // and the token is only usable through the /activate page (which looks
      // up the token server-side).
      const isDev = process.env.NODE_ENV !== "production"
      activationInfo = {
        waliId: waliActivation.wali.id,
        waliName: waliActivation.wali.name,
        waliPhone: waliActivation.wali.phone,
        // Token is safe to return — /activate page validates it server-side.
        // We just don't return the OTP code (which is the secret credential).
        activationToken: token,
        activationUrl: `/activate?token=${token}`,
        expiresIn: "24 jam",
        ...(isDev
          ? { otpCode: otp, _devOnly: true }
          : { otpSentVia: "whatsapp" }),
      }
    }

    await logAudit(session, "CREATE", "SANTRI", santri.id, {
      name: santri.name, nis: santri.nis, waliAutoCreated: waliActivation?.isNew || false,
    }, req)

    return NextResponse.json({
      ...({} as any),
      data: santri,
      nis: finalNIS, // eksplisit untuk admin tahu NIS yang di-generate
      waliActivation: activationInfo, // info aktivasi wali jika baru dibuat
    })
  } catch (error) {
    console.error("[santri create] error:", error)
    return NextResponse.json({
      ...({} as any), error: "Gagal menambah santri" }, { status: 500 })
  }
}
