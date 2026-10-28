# Panduan Deployment — SIM MADIN ke Production

Dokumen ini menjelaskan langkah-langkah migrasi dari **dev (SQLite + NextAuth + local storage)** ke **production (Supabase Postgres + Firebase Auth + Firebase Storage)**.

## 📋 Prasyarat

- Akun [Supabase](https://supabase.com) (free tier OK untuk awal)
- Akun [Firebase Console](https://console.firebase.google.com)
- Akun [Vercel](https://vercel.com) atau platform Node.js hosting lain
- Domain (opsional untuk awal, bisa pakai subdomain Vercel)

---

## 🚀 Langkah 1: Setup Supabase (Database)

### 1.1 Buat Project Baru
1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Klik **New Project**
3. Isi:
   - **Name**: `madrasah-madin`
   - **Database Password**: generate strong password, simpan di password manager
   - **Region**: pilih yang terdekat (Singapore untuk Indonesia)
   - **Plan**: Free tier OK untuk awal
4. Tunggu provisioning (~2 menit)

### 1.2 Ambil Connection String
1. Buka project → **Settings** (gear icon) → **Database**
2. Di section **Connection string**, pilih **URI**
3. Copy connection string (format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)
4. Ganti `[password]` dengan password yang Anda set di langkah 1.1

### 1.3 Update Prisma Schema
Edit `prisma/schema.prisma`:

```diff
datasource db {
- provider = "sqlite"
+ provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 1.4 Set Environment Variables
Di file `.env` (atau `.env.production` atau Vercel env vars):

```bash
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

> **Note**: `DIRECT_URL` diperlukan untuk Prisma migrate (connection direct, bukan pooler).

### 1.5 Push Schema ke Supabase
```bash
bun run db:push
```
Tunggu sampai semua tabel terbuat. Verifikasi di Supabase Dashboard → **Table Editor**.

### 1.6 Seed Data Awal
```bash
bun run db:seed
```
Cek di Supabase Dashboard — tabel `User`, `Role`, `TahunAjaran`, dll harus berisi data demo.

### 1.7 (Optional) Backup Strategy
- Supabase free tier: backup otomatis harian, retained 7 hari
- Untuk produksi: pertimbangkan upgrade ke Pro plan ($25/bulan) untuk backup 30 hari + point-in-time recovery

---

## 🔥 Langkah 2: Setup Firebase (Auth + Storage)

### 2.1 Buat Firebase Project
1. Buka [Firebase Console](https://console.firebase.google.com)
2. **Add Project** → nama: `madrasah-madin`
3. Disable Google Analytics (tidak perlu untuk MVP)
4. Tunggu provisioning

### 2.2 Enable Authentication
1. Di sidebar kiri → **Build** → **Authentication**
2. Klik **Get Started**
3. Di tab **Sign-in method**, enable:
   - **Email/Password** (untuk admin login via web)
   - **Phone** (optional, untuk mobile OTP)
4. Di tab **Users**, tambah user manual untuk testing (admin@madrasah.test, dst)

### 2.3 Setup Service Account (server-side)
1. Project Settings (gear icon) → **Service accounts** tab
2. Klik **Generate new private key** → download JSON file
3. **Simpan JSON ini dengan aman** — jangan commit ke Git
4. Buka JSON file, ambil values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (jangan lupa escape `\n` jadi literal)

### 2.4 Enable Storage
1. Sidebar → **Build** → **Storage** → **Get Started**
2. Pilih mode: **Start in production mode**
3. Pilih region yang sama dengan database Supabase
4. Update **Rules** (tab Rules):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{allPaths=**} {
      allow read: if true;  // public read (foto santri bisa dilihat wali)
      allow write: if request.auth != null;  // harus login untuk upload
    }
  }
}
```

5. Ambil **Storage bucket URL** dari Storage → Files → tab di kanan atas, format: `madrasah-madin.appspot.com`

### 2.5 Install Firebase Admin SDK
```bash
bun add firebase-admin
```

### 2.6 Set Environment Variables
Tambah ke `.env` atau Vercel env vars:

```bash
FIREBASE_PROJECT_ID="madrasah-madin"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@madrasah-madin.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET="madrasah-madin.appspot.com"
```

### 2.7 Verifikasi
Buka aplikasi, login sebagai admin, upload foto profil santri. Cek:
- File muncul di Firebase Storage → Files → `uploads/` folder
- URL yang disimpan di DB schema `Santri.photoUrl` formatnya: `https://storage.googleapis.com/madrasah-madin.appspot.com/uploads/...`

---

## 🌐 Langkah 3: Deploy ke Vercel

### 3.1 Persiapan Repository
```bash
# Pastikan .env.local tidak di-commit
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# Commit perubahan
git add .
git commit -m "feat: production-ready (Supabase + Firebase)"
git push origin main
```

### 3.2 Setup Vercel Project
1. Buka [vercel.com](https://vercel.com) → Login dengan GitHub
2. **Add New Project** → import repository Anda
3. Framework preset: **Next.js** (auto-detected)
4. Root Directory: `./` (atau `apps/super-admin` kalau sudah migrasi ke Nx)
5. Build Command: `next build` (auto)
6. Output Directory: `.next` (auto)

### 3.3 Set Environment Variables di Vercel
Di Vercel project settings → **Environment Variables**, tambah semua dari `.env.production`:

| Key | Value | Environment |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://...supabase.com...` | All |
| `DIRECT_URL` | `postgresql://...supabase.com:5432/...` | All |
| `NEXTAUTH_SECRET` | `[generate baru: openssl rand -base64 32]` | All |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production |
| `FIREBASE_PROJECT_ID` | `madrasah-madin` | All |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@...` | All |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | All |
| `FIREBASE_STORAGE_BUCKET` | `madrasah-madin.appspot.com` | All |

> **Note**: Untuk `FIREBASE_PRIVATE_KEY`, paste isi `\n` literal. Vercel akan handle escape.

### 3.4 Deploy
1. Klik **Deploy**
2. Tunggu build (~2-3 menit)
3. Test URL production: `https://your-project.vercel.app`
4. Login dengan `admin@madrasah.test` / `admin123`
5. Verifikasi: dashboard load, dapat upload foto, audit log tercatat

### 3.5 (Optional) Custom Domain
1. Vercel project → **Settings** → **Domains**
2. Add domain: `super-admin.madin.sch.id`
3. Setup DNS record di domain provider (CNAME ke `cname.vercel-dns.com`)
4. Update `NEXTAUTH_URL` env var ke domain baru
5. Redeploy

---

## 📱 Langkah 4: Setup Mobile Apps (Roadmap)

Setelah backend stabil di production, lanjut setup mobile apps:

### 4.1 Buat Expo Project
```bash
mkdir apps/mobile-guru && cd apps/mobile-guru
npx create-expo-app@latest . --template blank-typescript
```

### 4.2 Install Dependencies
```bash
npx expo install firebase
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store
```

### 4.3 Setup Firebase Client SDK
Buat `src/lib/firebase.ts`:

```typescript
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const storage = getStorage(app)
```

### 4.4 Login Flow Mobile
```typescript
import { signInWithEmailAndPassword } from "firebase/auth"

const login = async (email: string, password: string) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  const token = await user.getIdToken()
  // Kirim token ke API: Authorization: Bearer <token>
  // Server akan verify via Firebase Admin SDK (sudah di-setup)
}
```

### 4.5 Build APK / IPA
```bash
# Android
eas build --platform android --profile preview

# iOS (perlu Apple Developer account)
eas build --platform ios --profile preview
```

---

## 🔒 Security Checklist Production

Sebelum go-live, pastikan:

- [ ] **Password policy** diperketat (min 8 karakter, kombinasi huruf+angka+simbol)
- [ ] **Rate limiting** untuk login (max 5 attempt per menit per IP)
- [ ] **HTTPS only** (Vercel default sudah)
- [ ] **CORS** di-set hanya untuk domain yang diizinkan
- [ ] **Database backup** otomatis aktif (Supabase Pro recommended)
- [ ] **Audit log retention** policy (mis. keep 90 hari, archive setelahnya)
- [ ] **Environment variables** tidak di-commit ke Git (cek `.gitignore`)
- [ ] **Firebase Security Rules** untuk Storage sudah restriktif
- [ ] **CSRF protection** (NextAuth sudah handle)
- [ ] **XSS protection** (React sudah handle by default, jangan `dangerouslySetInnerHTML` tanpa sanitasi)
- [ ] **SQL Injection** (Prisma parameterized queries sudah handle)
- [ ] **API rate limit** untuk endpoint sensitif (login, upload, delete)

---

## 🆘 Troubleshooting

### Database connection error (Supabase)
- Cek `DATABASE_URL` format: `postgresql://` bukan `postgres://`
- Cek IPv6 vs IPv4 — Supabase pooler pakai IPv6, beberapa provider block
- Coba `DIRECT_URL` dengan port 5432 (direct) bukan 6543 (pooler)

### Firebase Admin SDK error
- Pastikan `FIREBASE_PRIVATE_KEY` benar — escape `\n` jadi literal
- Verifikasi Service Account email di Firebase Console → Authentication → Users
- Cek apakah project ID match dengan Storage bucket

### Upload error di production
- Cek Firebase Storage rules (write harus `request.auth != null`)
- Cek ukuran file (max 5MB di code, bisa diubah)
- Cek Firebase Storage plan (free: 5GB storage, 1GB/day download)

### NextAuth session tidak persist
- Cek `NEXTAUTH_URL` (harus match dengan URL produksi)
- Cek `NEXTAUTH_SECRET` (harus konsisten antar deploy)
- Cookie SameSite policy (default `lax` OK untuk same-origin)

---

## 📊 Monitoring & Maintenance

### Setup Logging
- Vercel: builtin logging di project → Logs
- Supabase: Dashboard → Logs (Postgres, Auth, Storage terpisah)
- Firebase: Console → Usage → bisa integrasi ke Google Cloud Logging

### Setup Alerting
- Supabase: email alert untuk database usage mendekati limit
- Firebase: alert untuk Storage quota
- Vercel: alert untuk build/deploy failures (free plan basic alerts)

### Database Migration
Saat update schema:
```bash
# Buat migration file
bun run db:migrate --name add_new_feature_xxx

# Apply ke production (jangan db:push, gunakan migrate)
bun run db:migrate deploy
```

### Backup & Restore
- **Supabase**: Point-in-time recovery (Pro plan), atau export manual via Dashboard
- **Manual**: `pg_dump` koneksi direct, simpan di S3/Cloud Storage
- **Test restore**: lakuka restore ke project staging untuk verifikasi

---

## 🎯 Rollback Plan

Jika ada masalah di production:

1. **Database rollback**: Prisma migrate mendukung `migrate resolve --rolled-back`
2. **Code rollback**: Vercel → Deployments → pilih commit sebelumnya → **Redeploy**
3. **Feature flag**: gunakan env var `FEATURE_FLAG_NEW_MODULE=false` untuk disable

Punya masalah? Lihat **docs/MONOREPO.md** untuk arsitektur detail, atau buka issue di repo.
