import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken, verifyWaliSantriAccess } from "@/lib/wali/auth"

interface Params { params: Promise<{ ujianId: string }> }

/**
 * POST /api/wali/ujian/[ujianId]/start
 * Start ujian session for santri.
 * - Create UjianSesi (or resume if IN_PROGRESS)
 * - Generate shuffled soal order (stored for reproducibility)
 * - For PG soal, generate shuffled option order per soal
 *
 * Body: { santriId }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { ujianId } = await params
    const body = await req.json()
    const santriId = body.santriId
    if (!santriId) return NextResponse.json({ error: "santriId wajib diisi" }, { status: 400 })

    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) return NextResponse.json({ error: "Forbidden", message: access.reason }, { status: 403 })

    const ujian = await db.ujian.findUnique({
      where: { id: ujianId, deletedAt: null, isPublished: true },
      include: { soalLinks: { select: { id: true } } },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    // Verify santri is in kelas
    const santri = await db.santri.findUnique({ where: { id: santriId }, select: { kelasId: true } })
    if (santri?.kelasId !== ujian.kelasId) {
      return NextResponse.json({ error: "Santri bukan dari kelas ujian ini" }, { status: 403 })
    }

    // Check time window
    const now = new Date()
    if (now < new Date(ujian.startTime)) {
      return NextResponse.json({ error: "Ujian belum dimulai" }, { status: 400 })
    }
    if (now > new Date(ujian.endTime)) {
      return NextResponse.json({ error: "Ujian sudah berakhir" }, { status: 400 })
    }

    // Check if already submitted
    const existing = await db.ujianSesi.findUnique({
      where: { ujianId_santriId: { ujianId, santriId } },
    })
    if (existing?.status === "SUBMITTED" || existing?.status === "GRADED") {
      return NextResponse.json({ error: "Ujian sudah dikumpulkan", message: "Anda sudah submit ujian ini" }, { status: 400 })
    }

    // If IN_PROGRESS, resume
    if (existing?.status === "IN_PROGRESS") {
      const elapsed = Math.floor((Date.now() - new Date(existing.startTime).getTime()) / 1000)
      const remaining = Math.max(0, ujian.durationMnt * 60 - elapsed)
      return NextResponse.json({
        data: { sesiId: existing.id, status: "IN_PROGRESS", remainingSeconds: remaining },
        message: "Melanjutkan ujian",
      })
    }

    // Create new sesi with shuffled soal order
    const indices = ujian.soalLinks.map((_, i) => i)
    const soalOrder = shuffleArray(indices)

    const sesi = await db.ujianSesi.create({
      data: {
        ujianId,
        santriId,
        startTime: now,
        status: "IN_PROGRESS",
        soalOrder: JSON.stringify(soalOrder),
      },
    })

    return NextResponse.json({
      data: { sesiId: sesi.id, status: "IN_PROGRESS", remainingSeconds: ujian.durationMnt * 60 },
      message: "Ujian dimulai. Timer berjalan.",
    })
  } catch (error) {
    console.error("[wali ujian start] error:", error)
    return NextResponse.json({ error: "Gagal memulai ujian" }, { status: 500 })
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
