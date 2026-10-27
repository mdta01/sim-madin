# SIM MADIN — Sistem Informasi Madrasah Diniyah Terpadu

Sistem informasi terpadu satu pintu untuk Madrasah Diniyah, dibangun secara bertahap mulai dari **MVP V1** dengan fondasi yang konsisten dan mudah dipelihara.

## 🎯 Visi & Filosofi

> **"Satu pintu, bertahap, fondasi kuat"**

Aplikasi ini dirancang sebagai **satu ekosistem** yang menghubungkan madrasah, kepala, guru, bendahara, dan wali santri. Meskipun fitur dibangun bertahap (V1 → V14), struktur database, API, role/permission, dan arsitektur data sejak V1 sudah disiapkan agar V2–V14 bisa masuk **tanpa bongkar total**.

### Prinsip Fondasi (wajib dari V1)

1. ✅ **Role & Permission** — bukan hard-code akses per aplikasi
2. ✅ **Satu Data Santri** — single source of truth, tidak ada duplikasi
3. ✅ **Satu Data Wali** — satu wali bisa punya banyak anak
4. ✅ **Riwayat Data** — AuditLog + soft delete (`deletedAt`)
5. ✅ **Tahun Ajaran & Semester** — semua data akademik terikat
6. ✅ **Data Keuangan Terhubung Santri** — tagihan & pembayaran otomatis ter-link
7. ✅ **Modular** — fitur baru bisa ditambah tanpa merombak sistem utama
8. ✅ **Backup** — siap untuk strategi backup berkala
9. ✅ **Keamanan** — setiap role hanya akses sesuai kewenangan
10. ✅ **Mobile First** — pengguna lapangan utama pakai HP

## 🏗️ Arsitektur Monorepo (Target Production)

Struktur target menggunakan **Nx + pnpm workspaces**. Saat ini (MVP V1 preview), struktur diadaptasi ke single Next.js app agar bisa langsung dipreview, namun kode sudah ditata agar mudah dipindah ke struktur monorepo.

```
madrasah-diniyah/
├── apps/
│   ├── super-admin/              # ✅ Next.js 16 — Web App Super Admin (SUDAH DIBANGUN)
│   │   ├── src/
│   │   │   ├── app/              # App router
│   │   │   ├── components/admin/ # Shared components
│   │   │   ├── stores/           # Zustand stores
│   │   │   └── lib/              # API client, utils
│   │   └── package.json
│   ├── mobile-kepala/            # 📋 Expo React Native — Kepala Madrasah
│   ├── mobile-bendahara/         # 📋 Expo React Native — Bendahara
│   ├── mobile-guru/              # 📋 Expo React Native — Guru
│   └── mobile-wali/              # 📋 Expo React Native — Wali Santri
│
├── packages/
│   ├── database/                 # Prisma schema (SHARED — saat ini di super-admin/prisma)
│   │   ├── schema.prisma
│   │   ├── seeds/
│   │   └── migrations/
│   ├── shared/                   # Constants, types, helpers
│   │   ├── src/
│   │   │   ├── constants.ts      # ← SUDAH DIBANGUN (lihat src/lib/constants.ts)
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   ├── ui/                       # Shared React Native + Web components
│   └── api-client/               # Tipe-safe API client (untuk semua app)
│
├── nx.json                       # Nx config
├── pnpm-workspace.yaml
└── package.json
```

### Status Pembangunan

| Komponen | Status | Catatan |
|----------|--------|---------|
| `apps/super-admin` (Next.js) | ✅ **V1 Complete** | 15 modul + dashboard + RBAC |
| `apps/mobile-*` (Expo) | 📋 Roadmap V1+ | Belum mulai, prioritas setelah backend stabil |
| `packages/database` | ✅ V1 schema | 19 model, soft delete, audit log, siap V2-V14 |
| `packages/shared` | ✅ V1 constants | Sebagian, tinggal pindah ke package |
| Backend Supabase | 📋 Production setup | Saat ini pakai Prisma+SQLite untuk dev |
| Auth Firebase | 📋 Production setup | Saat ini pakai placeholder hash |

## 🛠️ Tech Stack

### Frontend (Sudah Berjalan)
- **Next.js 16** (App Router) dengan TypeScript 5
- **React 19** + Server Components
- **Tailwind CSS 4** + **shadcn/ui** (New York style)
- **Zustand** untuk state management
- **TanStack Query** untuk server state (tersedia)
- **Recharts** untuk chart
- **Lucide React** untuk ikon
- **next-themes** untuk dark/light mode

