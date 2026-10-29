import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken, verifyWaliSantriAccess } from "@/lib/wali/auth"
import { getStorageAdapter, validateFile } from "@/lib/storage/adapter"

interface Params {
  params: Promise<{ tugasId: string }>
}

/**
 * POST /api/wali/tugas/[tugasId]/submit
 *
 * Submit a tugas for a santri. The wali must have access to the santri,
 * the santri must be in the tugas's kelas, and the tugas must be published
 * and not yet overdue (overdue submissions are allowed but marked LATE).
 *
 * Body (multipart/form-data):
 *   - santriId: string (required)
 *   - textAnswer?: string
 *   - file?: File (PDF/JPG/PNG, max 5MB)
 *
 * Or JSON:
 *   - { santriId, textAnswer?, fileUrl? }
 *
 * Returns: { data: PengumpulanTugas }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })
    }

    const { tugasId } = await params

    // Verify tugas exists, is published, and is for an active TA
    const tugas = await db.tugas.findUnique({
      where: { id: tugasId, deletedAt: null },
      include: {
        kelas: { select: { id: true, name: true } },
        mapel: { select: { name: true } },
      },
    })
    if (!tugas) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })
    if (!tugas.isPublished) {
      return NextResponse.json({ error: "Tugas belum dipublikasikan" }, { status: 400 })
    }

    // Check active TA — submissions only allowed while TA is active
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    if (!ta || tugas.tahunAjaranId !== ta.id) {
      return NextResponse.json({ error: "Tugas dari tahun ajaran tidak aktif" }, { status: 400 })
    }

    // Parse body — support both JSON and multipart
    const contentType = req.headers.get("content-type") || ""
    let santriId: string | undefined
    let textAnswer: string | null = null
    let fileUrl: string | null = null

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      santriId = formData.get("santriId") as string | undefined
      textAnswer = (formData.get("textAnswer") as string) || null
      const file = formData.get("file") as File | null

      if (file) {
        const validation = validateFile({ type: file.type, size: file.size })
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }
        const storage = await getStorageAdapter()
        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await storage.upload(buffer, {
          filename: file.name,
          contentType: file.type,
          prefix: "tugas-submission",
          metadata: { uploadedBy: `wali:${session.waliId}`, uploadedAt: new Date().toISOString() },
        })
        fileUrl = result.url
      }
    } else {
      const body = await req.json()
      santriId = body.santriId
      textAnswer = body.textAnswer || null
      fileUrl = body.fileUrl || null
    }

    if (!santriId) {
      return NextResponse.json({ error: "santriId wajib diisi" }, { status: 400 })
    }

    // VERIFY: wali must have access to this santri
    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) {
      return NextResponse.json({
        error: "Forbidden",
        message: access.reason || "Anda tidak memiliki akses ke santri ini",
      }, { status: 403 })
    }

    // Verify santri is in the tugas's kelas
    const santri = await db.santri.findUnique({
      where: { id: santriId, deletedAt: null, status: "AKTIF" },
      select: { id: true, name: true, kelasId: true },
    })
    if (!santri) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 })
    if (santri.kelasId !== tugas.kelasId) {
      return NextResponse.json({
        error: "Santri bukan dari kelas tugas ini",
        message: `Tugas ini untuk kelas ${tugas.kelas?.name}, santri terdaftar di kelas lain.`,
      }, { status: 403 })
    }

    // Require either fileUrl or textAnswer
    if (!fileUrl && !textAnswer) {
      return NextResponse.json({
        error: "Wajib menyertakan jawaban: upload file atau tulis teks jawaban",
      }, { status: 400 })
    }

    // Compute status: SUBMITTED or LATE (if past dueDate)
    const now = new Date()
    const isLate = now > tugas.dueDate
    const submissionStatus = isLate ? "LATE" : "SUBMITTED"

    // Upsert: 1 submission per (tugasId, santriId)
    const existing = await db.pengumpulanTugas.findUnique({
      where: { tugasId_santriId: { tugasId, santriId } },
    })

    let submission
    if (existing) {
      // Allow re-submission if not yet graded
      if (existing.status === "GRADED") {
        return NextResponse.json({
          error: "Tugas sudah dinilai, tidak dapat mengumpulkan ulang",
          message: `Nilai: ${existing.score}. Hubungi guru jika perlu revisi.`,
        }, { status: 400 })
      }
      submission = await db.pengumpulanTugas.update({
        where: { id: existing.id },
        data: {
          fileUrl: fileUrl ?? existing.fileUrl,
          textAnswer: textAnswer ?? existing.textAnswer,
          submittedAt: now,
          status: submissionStatus,
          // Reset grading fields if re-submitting
          score: null,
          feedback: null,
          gradedAt: null,
          gradedById: null,
        },
        include: { tugas: { select: { title: true, mapel: { select: { name: true } } } } },
      })
    } else {
      submission = await db.pengumpulanTugas.create({
        data: {
          tugasId,
          santriId,
          fileUrl,
          textAnswer,
          submittedAt: now,
          status: submissionStatus,
        },
        include: { tugas: { select: { title: true, mapel: { select: { name: true } } } } },
      })
    }

    return NextResponse.json({
      data: submission,
      message: isLate
        ? "Tugas terkumpul (terlambat). Guru akan meninjau."
        : "Tugas berhasil dikumpulkan. Tunggu penilaian dari guru.",
    })
  } catch (error) {
    console.error("[wali tugas submit] error:", error)
    return NextResponse.json({ error: "Gagal mengumpulkan tugas" }, { status: 500 })
  }
}

/**
 * GET /api/wali/tugas/[tugasId]/submit?santriId=xxx
 * Returns the current submission status for a santri (if any).
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })
    }

    const { tugasId } = await params
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    if (!santriId) return NextResponse.json({ error: "santriId wajib diisi" }, { status: 400 })

    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) {
      return NextResponse.json({
        error: "Forbidden",
        message: access.reason || "Anda tidak memiliki akses ke santri ini",
      }, { status: 403 })
    }

    const submission = await db.pengumpulanTugas.findUnique({
      where: { tugasId_santriId: { tugasId, santriId } },
      include: {
        tugas: {
          select: {
            id: true, title: true, description: true, dueDate: true, maxScore: true, type: true,
            mapel: { select: { name: true } },
          },
        },
      },
    })

    return NextResponse.json({ data: submission })
  } catch (error) {
    console.error("[wali tugas submission status] error:", error)
    return NextResponse.json({ error: "Gagal memuat status submission" }, { status: 500 })
  }
}
