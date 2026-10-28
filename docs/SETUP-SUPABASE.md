# Setup Supabase — SIM MADIN

Panduan step-by-step setup Supabase untuk SIM MADIN. Estimasi waktu: 15-20 menit.

## 📋 Yang Akan Didapat

Setelah setup, Anda punya:
- ✅ Database Postgres (500MB free)
- ✅ Auth (50k MAU free)
- ✅ Storage (1GB free)
- ✅ Realtime (untuk notifikasi, free)

**Total biaya: $0/bulan** untuk skala awal madrasah (< 1000 santri).

---

## 🚀 Langkah 1: Buat Supabase Project

1. Buka https://supabase.com → klik **Start your project**
2. Login dengan GitHub (recommended) atau email
3. Klik **New Project**
4. Isi:
   - **Name**: `madrasah-madin`
   - **Database Password**: generate strong password, simpan di password manager (penting!)
   - **Region**: `Southeast Asia (Singapore)` — terdekat untuk Indonesia
   - **Plan**: Free tier
5. Klik **Create new project**
6. Tunggu provisioning ± 2 menit

---

## 🔑 Langkah 2: Ambil API Credentials

1. Buka project → **Settings** (gear icon kiri bawah) → **API**
2. Di section **Project URL**, copy URL (format: `https://xxx.supabase.co`)
3. Di section **Project API keys**:
   - **anon public**: untuk client-side (amai di-expose)
   - **service_role**: untuk server-side (⚠️ JANGAN commit ke Git!)

---

## 🗄️ Langkah 3: Ambil Database Connection String

1. **Settings** → **Database**
2. Di section **Connection string**, pilih tab **URI**
3. Copy connection string format:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Ganti `[password]` dengan password yang Anda set di Langkah 1
5. (Optional) Untuk migration, copy juga **Direct connection** (port 5432, bukan 6543)

---

## ⚙️ Langkah 4: Update Environment Variables

Edit file `.env` (dev) atau set di Vercel (production):

```bash
# === DATABASE (ganti SQLite ke Supabase Postgres) ===
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# === SUPABASE AUTH & STORAGE ===
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."  # anon public key
SUPABASE_SERVICE_ROLE_KEY="eyJ..."      # service_role key (SERVER-ONLY!)
```

---

## 🔄 Langkah 5: Update Prisma Schema ke Postgres

Edit `prisma/schema.prisma`:

```diff
datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
+  directUrl = env("DIRECT_URL")
}
```

---

## 📤 Langkah 6: Push Schema ke Supabase

```bash
# Generate Prisma client baru
bun run db:generate

# Push schema ke database Supabase
bun run db:push
```

Verifikasi di Supabase Dashboard → **Table Editor**. Anda harus lihat 19 tabel:
- User, Role, Permission, UserRole, RolePermission
- TahunAjaran, Semester, Kelas, MataPelajaran, Jadwal
- Wali, Santri, SantriWali, Guru
- Absensi, Nilai, Rapor
- JenisTagihan, Tagihan, Payment
- Announcement, AuditLog, SystemSetting
- WaliActivation, PhoneChangeLog

---

## 🌱 Langkah 7: Seed Data Awal

```bash
bun run db:seed
```

Verifikasi di Supabase Dashboard → **Table Editor** → tabel `User`, `Role`, `TahunAjaran` harus berisi data demo.

---

## 👤 Langkah 8: Setup User di Supabase Auth (Optional untuk V1.4+)

Saat ini auth masih pakai NextAuth (di database Prisma `User` table). Untuk V1.5+ yang pakai Supabase Auth:

1. Buka **Authentication** → **Users** → **Add user**
2. Tambah user dengan email `admin@madrasah.test`, password `admin123`
3. Auto-confirm user (centang)
4. Repeat untuk role lain: kepala, bendahara, guru, wali

---

## 📦 Langkah 9: Setup Storage Bucket

1. Buka **Storage** (sidebar kiri)
2. Klik **New bucket**
3. Buat 2 bucket:
   - `avatars` (Public) — untuk foto profil santri/guru/wali
   - `documents` (Private) — untuk bukti transfer, dokumen
4. Set RLS policies:
   - `avatars`: allow read to public, write to authenticated users
   - `documents`: allow read/write only to owner

Contoh policy untuk `avatars`:
```sql
-- Allow public read
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated write
CREATE POLICY "Authenticated write access" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
```

---

## ✅ Verifikasi

Test koneksi dengan:

```bash
# Cek apakah env vars ter-set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $DATABASE_URL

# Test endpoint storage status (setelah aplikasi jalan)
curl http://localhost:3000/api/admin/upload/status
# Should return: { storageType: "r2" atau "local", ... }
```

Jika semua sudah ter-setup, Anda bisa:
- ✅ Akses aplikasi di http://localhost:3000
- ✅ Login sebagai admin (admin@madrasah.test / admin123)
- ✅ Lihat dashboard dengan data dari Supabase
- ✅ Upload foto → tersimpan di Supabase Storage atau Cloudflare R2

---

## 🆘 Troubleshooting

### Error: "Can't reach database server"
- Cek region di connection string (`aws-0-ap-southeast-1` untuk Singapore)
- Pastikan password URL-encoded jika ada special chars

### Error: "P1003: Database does not exist"
- Pastikan project Supabase sudah selesai provisioning (status Active)
- Cek connection string URL benar

### Error: "Prisma Client did not initialize"
- Run `bun run db:generate` setelah ubah provider
- Restart dev server: kill PID lalu run `bun run dev`

### Migration dari existing SQLite
Jika sudah ada data di SQLite yang ingin dipindah ke Supabase:
1. Export data SQLite via Prisma Studio (atau script custom)
2. Push schema kosong ke Supabase: `bun run db:push`
3. Import data via Supabase Dashboard → Table Editor → Import CSV
4. Atau pakai script custom di `scripts/migrate-to-supabase.ts` (belum ada, perlu dibuat)

---

## 📚 Bacaan Tambahan

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma + Supabase Guide](https://supabase.com/docs/guides/integrations/prisma)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

---

## ⚠️ Batasan Free Tier

| Resource | Free Limit | Kapan Harus Upgrade |
|----------|-----------|---------------------|
| Database | 500MB | Saat DB > 400MB |
| Auth MAU | 50,000 users | Saat user > 40k |
| Storage | 1GB | Saat storage > 800MB |
| Realtime connections | 200 concurrent | Saat wali mobile apps > 200 active |
| Bandwidth | 5GB/bulan | Saat traffic tinggi |

Upgrade ke Pro ($25/bulan) untuk: 8GB DB, 100GB storage, 100k MAU, daily backups, dan email support.
