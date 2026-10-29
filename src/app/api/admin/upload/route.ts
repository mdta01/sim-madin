import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth, logAudit } from "@/lib/auth/guards"
import { getStorageAdapter, validateFile } from "@/lib/storage/adapter"

export async function POST(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 })

    const validation = validateFile({ type: file.type, size: file.size })
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 })

    const storage = await getStorageAdapter()
    const prefix = (formData.get("prefix") as string) || "file"
    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await storage.upload(buffer, {
      filename: file.name,
      contentType: file.type,
      prefix,
      metadata: { uploadedBy: session.user.id, uploadedAt: new Date().toISOString() },
    })

    await logAudit(session, "UPLOAD", "FILE", undefined, {
      filename: result.filename, size: file.size, type: file.type, storageType: storage.type, url: result.url,
    }, req)

    return NextResponse.json({
      url: result.url, filename: result.filename, size: result.size,
      type: result.contentType, storageType: storage.type, storagePath: result.storagePath,
    })
  } catch (error) {
    console.error("[upload] error:", error)
    return NextResponse.json({ error: "Gagal upload file" }, { status: 500 })
  }
}
