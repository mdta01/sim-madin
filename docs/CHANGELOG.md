# Changelog — SIM MADIN

Dokumen ini transparan tentang apa yang sudah jadi vs belum, supaya developer selanjutnya tahu kondisi sebenarnya sistem.

Format: `[STATUS]` di awal tiap item — ✅ done / ⚠️ partial / ❌ not started / 🐛 has bug

---

## Versi 1.3 — Wali Auth + NIS Auto (28 Okt 2025)

### ✅ Done
- Schema database: model `SantriWali`, `WaliActivation`, `PhoneChangeLog` (pivot multi-wali + OTP tracking + riwayat perubahan nomor)
- Helper NIS generator (format YY+6 digit urut per tahun, anti-collision)
- Helper WhatsApp normalize (08xxx / 628xxx / +628xxx → 628xxx)
- Wali auth: hash PIN (bcrypt), JWT 7 hari, rate limiting OTP (5/jam), auto-lock 5x salah (15 menit)
- API `/api/wali/request-otp`, `/verify-otp`, `/set-pin`, `/login`, `/me`, `/santri/[id]`
- API `/api/admin/santri` POST: auto-generate NIS, auto-link/create wali berdasarkan no WA
- UI Login Wali (separate dari admin via `?mode=wali`)
- UI Dashboard Wali: list anak + detail santri dengan 6 tabs (Profil, Jadwal, Absensi, Nilai, Tagihan, Info)
- Toggle mode di halaman login admin ("Login sebagai Wali Santri →")
- Lupa PIN flow end-to-end (request OTP → verify → set PIN baru)
- Access control: wali hanya bisa lihat santri yang ter-link (403 jika tidak terhubung)
- Seed: 6 wali dengan beragam status (2 ACTIVE, 3 PENDING, 1 PENDING_NO_PHONE)
- NIS auto-format di seed: 15 santri dengan NIS 25000001 - 25000015
- PIN demo `258041` (bukan blacklist) untuk wali ACTIVE

### ⚠️ Partial / Belum Sempurna
- API `/api/admin/wali/[id]/change-phone` — belum ada (schema `PhoneChangeLog` sudah ada, helper belum)
- API `/api/admin/santri/[id]/wali` untuk manage multi-wali — belum ada
- UI di Super Admin: manage multi-wali per santri (tambah/hapus/set primary) — belum ada
- UI di Super Admin: trigger re-invite wali — belum ada
- Halaman aktivasi `/activate?token=xxx` — belum ada UI
- Integrasi WhatsApp Gateway (Fonnte/Wablas) untuk kirim OTP otomatis — belum, saat ini OTP return di API response (dev mode)

### 🐛 Bug Ditemukan di Audit (28 Okt 2025)
- ✅ FIXED: Route `/api/admin/upload` dan `/api/admin/upload/status` folder hilang (sudah direstore)
- ✅ FIXED: Form Santri sekarang punya field wali (toggle "Buat Wali Baru" atau pilih existing)
- ✅ FIXED: Form Santri sekarang tampilkan NIS auto-generate + info OTP/aktivasi wali di toast setelah create
- ✅ FIXED: List Santri sekarang punya kolom "Status Wali" dengan badge warna (ACTIVE/PENDING/PENDING_NO_PHONE/SUSPENDED)
- ✅ FIXED: Detail Santri sekarang punya tab "Wali" yang menampilkan semua wali via waliLinks pivot
- ✅ FIXED: UI Login Wali salah tulis PIN demo (sebelumnya "123456" → diperbaiki jadi "258041")

### ✅ Audit Lengkap (28 Okt 2025)
- 22 API endpoints admin + 6 API endpoints wali → semua return 200 OK untuk authenticated request, 401 untuk unauthenticated, 403 untuk forbidden
- 16 menu Super Admin → semua bisa diklik dan menampilkan view yang benar
- Login admin (5 role demo) → semua bekerja
- Login wali (2 wali ACTIVE) → semua bekerja dengan PIN `258041`
- Dashboard wali 6 tabs → semua bekerja (Profil, Jadwal, Absensi, Nilai, Tagihan, Info)
- Access control wali → 403 saat akses santri yang tidak ter-link (verifikasi OK)
- Auto-generate NIS → tested via API (26000002 untuk santri baru)
- Auto-create wali → tested via API (wali "Bapak Audit Test" terbuat dengan status PENDING)
- SantriWali pivot → terbentuk otomatis dengan isPrimary=true
- Audit log → tercatat untuk semua operasi CREATE/UPDATE/DELETE
- Lint bersih (0 error, 0 warning)

---

## Versi 1.2 — Monorepo + Backend Adapter (28 Okt 2025)

### ✅ Done
- Struktur `packages/shared` (constants, types, utils) siap untuk monorepo Nx
- Struktur `packages/database` (schema.prisma Postgres-ready)
- Struktur `packages/api-client` (typed client untuk web & mobile)
- Re-export shim `src/lib/constants.ts` agar import path lama tetap jalan
- Firebase Admin SDK adapter dengan graceful fallback
- Storage adapter pattern (local vs Firebase Storage, auto-detect)
- Auth guards support dual mode: NextAuth cookie (web) + Bearer token (mobile/Firebase)
- API `/api/admin/upload/status` untuk cek konfigurasi storage
- `.env.example` komprehensif (dev / production web / production mobile)
- `docs/DEPLOYMENT.md` (11KB) — panduan setup Supabase + Firebase + Vercel
- `docs/MONOREPO.md` (8KB) — panduan migrasi ke Nx
- `nx.json.example`, `pnpm-workspace.yaml.example`

