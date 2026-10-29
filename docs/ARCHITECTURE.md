# Arsitektur Final — SIM MADIN

> Dokumen ini adalah keputusan final arsitektur SIM MADIN.
> Semua development selanjutnya harus mengikuti aturan di sini.

## 🎯 Filosofi Arsitektur

**"Supabase untuk semuanya, Firebase hanya untuk push notif, Cloudflare R2 untuk upload."**

Kenapa? Karena user ingin **gratis dulu tanpa berlangganan** di tahap awal. Kombinasi ini memberikan:

| Layanan | Free Tier | Cukup untuk? |
|---------|-----------|--------------|
| **Supabase** | 500MB DB + 1GB storage + 50k MAU auth + realtime | Awal-awal madrasah (< 1000 santri) |
| **Firebase FCM** | Unlimited push notifications | Semua mobile apps, gratis selamanya |
| **Cloudflare R2** | 10GB storage + no egress fees | Upload foto/bukti transfer, free selamanya |

**Total biaya: $0/bulan** untuk skala awal madrasah.

---

## 🏗️ Stack Final

### Frontend — Web (Sudah berjalan)
- **Next.js 16** (App Router) + TypeScript 5
- React 19 + Server Components
- Tailwind CSS 4 + shadcn/ui (New York)
- Zustand (state client) + TanStack Query (state server, available)
- Recharts (chart), Lucide React (ikon), next-themes (dark mode)

### Frontend — Mobile (Roadmap)
- **Expo React Native** (managed workflow)
- NativeWind (Tailwind for RN)
- expo-router (navigation)
- Zustand + TanStack Query (state management)
- **Auth pakai Supabase Auth SDK** (NOT Firebase Auth)

### Backend — Database & Auth & Storage
- **Supabase Postgres** (ganti SQLite)
- **Prisma ORM** sebagai database client
- **Supabase Auth** untuk semua role (admin, guru, wali, dst) — bukan NextAuth lagi
- **Supabase Storage** untuk foto profil (1GB free, cukup untuk awal)
- **Cloudflare R2** untuk bukti transfer & dokumen besar (10GB free)

### Backend — Push Notification
- **Firebase Cloud Messaging (FCM)** — untuk push notif mobile apps SAJA
- Tidak untuk auth, tidak untuk storage, TIDAK untuk apa pun selain push notif
- Gratis unlimited untuk semua platform

### Auth Strategy — SIMPLIFIED

**SEBELUMNYA (V1.3):** 3 sistem auth duplikat
- ❌ NextAuth (admin web)
- ❌ Custom JWT (wali)
- ❌ (rencana) Firebase Auth (mobile)

**SEKARANG (V1.4+):** 1 sistem saja
- ✅ **Supabase Auth** untuk semua (admin web + mobile apps)
- ✅ Wali login pakai **Supabase Auth + custom phone+PIN flow** via Supabase Functions atau RLS
- ✅ Session token dari Supabase Auth dipakai untuk semua API call

**Migration plan V1.3 → V1.4:**
1. Setup Supabase project
2. Migrate users dari Prisma `User` ke Supabase Auth
3. Implement phone+PIN auth via Supabase (RLS + custom claims)
4. Deprecate NextAuth + custom JWT
5. Update API guards untuk verify Supabase JWT

### Upload Storage — Tiered Strategy

```
Foto profil santri/guru/wali (small, frequent)
  → Supabase Storage (1GB free)
  → Folder: avatars/

Bukti transfer, dokumen besar (infrequent, larger)
  → Cloudflare R2 (10GB free)
  → Folder: documents/

Photo proof, photo absensi (V8 QR Code roadmap)
  → Cloudflare R2
  → Folder: proofs/
```

---

## 📦 Struktur Monorepo (Target Setelah Stabil)

```
madrasah-diniyah/
├── apps/
│   ├── super-admin/              # Next.js 16 — Web App Super Admin ✅
│   ├── mobile-guru/              # Expo RN — Guru
│   ├── mobile-bendahara/        # Expo RN — Bendahara
│   ├── mobile-kepala/           # Expo RN — Kepala Madrasah
│   └── mobile-wali/             # Expo RN — Wali Santri
│
├── packages/
│   ├── database/                # Prisma schema + migrations (SHARED)
│   ├── shared/                  # Constants, types, utils (SHARED)
│   ├── api-client/              # Typed API client (web & mobile)
│   └── ui/                      # Shared React Native components
│
├── supabase/                    # Supabase setup
│   ├── migrations/              # SQL migrations
│   ├── functions/               # Edge Functions (untuk phone+PIN auth)
│   └── policies.sql             # RLS policies
│
└── docs/                        # All documentation
```

