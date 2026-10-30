# Migrasi Supabase — Panduan Lengkap

> Panduan untuk menyelesaikan migrasi dari NextAuth + SQLite/Firebase ke Supabase (Auth + Postgres + Storage + Realtime).

---

## TL;DR — Checklist Migrasi

- [ ] Setup Supabase project (free tier)
- [ ] Set env vars di Vercel & `.env` local
- [ ] Run Prisma migration ke Supabase Postgres
- [ ] Run seed script (yang sekarang auto-create user di Supabase Auth)
- [ ] Create Storage bucket `sim-madin-uploads` di Supabase dashboard
- [ ] Deploy ke Vercel & verify

---

## 📋 Status Migrasi Saat Ini

| Area | Status | Keterangan |
|------|--------|-----------|
| **Auth UI** | ✅ Done | `login-overlay.tsx` pakai `supabase.auth.signInWithPassword` |
| **Auth Guard (server)** | ✅ Done | `getSession()` prioritas Supabase Bearer token |
| **Auth Guard (fallback)** | ⚠️ Removed | NextAuth fallback dihapus (commit ini) |
| **NextAuth remnants** | ⚠️ Removed | `auth-options.ts`, `[...nextauth]`, `auth-provider.tsx`, `next-auth.d.ts` dihapus |
| **Database schema** | ✅ Ready | `prisma/schema.prisma` provider=postgresql, ada field `supabaseUid` |
| **Storage adapter** | ✅ Done | `src/lib/storage/adapter.ts` auto-detect Supabase (gunakan service_role) |
| **Mobile apps** | ✅ Done | `packages/mobile-shared` pakai `EXPO_PUBLIC_SUPABASE_URL` |
| **Vercel env** | ❌ TODO | User harus set env vars di Vercel dashboard manual |
| **DB migration** | ❌ TODO | `prisma/migrations/` masih kosong — jalankan `prisma migrate dev` |

---

## 🚀 Langkah 1: Setup Supabase Project

### 1.1 Buat Project
1. Buka https://supabase.com → **Start your project**
2. Login dengan GitHub (recommended)
3. Klik **New Project**
4. Isi:
   - **Name**: `madrasah-madin` (atau nama madrasah Anda)
   - **Database Password**: generate strong password, simpan di password manager!
   - **Region**: `Southeast Asia (Singapore)` — terdekat untuk Indonesia
   - **Plan**: Free tier (500MB DB, 50k MAU Auth, 1GB Storage)
5. Klik **Create new project**, tunggu ± 2 menit

### 1.2 Dapatkan API Keys
Buka **Project Settings → API**, copy:
- `Project URL`: `https://YOUR-PROJECT-REF.supabase.co`
- `anon public` key: untuk client-side (NEXT_PUBLIC_)
- `service_role` key: untuk server-side (NEVER expose!)

### 1.3 Dapatkan Database URLs
Buka **Project Settings → Database → Connection string**, copy:
- **Connection pooling** (port 6543) → `DATABASE_URL`
- **Direct connection** (port 5432) → `DIRECT_URL`

Format lengkap dengan `?pgbouncer=true&connection_limit=1` di akhir DATABASE_URL.

---

## 🔧 Langkah 2: Set Environment Variables

### 2.1 Local Development
Edit `.env` (sudah ada template, isi nilai sesuai project Anda):

```bash
# Wajib
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database — ganti dari SQLite ke Postgres
DATABASE_URL=postgresql://postgres.YOUR-REF:PASSWORD@aws-0-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.YOUR-REF:PASSWORD@aws-0-southeast-1.supabase.com:5432/postgres
```

### 2.2 Vercel Production
Buka **Vercel Dashboard → Project → Settings → Environment Variables**, add:

| Key | Value | Environments |
|-----|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service_role key) | Production, Preview (NOT Development) |
| `DATABASE_URL` | `postgresql://...pooler...:6543/...?pgbouncer=true&connection_limit=1` | Production, Preview, Development |
| `DIRECT_URL` | `postgresql://...:5432/...` | Production, Preview, Development |
| `STORAGE_STRICT_MAGIC` | `true` | Production |

**Penting**: Jangan commit `.env` ke Git. File `.env.example` sudah ada sebagai template.

---

## 🗄️ Langkah 3: Database Migration

### 3.1 Generate Migration Files
Setelah `.env` di-update ke Postgres, jalankan:

```bash
# Buat migration pertama dari schema.prisma
npx prisma migrate dev --name init_supabase

# Ini akan:
# 1. Connect ke Supabase Postgres (DATABASE_URL)
# 2. Buat semua tabel sesuai prisma/schema.prisma
# 3. Generate file di prisma/migrations/YYYYMMDD_init_supabase/
# 4. Apply ke database
```

### 3.2 Seed Database
```bash
# Seed admin user + role + permission + demo data
# Script sekarang otomatis create user di Supabase Auth juga
npx tsx scripts/seed.ts
```