### Backend (Dev → Production Plan)
| Komponen | Dev (sekarang) | Production (target) |
|----------|----------------|---------------------|
| Database | SQLite + **Prisma ORM** | **Supabase Postgres** + Prisma |
| Auth | Placeholder hash | **Firebase Auth** |
| Storage | Local | **Firebase Storage** (untuk foto santri/guru, bukti transfer) |
| Push Notification | - | **Firebase Cloud Messaging** |
| Hosting | Next.js dev server | Vercel / Netlify untuk web app |

### Mobile (Roadmap V1+)
- **Expo React Native** (managed workflow)
- **NativeWind** (Tailwind untuk RN)
- Navigation: `expo-router`
- State: Zustand + TanStack Query
- Auth: Firebase Auth SDK
- Push: Firebase Cloud Messaging

## 📦 Modul Super Admin V1 (15 Modul)

Sesuai dokumen "KONSEP MVP VERSI 1":

1. ✅ **Dashboard** — Statistik agregat, chart pemasukan, absensi hari ini, distribusi per kelas, recent payments & announcements
2. ✅ **Tahun Ajaran & Semester** — CRUD, set aktif, auto-create semester Ganjil/Genap
3. ✅ **Data Wali Santri** — CRUD, link multi santri (satu wali → banyak anak)
4. ✅ **Data Santri** — CRUD, link wali+kelas+tahun ajaran, detail dengan tabs (Profil, Absensi, Nilai, Tagihan, Rapor)
5. ✅ **Data Guru** — CRUD, wali kelas assignment, jadwal mengajar, statistik
6. ✅ **Data Kelas** — CRUD, wali kelas, daftar santri, kapasitas, jadwal
7. ✅ **Mata Pelajaran** — CRUD, KKM, kategori (Al-Qur'an, Diniyah, Bahasa, Umum)
8. ✅ **Jadwal Pelajaran** — Tambah jadwal, tampilan per hari, link guru+mapel+kelas
9. ✅ **Data Absensi** — Input massal per kelas per hari, status HADIR/SAKIT/IZIN/ALFA, rekap
10. ✅ **Data Nilai** — Input massal per kelas per mapel per jenis nilai, auto-calc average
11. ✅ **Rapor** — Generate massal per kelas, rekap nilai per mapel + ranking + rata-rata + absensi
12. ✅ **Data Tagihan** — Jenis tagihan, generate massal per kelas, status LUNAS/CICIL/BELUM_BAYAR
13. ✅ **Data Pembayaran** — Catat pembayaran, link ke tagihan (auto-update status), metode TUNAI/TRANSFER/QRIS
14. ✅ **Pengumuman** — CRUD, target audience (ALL/GURU/WALI/KELAS), prioritas
15. ✅ **User & Hak Akses** — CRUD user, assign multi-role, **Role management + Permission matrix per modul**
16. ✅ **Pengaturan Sistem** — Profil madrasah, info versi, referensi konfigurasi

## 🗄️ Skema Database (19 Model)

Lihat `prisma/schema.prisma` untuk detail lengkap. Highlight fondasi:

### Inti Autentikasi & RBAC
- `User`, `Role`, `Permission`, `UserRole`, `RolePermission`
- 5 role default: `SUPER_ADMIN`, `KEPALA`, `BENDAHARA`, `GURU`, `WALI`
- 60 permission (4 actions × 15 modules)
- Role sistem (tidak bisa dihapus) vs custom role

### Akademik
- `TahunAjaran`, `Semester`, `Kelas`, `MataPelajaran`, `Jadwal`
- `Absensi`, `Nilai`, `Rapor`

### Data Induk
- `Santri`, `Wali`, `Guru`
- Santri ↔ Wali (many-to-one), Santri ↔ Kelas (many-to-one), Santri ↔ TahunAjaran
- Wali bisa punya banyak anak (satu wali → banyak santri)

### Keuangan
- `JenisTagihan`, `Tagihan`, `Payment`
- Auto-calc paidAmount & status pada pembayaran
- Auto reverse pada delete pembayaran

### Sistem
- `Announcement` (pengumuman dengan target audience)
- `AuditLog` (riwayat perubahan, foundation untuk V11 analytics)
- `SystemSetting` (key-value settings)

### Pola yang Sudah Diterapkan
- ✅ **Soft delete** untuk User, Wali, Santri, Guru, Kelas, MataPelajaran (field `deletedAt`)
- ✅ **Audit log** dengan user, action, module, entityId
- ✅ **Tahun ajaran & semester** terikat di semua data akademik
- ✅ **Foreign key constraint** dengan onDelete: Cascade untuk data turunan
- ✅ **Unique constraint** untuk mencegah duplikasi (NIS, NISN, kode kelas, dll)

## 🚀 Cara Menjalankan (Dev)

```bash
# Install dependencies
bun install

# Push skema database & generate Prisma client
bun run db:push

# Seed data demo
bun run db:seed

# Jalankan dev server (otomatis berjalan di sandbox)
bun run dev

# Lint
bun run lint
```

### Default Admin User (Demo)
- Email: `admin@madrasah.test`
- Username: `admin`
- (Password belum diimplementasi full — pakai placeholder. Implementasi bcrypt + NextAuth di roadmap produksi)

### Data Demo yang Sudah Ter-seed
- 5 role + 60 permission + matrix role-permission
- 1 tahun ajaran aktif (2025/2026) + 2 semester
- 5 jenis tagihan (Syahriyah, Uang Ujian, dll)
- 6 mata pelajaran (Quran, Tauhid, Fikih, Akhlak, SKI, Bahasa Arab)
- 5 guru (3 di antaranya wali kelas)
- 3 kelas (MDA-1A, MDA-2A, MDA-3A)
- 5 wali
- 15 santri (5 per kelas)
- Tagihan Syahriyah bulan ini untuk semua santri
- 7 pembayaran contoh (5 lunas + 2 cicil)
- Absensi 5 hari terakhir (90% hadir, 10% lainnya)
- 3 pengumuman contoh

## 🔐 Sistem Role & Permission

### 5 Role Default
| Role | Deskripsi | Permission |
|------|-----------|------------|
| `SUPER_ADMIN` | Akses penuh | Semua (60) |
| `KEPALA` | Monitoring | Read semua + pengumuman |
| `BENDAHARA` | Keuangan | Tagihan, Pembayaran, Santri (read), Pengumuman |
| `GURU` | Operasional akademik | Absensi, Nilai (CRUD) + Read Santri/Kelas/Mapel/Jadwal/Rapor |
| `WALI` | Pantau anak | Read Santri/Tagihan/Pembayaran/Rapor/Absensi/Nilai/Pengumuman |

### Custom Role & Multi-Role
- Admin bisa membuat role custom (mis. `GURU_WALI_KELAS`)
- **Satu User bisa punya banyak role** — contoh: seorang Guru bisa juga jadi Wali Kelas dengan akses tambahan
- Permission matrix per modul (15 modul × 4 actions = 60 permission)
- Role sistem (`SUPER_ADMIN`, `KEPALA`, dll) tidak bisa dihapus

### Roadmap Produksi
- Implementasi **NextAuth.js v4** untuk session management
- **bcrypt** untuk hashing password
- **Firebase Auth** untuk mobile apps
- Middleware Next.js untuk proteksi route berbasis permission

## 🗺️ Roadmap Versi Berikutnya

Sesuai dokumen "ROADMAP PENGEMBANGAN APLIKASI MADRASAH DINIYAH TERPADU":

| Versi | Fokus | Status |
|-------|-------|--------|
| **V1** | Fondasi & operasional inti | ✅ **Selesai** |
| V2 | Akademik & Pembelajaran (materi, tugas, nilai harian) | 📋 |
| V3 | Ujian & Rapor Terintegrasi (bank soal, ujian online, cetak PDF) | 📋 |
| V4 | Perkembangan Santri (Al-Qur'an, kitab, akhlak, pembinaan) | 📋 |
| V5 | Keuangan Terintegrasi (kas, rekening, honor guru, QRIS) | 📋 |
| V6 | Komunikasi & Notifikasi (chat internal, WhatsApp integration) | 📋 |
| V7 | Administrasi & Dokumen (surat otomatis, sertifikat) | 📋 |
| V8 | QR Code & Digitalisasi (QR absensi, digital card) | 📋 |
| V9 | Perpustakaan & Inventaris | 📋 |
| V10 | Kelulusan & Alumni | 📋 |
| V11 | Dashboard & Analitik Madrasah | 📋 |
| V12 | Integrasi Penuh | 📋 |
| V13 | PPDB & Penerimaan Santri Baru | 📋 |
| V14 | Sistem Cerdas / Advanced | 📋 |

> **Penting:** Versi-versi ini bukan proyek terpisah, melainkan **satu proyek besar yang dibangun bertahap**. Database, API, dan struktur V1 sudah disiapkan agar V2-V14 bisa masuk tanpa bongkar total.

## 🎨 Desain UI

- **Light/Dark mode** via `next-themes`
- **Responsive** — mobile-first (sidebar collapsible di mobile)
- **shadcn/ui** (New York style) untuk konsistensi visual
- **Tailwind CSS 4** dengan CSS variables untuk theming
- **Lucide React** untuk ikon (konsisten di seluruh app)
- **Sticky header** dengan breadcrumb dan quick actions
- **Footer** yang selalu di bawah (sticky footer pattern)

## 🔌 Pola API

- RESTful: `GET /api/admin/{resource}`, `POST`, `PUT /api/admin/{resource}/{id}`, `DELETE`
- Setiap response: `{ data: ... }` untuk single, `{ data: [...], total: n }` untuk list
- Error: `{ error: "message" }` dengan HTTP status code
- Bulk operation: `{ bulk: true, ... }` untuk generate massal (tagihan, rapor)
- Upsert pattern: check existing by unique constraint, update or create

## 📁 Struktur Folder Saat Ini

```
src/
├── app/
│   ├── api/admin/          # API routes (15 resources)
│   │   ├── dashboard/
│   │   ├── santri/         # [+id]
│   │   ├── wali/
│   │   ├── guru/
│   │   ├── kelas/
│   │   ├── mapel/
│   │   ├── jadwal/
│   │   ├── tahun-ajaran/
│   │   ├── absensi/
│   │   ├── nilai/
│   │   ├── rapor/
│   │   ├── tagihan/
│   │   ├── pembayaran/
│   │   ├── pengumuman/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── jenis-tagihan/
│   │   └── settings/
│   ├── layout.tsx          # Root layout dengan ThemeProvider
│   └── page.tsx            # Render AdminLayout
│
├── components/
│   ├── admin/
│   │   ├── admin-layout.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── shared/          # Reusable admin components
│   │   │   ├── page-header.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── data-table-toolbar.tsx
│   │   │   ├── status-badge.tsx
│   │   │   └── states.tsx   # Loading, Empty, Error states
│   │   └── views/           # 15 view modul
│   │       ├── dashboard-view.tsx
│   │       ├── tahun-ajaran-view.tsx
│   │       ├── wali-view.tsx
│   │       ├── santri-view.tsx
│   │       ├── guru-view.tsx
│   │       ├── kelas-view.tsx
│   │       ├── mapel-view.tsx
│   │       ├── jadwal-view.tsx
│   │       ├── absensi-view.tsx
│   │       ├── nilai-view.tsx
│   │       ├── rapor-view.tsx
│   │       ├── tagihan-view.tsx
│   │       ├── pembayaran-view.tsx
│   │       ├── pengumuman-view.tsx
│   │       ├── users-view.tsx
│   │       └── pengaturan-view.tsx
│   ├── theme-provider.tsx
│   └── ui/                  # shadcn/ui components
│
├── lib/
│   ├── constants.ts         # Shared constants (akan jadi packages/shared)
│   ├── api-client.ts        # API fetch helper
│   ├── db.ts                # Prisma client
│   └── utils.ts
│
├── stores/
│   └── admin-store.ts       # Zustand navigation store
│
└── hooks/
    ├── use-toast.ts
    └── use-mobile.ts
```

## 🤝 Catatan untuk Developer Selanjutnya

### Saat Menambah Modul Baru (V2+)
1. Tambahkan model di `prisma/schema.prisma` (gunakan pola soft delete + audit)
2. Jalankan `bun run db:push`
3. Buat API route di `src/app/api/admin/{module}/`
4. Buat view di `src/components/admin/views/{module}-view.tsx`
5. Tambahkan menu item di `MENU_ITEMS` (`src/lib/constants.ts`)
6. Tambahkan case di `AdminLayout` (`src/components/admin/admin-layout.tsx`)
7. Tambahkan permission codes untuk modul baru + assign ke role yang sesuai

### Saat Migrasi ke Monorepo
1. Buat struktur `apps/` dan `packages/` sesuai target
2. Pindahkan `prisma/` ke `packages/database/`
3. Pindahkan `src/lib/constants.ts` ke `packages/shared/src/`
4. Pindahkan `src/app/` ke `apps/super-admin/src/app/`
5. Pindahkan API client ke `packages/api-client/`
6. Setup `nx.json` dan `pnpm-workspace.yaml`
7. Update import paths

### Saat Migrasi Backend ke Supabase
1. Buat akun Supabase, ambil connection string
2. Update `DATABASE_URL` di `.env`
3. Update `prisma/schema.prisma` provider dari `sqlite` ke `postgresql`
4. Jalankan `bun run db:push` untuk sinkronisasi
5. Data demo tetap bisa di-seed ulang

### Saat Implementasi Auth Asli
1. Install `bcrypt` untuk hashing password
2. Setup `NextAuth.js` dengan CredentialsProvider
3. Implementasi middleware untuk proteksi route + permission check
4. Ganti placeholder passwordHash di seed dengan bcrypt hasil asli
5. Untuk mobile: pakai Firebase Auth SDK + custom token Supabase

## 📞 Kontak & Lisensi

© 2025 SIM MADIN Team. Dibangun untuk Madrasah Diniyah Terpadu.
Dokumentasi lengkap: lihat `KONSEP MVP VERSI 1.pdf` dan `roadmap.pdf` di folder `upload/`.
