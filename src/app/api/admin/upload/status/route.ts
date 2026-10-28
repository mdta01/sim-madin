import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth/guards"
import { isFirebaseStorageConfigured, MAX_FILE_SIZE, ALLOWED_TYPES } from "@/lib/storage/adapter"

/**
 * GET /api/admin/upload/status — info storage configuration
 * Berguna untuk debugging di frontend apakah sedang pakai local atau Firebase Storage
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error

  return NextResponse.json({
    storageType: isFirebaseStorageConfigured() ? "firebase" : "local",
    firebaseConfigured: isFirebaseStorageConfigured(),
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || null,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || null,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeLabel: `${MAX_FILE_SIZE / 1024 / 1024} MB`,
    allowedTypes: ALLOWED_TYPES,
  })
}
