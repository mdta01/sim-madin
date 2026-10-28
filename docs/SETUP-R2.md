# Setup Cloudflare R2 — SIM MADIN

Panduan setup Cloudflare R2 sebagai storage alternatif Cloudinary. Estimasi waktu: 10-15 menit.

## 🎯 Kenapa Cloudflare R2?

| Aspek | Cloudinary Free | Cloudflare R2 |
|-------|----------------|----------------|
| Storage | 25GB | **10GB** (sedikit lebih kecil) |
| Bandwidth (egress) | Limited credits | **Unlimited (FREE)** ⭐ |
| Image transformation | ✅ Built-in | ❌ Pure storage |
| Pricing overage | Credit-based | $0.015/GB/bulan |
| Best for | Image-heavy apps | General file storage |

**Rekomendasi:** Untuk SIM MADIN, gunakan R2 karena:
- Egress gratis (foto santri sering di-load wali)
- 10GB cukup untuk awal (foto profil + bukti transfer)
- Bisa pakai custom domain via Cloudflare CDN (gratis)
- Simple: tidak ada transform, cukup upload & serve raw

---

## 📋 Yang Akan Didapat

- ✅ 10GB free storage (cukup untuk ± 50.000 foto profil)
- ✅ No egress fees (download gratis unlimited)
- ✅ S3-compatible (bisa pakai tool S3)
- ✅ Custom domain via Cloudflare (CDN gratis)
- ✅ Bisa diakses dari mobile apps langsung

---

## 🚀 Langkah 1: Buat Cloudflare Account

1. Buka https://dash.cloudflare.com → **Sign up**
2. Isi email + password, verifikasi email
3. Setelah login, di dashboard Cloudflare

---

## 📦 Langkah 2: Enable R2

1. Di sidebar kiri, klik **R2 Object Storage**
2. Klik **Enable R2** (perlu input payment method untuk verifikasi, tapi **tidak akan dikenakan biaya** selama di free tier)
3. Tunggu beberapa detik sampai R2 aktif

---

## 🪣 Langkah 3: Buat Bucket

1. Di R2 dashboard, klik **Create bucket**
2. Isi:
   - **Bucket name**: `madrasah-madin-uploads` (harus lowercase, no spaces)
   - **Location**: Auto (atau pilih region terdekat)
   - **Default class**: Standard
3. Klik **Create**

---

## 🔑 Langkah 4: Buat API Token

1. Di R2 dashboard, klik **Manage R2 API Tokens** (atau **Account Home** → **API Tokens**)
2. Klik **Create API token**
3. Isi:
   - **Token name**: `madrasah-madin-backend`
   - **Permissions**: **Object Read & Write**
   - **Specify bucket**: pilih `madrasah-madin-uploads` (lebih aman dari All buckets)
   - **TTL**: Default (no expiration) atau set 1 tahun
4. Klik **Create API Token**
5. **Copy semua credentials yang ditampilkan** (cumamuncul sekali!):
   - Access Key ID
   - Secret Access Key
   - Endpoint URL (format: `https://[account-id].r2.cloudflarestorage.com`)
   - Account ID (di URL bar)

⚠️ **PENTING:** Simpan credentials ini di password manager. Secret Access Key tidak bisa dilihat lagi.

---

## 🌐 Langkah 5: (Optional) Enable Public Access

Untuk foto profil yang perlu diakses public (wali lihat foto anak):

1. Di bucket detail, klik **Settings**
2. Di section **Public access**, klik **Allow Access**
3. Pilih:
   - **R2.dev subdomain**: `https://pub-[hash].r2.dev` (gratis, tapi rate-limited)
   - **Custom domain** (recommended): pakai domain sendiri via Cloudflare DNS
4. Copy public URL

Untuk custom domain (recommended):
1. Pastikan domain sudah di-add ke Cloudflare (Nameservers point ke Cloudflare)
2. R2 bucket → Settings → Public Access → Custom Domain
3. Add domain: `cdn.madrasah-madin.id` (atau subdomain yang Anda mau)
4. Cloudflare auto-create DNS record

---

## ⚙️ Langkah 6: Set Environment Variables

Edit `.env` atau set di Vercel:

```bash
# === CLOUDFLARE R2 STORAGE ===
R2_ACCOUNT_ID="your-account-id"           # dari URL dashboard / API token
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="madrasah-madin-uploads"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"    # atau https://cdn.your-domain.com
```

