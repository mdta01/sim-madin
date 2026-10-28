/**
 * ============================================================================
 * STORAGE ADAPTER — SIM MADIN
 * ============================================================================
 * Pattern: graceful fallback dengan 3 mode.
 *
 * Priority (auto-detect via env vars):
 * 1. Cloudflare R2 (preferred for production) — jika R2_* di-set
 * 2. Firebase Storage — jika FIREBASE_STORAGE_BUCKET di-set
 * 3. Local storage (dev fallback) — save ke public/uploads/
 *
 * Penggunaan di API route:
 *   const { url, filename } = await uploadFile(file, { prefix: "santri" })
 * ============================================================================
 */

import { writeFile, mkdir, unlink } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { randomBytes } from "crypto"

export interface StorageAdapter {
  type: "local" | "firebase" | "r2"
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>
  delete(url: string): Promise<void>
  getSignedUrl?(url: string, expiresIn?: number): Promise<string>
}

export interface UploadOptions {
  filename: string
  contentType: string
  prefix?: string
  metadata?: Record<string, string>
}

export interface UploadResult {
  url: string
  filename: string
  size: number
  contentType: string
  storagePath?: string
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads")
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]

/**
 * Detect apakah Cloudflare R2 dikonfigurasi (preferred production storage)
 */
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  )
}

/**
 * Detect apakah Firebase Storage dikonfigurasi
 */
export function isFirebaseStorageConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_STORAGE_BUCKET &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
}

/**
 * Get storage type yang aktif
 */
export function getActiveStorageType(): "local" | "firebase" | "r2" {
  if (isR2Configured()) return "r2"
  if (isFirebaseStorageConfigured()) return "firebase"
  return "local"
}

/**
 * Get storage adapter berdasarkan env config (auto-detect)
 * Priority: R2 > Firebase > Local
 */
export async function getStorageAdapter(): Promise<StorageAdapter> {
  // 1. Cloudflare R2 (preferred for production)
  if (isR2Configured()) {
    const { getR2StorageAdapter } = await import("./r2-adapter")
    return await getR2StorageAdapter()
  }

  // 2. Firebase Storage (legacy/alternative)
  if (isFirebaseStorageConfigured()) {
    return await getFirebaseStorageAdapter()
  }

  // 3. Local storage (dev fallback)
  return getLocalStorageAdapter()
}

/**
 * Local Storage Adapter (dev mode)
 */
function getLocalStorageAdapter(): StorageAdapter {
  return {
    type: "local",

    async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
      // Ensure directory exists
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true })
      }

      // Generate unique filename
      const ext = options.filename.split(".").pop() || "bin"
      const prefix = options.prefix || "file"
      const randomStr = randomBytes(4).toString("hex")
      const filename = `${prefix}-${Date.now()}-${randomStr}.${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)

      await writeFile(filepath, file)

      return {
        url: `/uploads/${filename}`,
        filename,
        size: file.length,
        contentType: options.contentType,
        storagePath: filepath,
      }
    },

    async delete(url: string): Promise<void> {
      if (url.startsWith("/uploads/")) {
        const filepath = path.join(process.cwd(), "public", url)
        if (existsSync(filepath)) {
          await unlink(filepath)
        }
      }
    },
  }
}

/**
 * Firebase Storage Adapter (production mode)
 * Lazy load agar tidak crash di dev mode tanpa firebase-admin
 */
async function getFirebaseStorageAdapter(): Promise<StorageAdapter> {
  try {
    const admin = await import("firebase-admin")
    const bucket = admin.storage().bucket()

    return {
      type: "firebase",

      async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
        const ext = options.filename.split(".").pop() || "bin"
        const prefix = options.prefix || "file"
        const randomStr = randomBytes(4).toString("hex")
        const filename = `${prefix}-${Date.now()}-${randomStr}.${ext}`
        const storagePath = `uploads/${filename}`

        const fileRef = bucket.file(storagePath)
        await fileRef.save(file, {
          metadata: {
            contentType: options.contentType,
            metadata: options.metadata,
          },
        })

        // Make public (or use signed URL)
        await fileRef.makePublic()

        const publicUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${storagePath}`

        return {
          url: publicUrl,
          filename,
          size: file.length,
          contentType: options.contentType,
          storagePath,
        }
      },

      async delete(url: string): Promise<void> {
        // Parse storage path from URL
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET
        if (url.includes(bucketName || "")) {
          const storagePath = url.split(`${bucketName}/`)[1]
          if (storagePath) {
            await bucket.file(storagePath).delete()
          }
        }
      },

      async getSignedUrl(url: string, expiresIn = 3600): Promise<string> {
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET
        if (url.includes(bucketName || "")) {
          const storagePath = url.split(`${bucketName}/`)[1]
          if (storagePath) {
            const [signedUrl] = await bucket.file(storagePath).getSignedUrl({
              action: "read",
              expires: Date.now() + expiresIn * 1000,
            })
            return signedUrl
          }
        }
        return url
      },
    }
  } catch (err) {
    console.warn("[storage] Firebase Storage init failed, fallback to local:", err)
    return getLocalStorageAdapter()
  }
}

/**
 * Validasi file (type + size)
 */
export function validateFile(file: { type: string; size: number }): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipe file tidak didukung. Hanya: ${ALLOWED_TYPES.join(", ")}`,
    }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Ukuran file melebihi ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB`,
    }
  }
  return { valid: true }
}

export { MAX_FILE_SIZE, ALLOWED_TYPES }