### ⚠️ Partial
- Field `firebaseUid` di User model — ada di schema, tapi belum ada UI/API untuk link Firebase user ke User saat mobile login
- Storage adapter Firebase — kode ada, tapi belum pernah di-test dengan Firebase project asli (env tidak di-set di dev)

### ❌ Not Started
- Migrasi aktual ke Nx monorepo (pindah file ke apps/ + packages/)
- Setup Supabase project asli (database Postgres)
- Setup Firebase project asli (FCM untuk push notif mobile)
- Setup Cloudflare R2 untuk upload storage (alternatif Cloudinary)

---

## Versi 1.1 — Stabilisasi Auth & Keamanan (27 Okt 2025)

### ✅ Done
- NextAuth.js v4 dengan CredentialsProvider (email/username + password)
- bcrypt password hashing (10 rounds)
- 5 demo account siap pakai (admin/kepala/bendahara/guru/wali, password: admin123)
- Permission enforcement di SEMUA API route (60 permission, 4 actions × 15 modul)
- Helper `requireApiPermission("modul:aksi", req)` untuk server-side guard
- Super Admin otomatis bypass semua permission check
- Audit log otomatis di setiap POST/PUT/DELETE (15 modul + upload)
- API `/api/admin/audit-log` dengan filter module/action/userId
- UI Audit Log viewer dengan badge warna per aksi (CREATE/UPDATE/DELETE/UPLOAD)
- API upload foto dengan validasi type + size (max 5MB)
- Reusable `<PhotoUpload />` component ter-integrasi di form Santri
- Halaman Profil Saya (tab Profil + Keamanan untuk ubah password)
- Login & Logout flow lengkap dengan dropdown user menu

### ⚠️ Partial
- Audit log viewer hanya Super Admin yang bisa akses (via dropdown user) — sebenarnya sudah benar, tapi tidak ada di sidebar menu utama
- Upload foto hanya di form Santri, belum di form Guru/Wali

### 🐛 Bug Ditemukan & Fix di V1.3
- FIXED: Path re-export `src/lib/constants.ts` salah (`../../../packages/...` → `../../packages/...`)

---

## Versi 1.0 — MVP V1 Complete (27 Okt 2025)

### ✅ Done
- 16 modul Super Admin lengkap dengan CRUD: Dashboard, Tahun Ajaran & Semester, Wali, Santri, Guru, Kelas, Mapel, Jadwal, Absensi, Nilai, Rapor, Tagihan, Pembayaran, Pengumuman, User & Hak Akses, Pengaturan
- Dashboard: stat cards, chart pemasukan 6 bulan, absensi hari ini, distribusi per kelas, recent payments & announcements
- Detail view dengan tabs: Santri (5 tabs), Guru, Kelas, Wali, Pengumuman, Rapor
- Dark/light mode via next-themes
- Responsive mobile-first (sidebar collapsible)
- Zustand SPA navigation (single `/` route untuk preview)
- Seed: 5 role + 60 permission, 1 TA + 2 semester, 5 jenis tagihan, 6 mapel, 5 guru, 3 kelas, 5 wali, 15 santri, absensi 5 hari, beberapa nilai + rapor + pengumuman

### ⚠️ Partial
- Form Santri/Wali/Guru: ada beberapa field di schema yang belum ada di UI form (mis: photoUrl untuk Guru/Wali belum ada upload widget, NIK untuk wali belum di form)
- Tab "Wali" di detail Santri belum ada (walaupun API sudah return `waliLinks`)
- Bulk operations: hanya ada di Absensi, Nilai, Rapor, Tagihan — belum di modul lain
- Print/PDF Rapor: tombol "Cetak PDF" ada tapi placeholder (Coming Soon)
- Search global di header: tidak berfungsi (hanya placeholder)

### ❌ Not Started
- Real-time notifications (WebSocket)
- Push notification via Firebase Cloud Messaging
- Export data (Excel/PDF) untuk semua modul
- Soft delete UI indicator (data yang sudah soft-delete tetap muncul di list)
- Filter by date range di modul Absensi/Pembayaran (sudah di API, belum di UI)

---

## Bug yang Perlu Di-Fix di V1.4 (Prioritas Tinggi)

Berdasarkan audit 28 Okt 2025:

1. **Form Santri: tambah field wali** (waliName, waliPhone, waliRelationship) supaya auto-create wali bisa dipakai dari UI
2. **Form Santri: tampilkan NIS yang di-generate** di toast/response setelah create
3. **List Santri: tambah kolom status wali** (badge PENDING/ACTIVE/PENDING_NO_PHONE)
4. **Detail Santri: tambah tab "Wali"** yang list semua wali via `waliLinks`
5. **Validasi: phone normalization di form Santri** — pastikan format 628xxx sebelum kirim ke API

---

## Yang Tidak Pernah Akan Dikerjakan (Keputusan Arsitektur)

Berdasarkan feedback user (28 Okt 2025):

- ❌ Firebase Auth — tidak dipakai, cukup Supabase Auth untuk semua (gratis 50k MAU)
- ❌ Firebase Storage — tidak dipakai, ganti Cloudflare R2 (10GB free, no egress)
- ❌ Cloudinary — tidak dipakai
- ❌ Multiple auth systems (NextAuth + custom JWT + Firebase Auth) — akan disimplify

**Keputusan final:** Lihat `docs/ARCHITECTURE.md` untuk detail arsitektur yang dipilih.
