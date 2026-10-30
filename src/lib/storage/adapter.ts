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
  type: "local" | "r2" | "supabase"
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
 * Detect apakah Firebase Storage dikonfigurasi (legacy — sudah deprecated)
 * Tetap di-keep untuk backward compatibility dengan env vars lama, tapi
 * adapter Firebase Storage sudah dihapus. Akan return false di production.
 * Untuk storage baru, pakai Supabase Storage (auto-detect) atau Cloudflare R2.
 */
export function isFirebaseStorageConfigured(): boolean {
  // Always false — Firebase Storage adapter sudah dihapus
  // Fallback ke Supabase Storage (yang sudah include di Supabase project)
  return false
}

/**
 * Get storage type yang aktif (sync — for display purposes)
 */
export function getActiveStorageType(): "local" | "r2" | "supabase" {
  if (isR2Configured()) return "r2"
  if (isSupabaseStorageConfigured()) return "supabase"
  return "local"
}

/**
 * Get storage adapter berdasarkan env config (auto-detect)
 * Priority: R2 > Supabase > Local
 */
export async function getStorageAdapter(): Promise<StorageAdapter> {
  // 1. Cloudflare R2 (preferred for production — cheapest at scale)
  if (isR2Configured()) {
    const { getR2StorageAdapter } = await import("./r2-adapter")
    return await getR2StorageAdapter()
  }

  // 2. Supabase Storage (default — included with Supabase project, free 1GB)
  if (isSupabaseStorageConfigured()) {
    return await getSupabaseStorageAdapter()
  }

  // 3. Local storage (dev fallback — saves to public/uploads/)
  return getLocalStorageAdapter()
}

/**
 * Detect apakah Supabase Storage dikonfigurasi (URL + anon key + service role).
 * Supabase project sudah include 1GB Storage free — paling praktis untuk MVP.
 */
function isSupabaseStorageConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * Supabase Storage Adapter — pakai service_role key (server-only, bypass RLS)
 *
 * Bucket: 'sim-madin-uploads' (auto-created kalau belum ada — first upload)
 * Public read URLs: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
 */
async function getSupabaseStorageAdapter(): Promise<StorageAdapter> {
  const { createClient } = await import("@supabase/supabase-js")
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const BUCKET = "sim-madin-uploads"

  // Ensure bucket exists (idempotent — first call creates, subsequent calls no-op)
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find((b) => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, {
        public: true, // allow public read (untuk img src embedding)
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
      })
      console.log(`[storage] Created Supabase bucket: ${BUCKET}`)
    }
  } catch (e) {
    console.warn(`[storage] Bucket setup skipped (may already exist):`, (e as any).message)
  }

  return {
    type: "supabase",

    async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
      const ext = path.extname(options.filename).toLowerCase() || ""
      const safePrefix = (options.prefix || "uploads").replace(/[^a-zA-Z0-9-_/]/g, "")
      const filename = `${safePrefix}/${Date.now()}-${randomBytes(8).toString("hex")}${ext}`

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, file, {
          contentType: options.contentType,
          upsert: false,
        })

      if (error) {
        throw new Error(`Supabase Storage upload failed: ${error.message}`)
      }

      // Public URL — Supabase Storage auto-generate ini untuk public bucket
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filename)

      return {
        url: publicUrlData.publicUrl,
        filename: options.filename, // original filename (display)
        size: file.length,
        contentType: options.contentType,
        storagePath: filename, // path di bucket (untuk delete nanti)
      }
    },

    async delete(url: string): Promise<void> {
      // Extract path dari public URL:
      // https://[ref].supabase.co/storage/v1/object/public/[bucket]/[path]
      const publicPrefix = `/storage/v1/object/public/${BUCKET}/`
      const idx = url.indexOf(publicPrefix)
      if (idx < 0) {
        console.warn(`[storage:supabase] Cannot extract path from URL: ${url}`)
        return
      }
      const filePath = decodeURIComponent(url.slice(idx + publicPrefix.length))

      const { error } = await supabase.storage.from(BUCKET).remove([filePath])
      if (error) {
        console.error(`[storage:supabase] Delete failed:`, error.message)
      }
    },

    async getSignedUrl(url: string, expiresIn = 3600): Promise<string> {
      // For public buckets, URL itself is the public URL — no signing needed.
      // This method exists for API compat dengan R2 adapter.
      return url
    },
  }
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
 * Validasi file (type + size) — client-supplied MIME + server-side magic-number
 *
 * Security:
 *   `file.type` comes from the HTTP Content-Type header set by the browser,
 *   which can be trivially spoofed. We cross-check against the actual file
 *   content's magic number (first 16 bytes) for the most common image/PDF
 *   types used in this app.
 */
export function validateFile(
  file: { type: string; size: number },
  // Optional buffer of the file's first bytes — when provided, we do a
  // stricter magic-number check. Pass `Buffer` from `file.arrayBuffer()`.
  fileHead?: Buffer,
): { valid: boolean; error?: string } {
  // 1. Client-claimed MIME check (fast-fail)
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipe file tidak didukung. Hanya: ${ALLOWED_TYPES.join(", ")}`,
    }
  }
  // 2. Size check
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Ukuran file melebihi ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB`,
    }
  }
  // 3. Server-side magic-number check (when buffer is provided)
  if (fileHead && fileHead.length >= 4) {
    const detected = detectMimeFromMagicBytes(fileHead)
    if (detected && detected !== file.type) {
      // Detected MIME differs from claimed — reject (likely spoofing)
      return {
        valid: false,
        error: `Tipe file tidak cocok dengan konten (deteksi: ${detected}). Upload ditolak.`,
      }
    }
    if (!detected && STRICT_MAGIC_CHECK) {
      // Unknown magic number — reject in strict mode (paranoid)
      return {
        valid: false,
        error: "Format file tidak dikenali. Upload ditolak.",
      }
    }
  }
  return { valid: true }
}

/**
 * Strict mode: if true, reject files whose magic number doesn't match any
 * known signature (even if MIME is allowed). Set to false to allow unknown
 * binary types (less safe, useful during migration).
 */
const STRICT_MAGIC_CHECK = process.env.STORAGE_STRICT_MAGIC !== "false"

/**
 * Detect MIME type from file's magic bytes (first 16 bytes).
 * Returns `undefined` if no signature matches.
 *
 * Supported: JPEG, PNG, GIF, WebP, PDF, MP4 audio/video (common types in this app).
 * Reference: https://en.wikipedia.org/wiki/List_of_file_signatures
 */
function detectMimeFromMagicBytes(buf: Buffer): string | undefined {
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png"
  // GIF: 47 49 46 38 (37 a / 39 a for versions)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
      (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) return "image/gif"
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp"
  // PDF: 25 50 44 46 (%PDF)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf"
  // MP4: ....ftyp
  if (
    buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70 &&
    (buf[8] === 0x69 || buf[8] === 0x6d || buf[8] === 0x6d) // iso/mp4/...
  ) return "video/mp4"
  return undefined
}

export { MAX_FILE_SIZE, ALLOWED_TYPES }
