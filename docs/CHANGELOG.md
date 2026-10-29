# Changelog — SIM MADIN

Dokumen ini transparan tentang apa yang sudah jadi vs belum, supaya developer selanjutnya tahu kondisi sebenarnya sistem.

Format: `[STATUS]` di awal tiap item — ✅ done / ⚠️ partial / ❌ not started / 🐛 has bug

---

## Versi 3.0 — Rapor Terintegrasi (29 Okt 2025)

> **Filosofi**: V3 fokus pada **RAPOR KOMPREHENSIF** yang mencakup semua kegiatan akademik santri, bukan hanya hasil ujian. Ujian diinput manual (offline) — tidak ada ujian online (online exam = future V3.5).
>
> **Rapor komprehensif** = gabungan:
> - Nilai Harian dari pertemuan (25%)
> - Tugas yang dikumpulkan (15%)
> - UTS — ujian tengah semester (25%)
> - UAS — ujian akhir semester (25%)
> - Praktik (10%)
>
> Plus catatan wali kelas, prestasi, akhlak, dan saran pengembangan.

### ✅ Done

#### Modul Ujian (Manual Input — Bukan Online)
- **Bank Soal** (`/api/admin/bank-soal` + UI view)
  - 4 tipe soal: PG (pilihan ganda), ISIAN, ESSAY, PRAKTIK
  - Difficulty: MUDAH/SEDANG/SULIT dengan badge warna
  - Link ke Kompetensi (V2 #6) — soal bisa terkait capaian pembelajaran tertentu
  - Tags untuk klasifikasi (tajwid, nun mati, idgham, dll)
  - Bobot per soal untuk scoring fleksibel
  - Soft delete via `isActive=false`
- **Ujian** (`/api/admin/ujian` + UI view dengan 4 tabs)
  - 4 tipe: UTS, UAS, QUIZ, MAKEUP (susulan)
  - Field: ruang ujian, pengawas, durasi, passing score (override KKM mapel)
  - **Ujian SELALU offline** — guru input nilai manual setelah ujian dilaksanakan
  - Tab **Soal**: assign soal dari Bank Soal, urutan & bobot per ujian
  - Tab **Peserta**: auto-assign semua santri kelas, toggle hadir/absen
  - Tab **Nilai**: bulk input nilai dengan stats (avg, max, min, % lulus)
  - Tab **Leger**: ranking dengan predikat (A/B/C/D/E), status lulus/remedial
  - **Auto-feed ke Nilai**: saat input nilai ujian, otomatis upsert `Nilai` dengan type matching (UTS→type=UTS, UAS→type=UAS, dll) untuk rapor aggregation
- **Schema**: hapus field `isOnline` dari Ujian (tidak ada ujian online di V3)

#### Modul Rapor Komprehensif
- **Rapor Generate** (`/api/admin/rapor/[id]/generate`)
  - Auto-compute `nilaiAkhir` per mapel menggunakan **bobot dari NILAI_BOBAT**
  - Bobot: HARIAN 25% + TUGAS 15% + UTS 25% + UAS 25% + PRAKTIK 10%
  - Auto-compute `predikat` (A/B/C/D/E) berdasarkan score
  - Auto-compute `isTuntas` (nilaiAkhir >= KKM)
  - Update Rapor.absensiHadir/Sakit/Izin/Alfa dari absensi records
  - Support `overwrite` mode (regenerate existing entries)
  - Return `breakdown` per type untuk transparansi (avg per type, count per type)
- **RaporMapel** (`/api/admin/rapor/[id]/mapel`)
  - Detail nilai per mapel: nilaiAkhir, predikat, deskripsi, kkm, isTuntas
  - Manual deskripsi capaian per mapel: "Ananda Ahmad menunjukkan penguasaan..."
  - Upsert (create or update) per mapel
- **RaporCatatan** (`/api/admin/rapor/[id]/catatan`)
  - Catatan wali kelas (umum)
  - Prestasi santri: "Juara 1 Tahfidz"
  - Akhlak & sikap: "Sangat Baik"
  - Rekap kehadiran (auto-fill dari absensi)
  - Saran pengembangan
- **Rapor PDF** (`/api/admin/rapor/[id]/pdf`)
  - HTML printable (Ctrl+P → save as PDF) — no puppeteer needed
  - Layout professional: header madrasah, info santri, tabel nilai, catatan, tanda tangan
  - Stats: rata-rata, tuntas/tidak, kehadiran
  - Includes: catatan wali kelas, prestasi, akhlak, kehadiran, saran
- **UI Enhancements** (rapor-view.tsx):
  - Breakdown per jenis nilai dengan bobot % (HARIAN 25%, TUGAS 15%, dll)
  - Badge predikat (A/B/C/D/E) dengan warna
  - "Generate" button untuk auto-compute rapor
  - Catatan & pengembangan panel (prestasi, akhlak, saran)
  - Info banner "Rapor Komprehensif — Bukan Hanya Hasil Ujian"
  - Cetak PDF button (opens new tab)

#### Permissions & Role Mapping
- 6 modul permission baru: `ujian`, `bank_soal`, `ujian_peserta`, `ujian_nilai`, `rapor_mapel`, `rapor_catatan`
- Guru: CRUD ujian + bank_soal + ujian_peserta + ujian_nilai, read rapor extensions
- Wali: read-only semua V3 (lihat rapor anak)

### 📊 Statistik V3
- **Endpoint API**: 14 endpoint V3 baru
- **File baru**: 15 file (7 API route dirs, 2 UI views, 1 schema script, 1 constants update)
- **Schema**: 7 tabel baru (Ujian, BankSoal, UjianSoal, UjianPeserta, UjianNilai, RaporMapel, RaporCatatan)
- **Build**: ✅ 22.4s, 41 static pages, 14 endpoint V3 terdaftar
- **TypeScript**: 93 errors (turun dari 103 — fixed pre-existing V1 rapor issues), 0 V3-specific errors

### 🐛 Known Issues & Limitations
- **Ujian online belum ada** — santri tidak bisa take exam via mobile. Online exam = future V3.5 (butuh real-time sync, timer, auto-correction)
- **Auto-correction soal objektif** belum ada — butuh UjianJawaban table + scoring logic (V3.5)
- **Random soal & random pilihan** belum ada — butuh shuffle algorithm per santri (V3.5)
- **Kartu ujian cetak** belum ada — bisa tambah endpoint `/api/admin/ujian/[id]/kartu-pdf`
- **Mobile integration** belum ada — mobile-wali tab Ujian + mobile-guru input nilai (pending)

### 💡 Filosofi V3: Rapor Komprehensif

V3 bukan tentang ujian online. V3 adalah tentang **rapor yang menggambarkan keseluruhan kegiatan akademik santri**, bukan hanya hasil ujian.

**Alur lengkap V3:**
1. Guru input nilai harian per pertemuan (V2)
2. Guru beri tugas, santri kumpulkan, guru nilai (V2)
3. Guru buat jadwal ujian, assign soal & peserta (V3)
4. Ujian dilaksanakan **secara nyata** di kelas/madrasah
5. Guru input nilai ujian manual (V3) → auto-feed ke Nilai type=UTS/UAS
6. Admin/wali kelas klik "Generate Rapor" → sistem hitung nilaiAkhir per mapel dengan bobot
7. Admin/wali kelas input catatan, prestasi, akhlak, saran
8. Cetak PDF rapor → distribusi ke wali santri

**Hasilnya**: Rapor yang komprehensif, adil, dan menggambarkan perkembangan santri secara menyeluruh — bukan hanya angka ujian.

---

## Versi 2.0 — Akademik & Pembelajaran (Final: 29 Okt 2025)

> **Status Final**: 15 dari 15 task plan selesai (Batch A: 5 task kritis + Batch B: 5 task UX guru + Batch C: 5 task UX wali/mobile). Sistem siap produksi.

### ✅ Done
- **Materi Pembelajaran** (`/api/admin/materi` + UI view)
  - Upload PDF, foto, audio (≤5MB) via storage adapter (R2/Firebase/local)
  - Tipe LINK untuk video eksternal (YouTube/Drive) — tidak dibatasi ukuran
  - Filter per mapel, kelas, tipe, dengan auto-bind tahun ajaran/semester aktif
  - Soft delete (`deletedAt`) + audit log penuh
- **Tugas & Pengumpulan** (`/api/admin/tugas` + `/[id]/pengumpulan` + `/api/admin/pengumpulan/[id]`)
  - CRUD tugas per kelas+mapel+guru, 4 tipe: INDIVIDU / KELOMPOK / PRAKTIK / HAFALAN
  - Bulk list pengumpulan + santri yang belum mengumpulkan (status `NOT_SUBMITTED`)
  - Auto-detect LATE status jika `submittedAt > dueDate`
  - Grading: score + feedback → side-effect upsert `Nilai` (type=TUGAS) untuk agregasi rapor
  - Skor dinormalisasi ke 0-100 (skala maxScore) supaya konsisten dengan KKM
- **Pertemuan & Absensi** (`/api/admin/pertemuan` + `/[id]` + `/[id]/absensi` + `/[id]/nilai`)
  - Sesi kelas per pertemuan dengan topik, deskripsi, status `isCompleted`
  - Bulk absensi per pertemuan: upsert Absensi (V1 model) tied by kelasId+date+TA
  - Bulk nilai harian per pertemuan: upsert Nilai (type=HARIAN) untuk semua santri kelas
  - Tombol "Tandai Semua Hadir" untuk aksi cepat di UI
- **Kompetensi** (`/api/admin/kompetensi` + UI view)
  - Capaian pembelajaran per mapel, 5 kategori: UMUM, KOGNITIF, PSIKOMOTORIK, AFEKTIF, SPIRITUAL
  - Auto-generate kode kompetensi berdasarkan kode mapel
  - Soft delete via `isActive=false`
- **Rekap Perkembangan untuk Wali** (`/api/wali/perkembangan/[santriId]`)
  - Persentase kehadiran 90 hari terakhir
  - Nilai per mapel: rata-rata + trend (NAIK/TURUN/STABIL/BARU) berdasarkan split half harian
  - Status tugas: submitted/graded/not submitted + overdue not submitted
  - Pertemuan terbaru dengan absensi santri pada tanggal itu
  - Materi terbaru yang dipublikasikan untuk kelas santri
- **Permissions V2** ditambahkan ke seed script
  - Modul baru: `materi`, `tugas`, `pengumpulan`, `pertemuan`, `kompetensi`
  - Mapping: Guru = CRUD penuh V2 + read kompetensi; Wali = read-only semua V2
- **Sample data V2** di seed.ts: 8 kompetensi, 5 materi, 4 tugas (dengan 4 pengumpulan sample per tugas), 9 pertemuan (3 per kelas × 3 mapel)
- **UI/UX improvements global**
  - Badge component diperluas: tambah variant `success` (green) & `warning` (amber) — sebelumnya hanya default/secondary/destructive/outline
  - Sidebar grup baru "Pembelajaran" antara Akademik & Keuangan
- **Build status**: Next.js production build sukses, semua 13 endpoint V2 terdaftar, 0 error/warning baru

### Catatan Teknis
- Schema V2 (Materi, Tugas, PengumpulanTugas, Pertemuan, Kompetensi) sudah ada di `prisma/schema.prisma` sejak V1.2 (forward-compatible design)
- Verifikasi database: 5 tabel V2 sudah sinkron di production Supabase (verified via `scripts/verify-v2-schema.ts`)
- Tidak ada migration breaking — semua V2 ditambah tanpa modifikasi tabel V1
- 4 view baru: `materi-view.tsx`, `tugas-view.tsx`, `pertemuan-view.tsx`, `kompetensi-view.tsx`
- File baru total: 13 API routes + 4 UI views = 17 file baru

### Batch A — Task Kritis (29 Okt 2025)

**Bug fix & security gap:**
- **#3 Fix bug nilai TUGAS menimpa**: Saat guru beri nilai tugas, Nilai type=TUGAS di-recompute sebagai **rata-rata semua tugas dinilai** untuk mapel itu — bukan lagi ditimpa tugas terakhir. Normalisasi 0-100 untuk multi-tugas dengan maxScore berbeda.
- **#12 Validasi akses guru**: Helper baru `src/lib/auth/guru-access.ts` cek Jadwal mengajar aktif. Diintegrasikan ke **8 API routes**: materi (POST/PUT), tugas (POST/PUT), pertemuan (POST/PUT), absensi+nilai per pertemuan, kompetensi (POST/PUT). SUPER_ADMIN bypass, GURU hanya bisa akses kelas+mapel yang dia ajar.

**Flow inti:**
- **#1 Wali Dashboard pakai rekap V2**: Fetch `/api/wali/perkembangan` paralel dengan detail V1. Quick stats pakai persentase kehadiran 90 hari, mini-card status tugas, tab "Tugas" baru, tab Nilai dengan card Rekap per Mapel + trend NAIK/TURUN/STABIL.
- **#4 Auto-generate pertemuan dari jadwal**: Endpoint `/api/admin/pertemuan/generate-from-jadwal` + UI dialog dengan **preview mode** (dryRun). Idempotent: skip jika pertemuan sudah ada untuk tanggal itu.
- **#2 Endpoint santri/wali submit tugas**: `POST /api/wali/tugas/[tugasId]/submit` (multipart or JSON), `GET /api/wali/tugas?santriId=xxx` list dengan stats. Mobile-wali App.tsx: tab "Tugas" baru + `TugasListSection` + `TugasSubmitModal`.

### Batch B — UX Guru (29 Okt 2025)

- **#5 Auto-mark pertemuan completed**: Helper `markOverduePertemuanCompleted()` + cron endpoint `/api/cron/pertemuan-auto-complete?key=xxx` + compute-on-read di GET list & detail. Pertemuan lampau >24h otomatis `isCompleted=true`.
- **#6 Link Kompetensi ↔ Nilai**: Schema update — tambah field `kompetensiId` di tabel Nilai + relasi `kompetensi`. Apply via Supabase Management API (prisma_user tidak owner table). API nilai + pertemuan/[id]/nilai support `kompetensiId` per entry.
- **#7 Bulk grading pengumpulan**: Endpoint baru `PUT /api/admin/pengumpulan/bulk-grade` (1 transaction, recompute Nilai type=TUGAS per affected santri+mapel). UI: toggle "Mode Penilaian Massal" + quick-action "Set semua: 85/75/100" + default feedback untuk semua.
- **#8 Tab materi di pertemuan detail**: GET `/api/admin/pertemuan/[id]` sekarang return `relatedMateri`. UI: tab "Materi" baru di dialog detail dengan empty state yang mengarahkan ke menu materi.
- **#9 Dashboard admin stats V2**: Endpoint `/api/admin/dashboard` tambah `v2Stats`: materi bulan ini, tugas aktif/overdue, pending grading, pertemuan minggu ini vs minggu lalu (dengan trend indicator). UI: section baru "Akademik & Pembelajaran (V2)" dengan 6 widget clickable.

### Batch C — UX Wali + Mobile (29 Okt 2025)

- **#9a Update mobile-wali App.tsx**: Tab baru "Rekap" (icon stats-chart). `PerkembanganV2Section` component: persentase kehadiran 90 hari, rekap nilai per mapel dengan trend icon (trending-up/down/sparkles), materi terbaru, pertemuan terbaru dengan status absensi, status tugas summary.
- **#9b Update mobile-guru App.tsx**: V2 quick stats row di DashboardScreen: pertemuan hari ini, perlu dinilai (highlighted), materi saya, tugas aktif. Endpoint baru `/api/admin/guru/stats` — guru-specific filter (hanya tugas/materi/pertemuan milik guru), admin/kepala gets aggregated stats.
- **#11 Filter & pagination pengumpulan list**: API `/api/admin/tugas/[id]/pengumpulan` support `?status=` filter (SUBMITTED/LATE/GRADED/NOT_SUBMITTED) + `?limit=&offset=` pagination. UI: dropdown filter dengan count badge per status, auto-reload on filter change, tombol Reset.
- **#13 Materi thumbnail preview**: Di tabel materi, type FOTO dengan fileUrl → render `<img>` thumbnail 12×12 clickable. Di form edit: image preview 16×16 dengan link "Lihat file" + URL display. Fallback ke icon untuk type lain.
- **#15 Optimasi rekap wali performance**: Eliminasi N+1 query di `/api/wali/perkembangan/[santriId]`. Lama: 1 query per pertemuan (5 pertemuan = 5 queries). Baru: 1 batch query dengan date range + Map lookup → ~80% reduction DB calls.

### 📊 Statistik Akhir V2

- **Endpoint API**: 19 endpoint V2 total (13 dari V2 awal + 6 tambahan dari Batch A/B/C)
- **File baru**: ~25 file (API routes, UI views, helpers, scripts)
- **File modified**: ~20 file (constants, store, layout, dashboard, mobile apps, dll)
- **Schema migration**: tambah kolom `kompetensiId` di tabel Nilai (TEXT + index, FK di app layer)
- **Build status**: ✅ Next.js production build sukses dalam 21s, 41 static pages, 19 endpoint V2 terdaftar, **0 error/warning baru**
- **TypeScript**: 103 errors (pre-existing — Firebase adapter, NextAuth trustHost, mobile RN module resolution), **0 regression** dari V1

### 🐛 Known Issues & Limitations

- **Sistem notifikasi belum ada** (tugas baru, jatuh tempo, pengumpulan dinilai) — direncanakan untuk V1.6 (Firebase FCM) atau V6 (Komunikasi & Notifikasi)
- **Mobile apps belum di-build ke APK/IPA** — code siap, butuh Expo build pipeline
- **mobile-kepala & mobile-bendahara belum integrate V2** — fokus keuangan, tidak terdampak langsung V2
- **Validasi pertemuanKe sequential** belum di-enforce (bisa skip 1→3 tanpa 2) — low priority

---

## Versi 1.4 — Production-Ready Adapters (28 Okt 2025)

### ✅ Done
- **Cloudflare R2 storage adapter** (`src/lib/storage/r2-adapter.ts`) — alternatif Cloudinary, free 10GB + no egress
  - Pakai AWS S3 SDK (R2 S3-compatible)
  - Auto-detect via env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
  - Support public URL (untuk foto profil) atau signed URL (untuk dokumen privat)
- **Storage adapter 3-mode** (`src/lib/storage/adapter.ts`) — auto-detect priority:
  1. Cloudflare R2 (production preferred)
  2. Firebase Storage (legacy/alternative)
  3. Local storage (dev fallback)
- **Supabase adapter** (`src/lib/supabase/admin.ts` & `client.ts`) — env-driven, ready to use
  - `getSupabaseAdmin()` — server-side Supabase client dengan service_role key (bypass RLS)
  - `verifySupabaseToken()` — verify JWT dari mobile apps (untuk auth via Supabase)
  - `isSupabaseConfigured()` — detect env vars
- **Auth guards support 3 mode** (`src/lib/auth/guards.ts`):
  1. Supabase Bearer token (mobile apps, production)
  2. Firebase Bearer token (mobile apps, legacy)
  3. NextAuth session cookie (web admin)
- **Upload status endpoint** (`/api/admin/upload/status`) — return info storage yang aktif (local/firebase/r2)
- **Setup guides** (3 file baru di `docs/`):
  - `docs/SETUP-SUPABASE.md` (9KB) — step-by-step bikin akun Supabase, ambil credentials, push schema
  - `docs/SETUP-R2.md` (12KB) — step-by-step bikin Cloudflare R2 bucket, API token, public access
  - `docs/SETUP-FCM.md` (10KB) — step-by-step bikin Firebase project untuk FCM only (push notif)
- **Updated `.env.example`** (komprehensif) — semua env vars untuk dev + production + mobile
- **Schema Postgres-ready** — Prisma schema tinggal switch `provider = "sqlite"` → `"postgresql"` saat migrate ke Supabase
- **Lint bersih** (0 error, 0 warning)
- **Dev mode tetap jalan** — fallback ke local storage & NextAuth saat env vars cloud tidak di-set

### ⚠️ Partial
- Supabase Auth belum diimplementasi full (baru adapter pattern). Migration dari NextAuth → Supabase Auth akan dilakukan di V1.5
- Firebase FCM belum ada API endpoint untuk kirim push (baru adapter). Akan diimplement di V1.6
- Cloudflare R2 belum di-test dengan akun asli (code sudah ready, tinggal set env vars)
- Migrasi data SQLite → Postgres belum ada script (perlu bikin `scripts/migrate-to-supabase.ts`)

### ❌ Not Started
- Migration aktual dari SQLite ke Supabase Postgres (perlu user setup akun Supabase)
- Setup akun cloud asli (Supabase, Cloudflare R2, Firebase FCM) — perlu user lakukan sendiri
- Test production end-to-end (setelah user setup akun cloud)
- Mobile apps (Expo React Native) — roadmap V2+


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
