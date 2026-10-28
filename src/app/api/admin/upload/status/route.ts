import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth/guards"
import {
  isFirebaseStorageConfigured,
  isR2Configured,
  getActiveStorageType,
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
} from "@/lib/storage/adapter"

/**
 * GET /api/admin/upload/status — info storage configuration
 *
 * Berguna untuk debugging: tahu storage apa yang aktif (local/firebase/r2)
 * dan apakah cloud storage sudah dikonfigurasi atau belum.
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error

  return NextResponse.json({
    storageType: getActiveStorageType(),
    r2Configured: isR2Configured(),
    r2BucketName: process.env.R2_BUCKET_NAME || null,
    r2PublicUrl: process.env.R2_PUBLIC_URL || null,
    firebaseConfigured: isFirebaseStorageConfigured(),
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || null,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || null,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeLabel: `${MAX_FILE_SIZE / 1024 / 1024} MB`,
    allowedTypes: ALLOWED_TYPES,
  })
}