---

## ✅ Verifikasi

Setelah set env vars, restart dev server dan test:

```bash
# Restart server
kill $(cat .zscripts/dev.pid)
bun run dev

# Test upload status (login sebagai admin dulu)
curl http://localhost:3000/api/admin/upload/status
# Should return: { storageType: "r2", r2Configured: true, ... }

# Test upload foto via form Santri di UI
# Buka http://localhost:3000 → login → Data Santri → Tambah Santri → upload foto
# Foto harus tersimpan di R2 bucket, URL di DB = R2 public URL
```

Verifikasi di Cloudflare R2 dashboard → bucket → **Objects**. Anda harus lihat folder `uploads/` dengan foto yang baru di-upload.

---

## 🔄 Migrasi dari Local Storage ke R2

Jika sudah ada foto di `public/uploads/` lokal dan ingin pindah ke R2:

```bash
# 1. Aktifkan R2 di env vars (lihat Langkah 6)
# 2. Buat script migrasi
cat > scripts/migrate-to-r2.ts << 'EOF'
import { readdir, readFile } from "fs/promises"
import { join } from "path"
import { getStorageAdapter } from "../src/lib/storage/adapter"

async function main() {
  const localDir = join(process.cwd(), "public", "uploads")
  const files = await readdir(localDir)
  const adapter = await getStorageAdapter()

  for (const file of files) {
    const filepath = join(localDir, file)
    const buffer = await readFile(filepath)
    const result = await adapter.upload(buffer, {
      filename: file,
      contentType: file.endsWith(".jpg") ? "image/jpeg" : "image/png",
      prefix: "migrated",
    })
    console.log(`✓ Migrated ${file} → ${result.url}`)

    // Optional: update DB to point to new URL
    // await db.santri.updateMany({ where: { photoUrl: `/uploads/${file}` }, data: { photoUrl: result.url } })
  }
}

main().then(() => console.log("Migration complete"))
EOF

bun run scripts/migrate-to-r2.ts
```

---

## 🆘 Troubleshooting

### Error: "The request signature we calculated does not match"
- Pastikan `R2_SECRET_ACCESS_KEY` benar (tidak ada whitespace saat copy)
- Pastikan `R2_ACCOUNT_ID` benar (bukan bucket name, tapi account ID)

### Error: "Access Denied" saat upload
- Cek API token permissions: harus **Object Read & Write**
- Cek bucket scope: token harus specify bucket yang benar

### Foto tidak muncul di app
- Cek `R2_PUBLIC_URL` sudah di-set
- Cek bucket sudah di-enable public access
- Test URL langsung di browser

### Rate limit di R2.dev subdomain
- R2.dev subdomain punya rate limit (untuk dev, bukan production)
- Untuk production: pakai custom domain via Cloudflare (gratis, unlimited)

---

## 📊 Estimasi Penggunaan Storage

| Tipe File | Avg Size | Free 10GB = ? files |
|-----------|----------|---------------------|
| Foto profil santri | 100-500KB | 20.000 - 100.000 foto |
| Bukti transfer | 500KB-2MB | 5.000 - 20.000 bukti |
| Dokumen PDF | 1-5MB | 2.000 - 10.000 dokumen |

**Strategi:**
- Foto profil → R2 (frequent access)
- Bukti transfer → R2 (after verified, bisa di-delete untuk hemat space)
- Dokumen besar → R2 (lifecycle policy: auto-delete setelah X bulan)

---

## 💡 Tips Optimasi

1. **Compress image sebelum upload** (pakai sharp library)
   ```typescript
   import sharp from "sharp"
   const optimized = await sharp(file).resize(800).jpeg({ quality: 80 }).toBuffer()
   ```
   Hemat storage sampai 80%.

2. **Lifecycle policy** — auto-delete file lama yang tidak diakses
   - R2 dashboard → bucket → Settings → Lifecycle
   - Misal: delete bukti transfer > 1 tahun

3. **Cache control** — set cache header untuk foto profil
   ```typescript
   await client.send(new PutObjectCommand({
     Bucket, Key, Body, ContentType,
     CacheControl: "max-age=31536000", // 1 tahun
   }))
   ```

---

## 📚 Bacaan Tambahan

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 S3 Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/)
- [Cloudflare Workers + R2](https://developers.cloudflare.com/r2/examples/workers/)
