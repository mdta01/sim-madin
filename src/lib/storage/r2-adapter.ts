/**
 * ============================================================================
 * CLOUDFLARE R2 STORAGE ADAPTER
 * ============================================================================
 * Cloudflare R2 adalah object storage yang S3-compatible, free 10GB + no egress fees.
 * Alternatif gratis terbaik untuk Cloudinary / Firebase Storage.
 *
 * Setup:
 * 1. Buat Cloudflare account → R2 → Enable
 * 2. Create bucket (mis. "madrasah-madin-uploads")
 * 3. Create API token: R2 → Manage R2 API Tokens → Create API Token
 *    - Permissions: Object Read & Write
 *    - Specify bucket atau All buckets
 * 4. Set env vars:
 *    R2_ACCOUNT_ID=xxx (di Cloudflare dashboard kanan atas)
 *    R2_ACCESS_KEY_ID=xxx
 *    R2_SECRET_ACCESS_KEY=xxx
 *    R2_BUCKET_NAME=madrasah-madin-uploads
 *    R2_PUBLIC_URL=https://pub-xxx.r2.dev (atau custom domain via Cloudflare CDN)
 *
 * Kelebihan R2 vs Cloudinary:
 * - 10GB free vs Cloudinary 25GB (tapi Cloudinary transform image, R2 pure storage)
 * - NO egress fees (download gratis unlimited)
 * - S3-compatible (bisa pakai tool S3 yang sudah ada)
 * - Bisa diakses via custom domain Cloudflare (CDN gratis)
 * ============================================================================
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type { StorageAdapter, UploadOptions, UploadResult } from "./adapter"
import { randomBytes } from "crypto"

let cachedR2Adapter: StorageAdapter | null = null

/**
 * Detect apakah Cloudflare R2 dikonfigurasi
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
 * Buat R2 S3 client (Cloudflare R2 pakai S3 API)
 */
function createR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

/**
 * Get R2 storage adapter
 */
export async function getR2StorageAdapter(): Promise<StorageAdapter> {
  if (cachedR2Adapter) return cachedR2Adapter

  const client = createR2Client()
  const bucket = process.env.R2_BUCKET_NAME!
  const publicUrl = process.env.R2_PUBLIC_URL // optional, untuk public access

  cachedR2Adapter = {
    type: "r2",

    async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
      const ext = options.filename.split(".").pop() || "bin"
      const prefix = options.prefix || "file"
      const randomStr = randomBytes(4).toString("hex")
      const filename = `${prefix}-${Date.now()}-${randomStr}.${ext}`
      const storagePath = `uploads/${filename}`

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storagePath,
          Body: file,
          ContentType: options.contentType,
          Metadata: options.metadata,
        }),
      )

      // Jika public URL di-set, pakai itu. Jika tidak, pakai R2 dev URL atau signed URL
      let url: string
      if (publicUrl) {
        url = `${publicUrl}/${storagePath}`
      } else {
        // Fallback: pakai signed URL (valid 1 jam)
        url = await getSignedUrl(
          client,
          new GetObjectCommand({ Bucket: bucket, Key: storagePath }),
          { expiresIn: 3600 },
        )
      }

      return {
        url,
        filename,
        size: file.length,
        contentType: options.contentType,
        storagePath,
      }
    },

    async delete(url: string): Promise<void> {
      // Parse storage path dari URL
      // Untuk public URL: https://pub-xxx.r2.dev/uploads/file-xxx.png
      // Untuk signed URL: https://xxx.r2.cloudflarestorage.com/uploads/file-xxx.png?X-Amz-...
      let storagePath: string | null = null
      if (url.includes("/uploads/")) {
        const match = url.match(/\/uploads\/(.+?)(\?|$)/)
        if (match) storagePath = `uploads/${match[1]}`
      }

      if (storagePath) {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: storagePath,
          }),
        )
      }
    },

    async getSignedUrl(url: string, expiresIn = 3600): Promise<string> {
      // Jika URL sudah public, return apa adanya
      if (publicUrl && url.startsWith(publicUrl)) return url

      // Parse storage path dari URL
      let storagePath: string | null = null
      if (url.includes("/uploads/")) {
        const match = url.match(/\/uploads\/(.+?)(\?|$)/)
        if (match) storagePath = `uploads/${match[1]}`
      }

      if (storagePath) {
        return await getSignedUrl(
          client,
          new GetObjectCommand({ Bucket: bucket, Key: storagePath }),
          { expiresIn },
        )
      }
      return url
    },
  }

  return cachedR2Adapter
}
