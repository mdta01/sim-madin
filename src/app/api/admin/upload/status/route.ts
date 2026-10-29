import { NextRequest, NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/auth/guards"
import { isFirebaseStorageConfigured, isR2Configured, getActiveStorageType, MAX_FILE_SIZE, ALLOWED_TYPES } from "@/lib/storage/adapter"

export async function GET(req: NextRequest) {
  const guard = await requireApiAuth(req)
  if (guard.error) return guard.error

  return NextResponse.json({
    storageType: getActiveStorageType(),
    r2Configured: isR2Configured(),
    firebaseConfigured: isFirebaseStorageConfigured(),
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeLabel: `${MAX_FILE_SIZE / 1024 / 1024} MB`,
    allowedTypes: ALLOWED_TYPES,
  })
}