**Status saat ini:** Apps/super-admin sudah jalan sebagai single Next.js app. Packages/ sudah ada sebagai portable code (belum di-link via Nx workspace). Untuk mobile apps dan migrasi penuh ke Nx, lihat `docs/ROADMAP.md`.

---

## 🔐 Permission & Role System

### 5 Role Default
| Role | Permission Scope |
|------|------------------|
| SUPER_ADMIN | Semua (60 permission, bypass check) |
| KEPALA | Read semua + Pengumuman CRUD |
| BENDAHARA | Tagihan + Pembayaran + Santri (read) + Pengumuman |
| GURU | Absensi + Nilai CRUD + Read akademik |
| WALI | Read santri sendiri (via SantriWali pivot) + Tagihan + Pengumuman |

### Permission Format
```
{module}:{action}
```
- 15 modul: santri, wali, guru, kelas, mapel, jadwal, absensi, nilai, rapor, tagihan, pembayaran, pengumuman, user, tahun_ajaran, pengaturan
- 4 actions per modul: create, read, update, delete
- Total: 60 permission codes

### Wali Access Control (Penting!)
Wali TIDAK pakai permission system biasa. Wali pakai **pivot SantriWali**:
- `canAccess: true` — wali bisa lihat santri ini
- `canAccess: false` — admin disable akses tanpa hapus relasi
- `isPrimary: true` — wali utama (1 per santri)

Setiap request `/api/wali/santri/[id]` WAJIB cek `verifyWaliSantriAccess(waliId, santriId)`.

---

## 🗄️ Database Schema — Highlight

19 model Prisma. Detail di `prisma/schema.prisma` dan `packages/database/schema.prisma`.

### Pola yang Wajib Dipertahankan
1. **Soft delete** untuk semua data induk (User, Santri, Wali, Guru, Kelas, Mapel) — field `deletedAt`
2. **Audit log** di setiap POST/PUT/DELETE via helper `logAudit()`
3. **Tahun ajaran & semester** terikat di semua data akademik (Absensi, Nilai, Rapor, Tagihan)
4. **Foreign key** dengan `onDelete: Cascade` untuk data turunan (SantriWali, WaliActivation, dst)
5. **Unique constraint** untuk mencegah duplikasi (NIS, NISN, phone, code, dst)
6. **Phone format normalized** ke `628xxx` (international Indonesia) — wajib pakai helper `normalizeWhatsApp()`
7. **NIS auto-generated** format YY+6 digit (contoh: 26000001) — identitas permanen santri

### Schema yang Sudah Postgres-Ready
File `packages/database/schema.prisma` bisa langsung dipakai untuk Postgres (cukup ubah `provider = "sqlite"` → `provider = "postgresql"`).

---

## 🔌 API Design Pattern

### RESTful Convention
- `GET /api/admin/{resource}` — list dengan filter via query param
- `GET /api/admin/{resource}/{id}` — detail
- `POST /api/admin/{resource}` — create
- `PUT /api/admin/{resource}/{id}` — update
- `DELETE /api/admin/{resource}/{id}` — delete (soft delete untuk data induk)

### Response Format
```typescript
// Single
{ data: T }

// List
{ data: T[], total: number }

// Error
{ error: string, message?: string, requiredPermission?: string }
```

### Auth Header
- **Web (Supabase Auth)**: cookie-based, otomatis dikirim browser
- **Mobile (Supabase Auth)**: `Authorization: Bearer <supabase-jwt>`

### Permission Check Pattern
```typescript
import { requireApiPermission } from "@/lib/auth/guards"

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("santri:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  // ... business logic
  await logAudit(session, "CREATE", "SANTRI", newId, { name, nis }, req)
  return NextResponse.json({ data: santri })
}
```

### V2 — Akademik & Pembelajaran Patterns (Added 29 Okt 2025)

#### Guru Access Validation Pattern
Untuk modul V2 yang punya scope per kelas+mapel (materi, tugas, pertemuan, kompetensi), gunakan helper `validateGuruAccess()`:

```typescript
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("materi:create", req)
  if (guard.error) return guard.error
  const session = guard.session

  // V2 security: validate GURU has teaching access to this kelas+mapel
  const accessCheck = await validateGuruAccess(session, {
    kelasId: body.kelasId,
    mapelId: body.mapelId,
    guruId: body.guruId, // pass to disallow guru A from assigning to guru B
  }, req)
  if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

  // Auto-bind guruId to current guru if not provided
  let guruId = body.guruId
  if (!guruId && accessCheck.guru) guruId = accessCheck.guru.id

  // ... business logic
}
```