Output yang diharapkan:
```
✅ Created 1 SUPER_ADMIN role with all permissions
✅ Created user in Supabase Auth: admin@madrasah.test
✅ Linked Supabase Auth user → Prisma User record
✅ Created demo santri, kelas, mapel, guru
```

### 3.3 Verify di Supabase Dashboard
- **Table Editor**: harus ada semua tabel (User, Role, Permission, Santri, Guru, dst.)
- **Authentication → Users**: harus ada `admin@madrasah.test`

---

## 📦 Langkah 4: Storage Setup

### 4.1 Create Storage Bucket
Buka **Supabase Dashboard → Storage**, klik **New bucket**:
- **Name**: `sim-madin-uploads`
- **Public**: ✅ (untuk gambar/foto yang harus bisa di-link ke img src)
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp, application/pdf`

### 4.2 Storage Policies
Set bucket policies (atau biarkan public read, write via service_role):

```sql
-- Public read (untuk gambar yang bisa di-embed)
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'sim-madin-uploads');

-- Authenticated write (admin & guru bisa upload)
CREATE POLICY "Authenticated write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sim-madin-uploads' AND
    auth.role() = 'authenticated'
  );
```

### 4.3 Auto-detect Storage
Storage adapter di `src/lib/storage/adapter.ts` akan auto-detect:
1. **Cloudflare R2** (jika `R2_*` env di-set) — untuk production dengan biaya rendah
2. **Supabase Storage** (jika `SUPABASE_SERVICE_ROLE_KEY` di-set) — default, free 1GB
3. **Local filesystem** (fallback untuk dev tanpa konfigurasi)

---

## 🔐 Langkah 5: Cleanup NextAuth (Sudah Dilakukan)

Pada commit ini, file-file NextAuth berikut sudah dihapus:
- `src/lib/auth/auth-options.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/components/auth/auth-provider.tsx`
- `src/types/next-auth.d.ts`

Yang masih ada (untuk backward compatibility dengan mobile apps lama):
- `next-auth` package masih di `package.json` — akan di-uninstall di iterasi berikutnya

Auth guard di `src/lib/auth/guards.ts` sekarang **Supabase-only**:
- Bearer token → verify via Supabase Auth API
- Tidak ada lagi NextAuth session fallback

---

## 🚀 Langkah 6: Deploy ke Vercel

### 6.1 Push ke GitHub
```bash
git add -A && git commit -m "feat: complete Supabase migration" && git push origin main
```

### 6.2 Trigger Vercel Build
Vercel auto-deploy dari `main` branch. Build akan:
1. Run `npx prisma generate` (generate Prisma Client dari schema)
2. Run `next build` (compile TypeScript + bundle)

### 6.3 Verify Production
Setelah deploy sukses:
1. Buka production URL (mis. `https://sim-madin.vercel.app`)
2. Login dengan `admin@madrasah.test` / `admin123` (dari seed)
3. Cek semua modul (santri, kelas, guru, tagihan, dst.) apakah data tampil
4. Cek upload foto santri — harus tersimpan di Supabase Storage

### 6.4 Run Migration di Production (kalau perlu)
Jika schema berubah setelah deploy pertama:
```bash
# Connect ke production database via DATABASE_URL
npx prisma migrate deploy
```

---

## 🐛 Troubleshooting

### Error: `PrismaClientInitializationError: Database connection error`
- Cek `DATABASE_URL` dan `DIRECT_URL` benar
- Pastikan password DB benar (cek di Supabase Dashboard)
- Pastikan IP Vercel tidak di-block (Supabase default allow all, tapi cek Settings → Database → Network restrictions)

### Error: `Invalid API key` saat login
- Cek `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di Vercel env vars
- Pastikan env vars ter-set untuk environment yang benar (Production, Preview, Development)

### Error: `User not found in DB` setelah login Supabase
- User sukses login di Supabase Auth, tapi tidak ada record di tabel `User` Prisma
- Jalankan `seed.ts` untuk create user admin
- Untuk user lain: link manual via SQL:
  ```sql
  INSERT INTO "User" (id, email, name, "isActive", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'user@example.com', 'Nama User', true, NOW(), NOW());
  ```

### Error: Storage upload failed
- Cek bucket `sim-madin-uploads` sudah di-create di Supabase
- Cek `SUPABASE_SERVICE_ROLE_KEY` benar (bukan anon key)
- Cek MIME type di-allow di bucket settings

### Error: `Cannot find module 'next-auth'`
- Berarti ada file yang masih import `next-auth` — cek `grep -rn "next-auth" src/`
- File NextAuth sudah dihapus, tinggal uninstall package:
  ```bash
  npm uninstall next-auth
  ```

---

## 📚 Referensi

- [Supabase Docs](https://supabase.com/docs)
- [Prisma + Supabase](https://supabase.com/docs/guides/integrations/prisma)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
