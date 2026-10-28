import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth, logAudit } from "@/lib/auth/guards"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

/**
 * POST /api/admin/upload
 * Upload file (foto profil, bukti transfer, dll).
 * Body: multipart/form-data with `file` field.
 * Returns: { url: "/uploads/xxx.jpg" }
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 })
    }

    // Validate
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: `Tipe file tidak didukung. Hanya: ${ALLOWED_TYPES.join(", ")}`,
      }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `Ukuran file melebihi ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB`,
      }, { status: 400 })
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg"
    const prefix = (formData.get("prefix") as string) || "file"
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const url = `/uploads/${filename}`

    await logAudit(session, "UPLOAD", "FILE", undefined, {
      filename, size: file.size, type: file.type,
    }, req)

    return NextResponse.json({
      url,
      filename,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("[upload] error:", error)
    return NextResponse.json({ error: "Gagal upload file" }, { status: 500 })
  }
}