Rules:
- **SUPER_ADMIN**: bypass — full access
- **KEPALA**: bypass — monitoring role, read-only by permission
- **GURU**: must have active Jadwal entry linking them to kelas+mapel (active TA+Semester)
- Other roles: denied by default

#### Compute-on-read Pattern (Auto-complete)
Untuk task yang butuh auto-update status (e.g., pertemuan overdue), gunakan compute-on-read:

```typescript
import { markOverduePertemuanCompletedSafe } from "@/lib/pertemuan/auto-complete"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("pertemuan:read", req)
  if (guard.error) return guard.error
  try {
    // Silent background auto-complete (failures don't break list request)
    await markOverduePertemuanCompletedSafe()
    // ... fetch list
  }
}
```

For high-traffic: schedule via Vercel Cron at `/api/cron/pertemuan-auto-complete?key=CRON_SECRET`.

#### N+1 Optimization Pattern (Batch Query + Map Lookup)
Hindari `Promise.all(items.map(async (i) => await db.x.findFirst(...)))`:

```typescript
// ❌ BAD: N+1 queries
const items = await Promise.all(
  pertemuanList.map(async (p) => {
    const absensi = await db.absensi.findFirst({ where: { ... } })
    return { ...p, absensi }
  })
)

// ✅ GOOD: 1 batch query + Map lookup
const minDate = ...; const maxDate = ...
const allRecords = await db.absensi.findMany({
  where: { date: { gte: minDate, lte: maxDate }, ... },
})
const lookup = new Map(allRecords.map((r) => [dateKey(r.date), r]))
const items = pertemuanList.map((p) => ({
  ...p,
  absensi: lookup.get(dateKey(p.date)) || null,
}))
```

#### Bulk Operation Pattern (1 Transaction)
Untuk bulk update (e.g., grading multiple submissions):

```typescript
// Pre-fetch all in 1 query (avoid N+1)
const submissions = await db.pengumpulanTugas.findMany({
  where: { id: { in: submissionIds } },
})

// Process each with individual try/catch (1 failure doesn't break all)
const updated = []
const failed = []
for (const entry of entries) {
  try { /* update + push to updated */ }
  catch (e) { failed.push({ id, error: e.message }) }
}

// Recompute aggregates after bulk update
const affectedKeys = new Set(updated.map((u) => `${u.santriId}|${u.mapelId}`))
for (const key of affectedKeys) { /* recompute Nilai aggregate */ }
```

#### Schema Migration via Supabase Management API
prisma_user tidak owner tabel tertentu, jadi `prisma db push` gagal. Solusi:

```bash
# Set env: SUPABASE_ACCESS_TOKEN=sbp_xxx (Personal Access Token, bukan service_role)
# Run: bun run scripts/apply-v2-6-schema-supabase.ts
# Uses: POST https://api.supabase.com/v1/projects/{ref}/database/query
```

Referential integrity di-handle di app layer (Prisma onDelete: SetNull) untuk avoid cross-table ownership issue.

---

## 🚀 Deployment Strategy

### Dev (Sekarang)
- SQLite local + Prisma + NextAuth + local storage
- Single Next.js app di port 3000
- Bisa dijalankan dengan `bun run dev`

### Production (Target V1.5)
1. **Database**: Supabase Postgres (free 500MB)
2. **Auth**: Supabase Auth (free 50k MAU)
3. **Storage**: Cloudflare R2 untuk upload (free 10GB)
4. **Push notif**: Firebase FCM (free unlimited)
5. **Hosting web**: Vercel (free untuk hobby)
6. **Mobile apps**: Expo EAS Build + Play Store / App Store

### Migration Steps
1. Setup Supabase project (free tier)
2. Set `DATABASE_URL` ke Supabase Postgres connection string
3. Ubah `prisma/schema.prisma` provider ke `postgresql`
4. Jalankan `bun run db:push` untuk inisialisasi
5. Migrate auth dari NextAuth ke Supabase Auth (V1.4)
6. Setup Cloudflare R2 + update storage adapter (V1.4)
7. Setup Firebase project (FCM only)
8. Deploy ke Vercel

Detail lengkap di `docs/DEPLOYMENT.md`.

---

## 🛡️ Security Checklist (Wajib untuk Production)

- [x] Password hashing dengan bcrypt (10 rounds)
- [x] PIN hashing dengan bcrypt (10 rounds) untuk wali
- [x] JWT session dengan secret env var
- [x] Permission check di setiap API route
- [x] Soft delete untuk data induk
- [x] Audit log untuk semua operasi tulis
- [x] Rate limiting OTP (max 5/jam per nomor)
- [x] Auto-lock akun setelah 5x salah PIN (15 menit)
- [x] OTP expiry 15 menit
- [x] OTP attempt limit (3x salah → invalidate)
- [x] PIN blacklist (000000, 123456, dst)
- [x] Phone normalization (semua format → 628xxx)
- [x] CSRF protection (NextAuth bawaan)
- [ ] HTTPS only (Vercel default)
- [ ] CORS configuration untuk production domain
- [ ] Rate limiting login endpoint (V1.4)
- [ ] IP whitelist untuk API admin (optional)
- [ ] Backup otomatis database (Supabase Pro, $25/bln)

---

## 📊 Monitoring & Observability

### Logging
- Console.log di dev mode (Prisma query log enabled)
- Vercel Logs untuk production (otomatis capture stdout/stderr)
- Supabase Logs untuk database query (Dashboard → Logs)

### Metrics yang Perlu Dipantau
- API response time (target < 200ms average)
- Database query time (Prisma log jika > 1s)
- Error rate (target < 1%)
- Active users per day
- Storage usage (Supabase 1GB, R2 10GB)

### Alerting
- Vercel: email alert untuk deploy failures
- Supabase: email alert untuk database usage mendekati limit
- Custom: Slack/Discord webhook untuk error fatal (roadmap)

---

## 🔄 Update Log Arsitektur

- **2025-10-29 V3.0**: Rapor Terintegrasi complete. **Klarifikasi penting: TIDAK ADA ujian online di V3** — ujian diinput manual (offline). Fokus V3 adalah **rapor komprehensif** yang mencakup semua kegiatan akademik santri (HARIAN 25% + TUGAS 15% + UTS 25% + UAS 25% + PRAKTIK 10%), plus catatan wali kelas, prestasi, akhlak, saran. 14 endpoint V3 baru, 7 tabel baru (Ujian, BankSoal, UjianSoal, UjianPeserta, UjianNilai, RaporMapel, RaporCatatan). Rapor generate auto-compute nilaiAkhir dengan bobot. PDF cetak via HTML printable. Online exam = future V3.5.
- **2025-10-29 V2.0 FINAL**: Akademik & Pembelajaran complete. 19 endpoint V2, 4 UI views, mobile-wali + mobile-guru integration. Patterns baru: `validateGuruAccess()` (security per kelas+mapel), compute-on-read auto-complete, N+1 optimization (batch query + Map lookup), bulk operation pattern, schema migration via Supabase Management API. Schema migration: tambah `kompetensiId` di Nilai. Performance: 80% reduction DB calls di rekap wali.
- **2025-10-28 V1.4**: Keputusan final — Supabase all + Firebase FCM only + R2. Simplify auth dari 3 sistem → 1 sistem (Supabase Auth).
- **2025-10-27 V1.3**: Implementasi wali auth (WhatsApp+PIN) + NIS auto-generate. Tambah SantriWali pivot untuk multi-wali.
- **2025-10-27 V1.2**: Tambah Firebase Admin SDK adapter (sekarang deprecated, ganti Supabase Auth).
- **2025-10-27 V1.1**: Implementasi NextAuth + permission enforcement + audit log.
- **2025-10-27 V1.0**: MVP V1 complete dengan 16 modul Super Admin.

---

## ❓ FAQ Arsitektur

**Q: Kenapa tidak pakai Firebase Auth saja? Gratis unlimited kan?**
A: Firebase Auth memang unlimited untuk MAU, tapi Supabase Auth 50k MAU sudah lebih dari cukup untuk awal. Plus, pakai Supabase Auth berarti 1 vendor untuk DB + Auth + Storage — simplify maintenance.

**Q: Kenapa Cloudflare R2 bukan Cloudinary?**
A: Cloudinary free 25GB tapi ada credit limit transformation. R2 free 10GB + no egress fees (bisa diakses dari mana saja tanpa biaya bandwidth). Untuk foto santri yang sering di-load wali, R2 lebih hemat.

**Q: Kapan harus upgrade ke berbayar?**
A: Saat salah satu terjadi:
- Supabase DB > 500MB → upgrade ke Pro $25/bln (5GB DB, 100GB storage, 100k MAU)
- Cloudflare R2 > 10GB → $0.015/GB/bulan (sangat murah)
- Vercel > 100GB bandwidth/bulan → Pro $20/bln

**Q: Bagaimana dengan WhatsApp Gateway untuk OTP?**
A: Belum ada di free tier. Untuk awal, OTP bisa:
- Di-tampilkan di UI admin untuk di-share manual ke wali
- Atau pakai layanan gratis seperti WhatsApp Business API (limited)
- Atau pakai Twilio trial (free credit $15, cukup untuk testing)

Production: pakai Fonnte/Wablas (sekitar Rp 10-20 per pesan).
