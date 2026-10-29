# 🕌 SIM MADIN — Sistem Informasi Madrasah Diniyah Terpadu

> Sistem informasi terpadu satu pintu untuk Madrasah Diniyah, dibangun bertahap mulai dari MVP V1 dengan fondasi yang konsisten dan mudah dipelihara.

[![Status](https://img.shields.io/badge/Status-V1.4%20Stable-brightgreen)](docs/CHANGELOG.md)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-blue)](https://prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)

## 📋 Tentang Project

SIM MADIN adalah sistem informasi madrasah yang menghubungkan madrasah, kepala, guru, bendahara, dan wali santri dalam satu ekosistem. Dibangun bertahap sesuai [roadmap.pdf](docs/WALI-AUTH-FLOW.md) — versi V1 saat ini berisi:

- ✅ **Super Admin Web App** (Next.js 16) — 16 modul lengkap
- ✅ **Wali Portal** — login via WhatsApp + PIN, multi-anak
- ✅ **Sistem NIS otomatis** (format YY+6 digit urut per tahun)
- ✅ **Permission matrix** (5 role, 60 permission)
- ✅ **Audit log** otomatis
- ✅ **Production-ready adapters** (Supabase + Cloudflare R2 + Firebase FCM)

## 🚀 Quick Start

### Prasyarat

- Node.js 18+ atau Bun
- Git

### Install & Run

```bash
# Clone repo
git clone https://github.com/mdta01/sim-madin.git
cd sim-madin

# Install dependencies
bun install
# atau: npm install

# Setup database (SQLite untuk dev)
bun run db:push

# Seed data demo
bun run db:seed

# Jalankan dev server
bun run dev
```

Buka `http://localhost:3000`. Server jalan otomatis.

### Akun Demo

| Mode | Login | Password |
|------|-------|----------|
| Super Admin | `admin@madrasah.test` | `admin123` |
| Kepala Madrasah | `kepala@madrasah.test` | `admin123` |
| Bendahara | `bendahara@madrasah.test` | `admin123` |
| Guru | `guru@madrasah.test` | `admin123` |
| Wali (mode wali) | `081234511001` (WA) | `258041` (PIN) |

**Mode Wali:** akses via `http://localhost:3000/?mode=wali` atau klik tombol "Login sebagai Wali Santri" di halaman admin.

## 🏗️ Tech Stack

### Frontend (Web)
- **Next.js 16** (App Router) + TypeScript 5
- React 19 + Server Components
- Tailwind CSS 4 + shadcn/ui (New York)
- Zustand (state client)
- Recharts, Lucide React, next-themes

### Backend
- **Prisma ORM** + SQLite (dev) / **Supabase Postgres** (production)
- **NextAuth.js v4** (web admin) — akan di-migrate ke **Supabase Auth** (V1.5)
- Custom JWT untuk wali (WhatsApp + PIN)
- bcrypt untuk password & PIN hashing

### Storage (Production)
- **Cloudflare R2** (10GB free, no egress) — preferred
- **Firebase Storage** — alternative
- Local storage (`public/uploads/`) — dev fallback

### Push Notification (Production)
- **Firebase Cloud Messaging (FCM)** — gratis unlimited

## 📚 Dokumentasi

Semua dokumentasi ada di folder [`docs/`](docs/):

| File | Isi |
|------|-----|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Keputusan final arsitektur (Supabase all + FCM only + R2) |
| [CHANGELOG.md](docs/CHANGELOG.md) | Status transparan per versi (done/partial/not started) |
| [ROADMAP.md](docs/ROADMAP.md) | Prioritas V1.4 sampai V14 |
| [WALI-AUTH-FLOW.md](docs/WALI-AUTH-FLOW.md) | Logika wali auth + NIS otomatis |
| [SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md) | Step-by-step setup Supabase (DB + Auth + Storage) |
| [SETUP-R2.md](docs/SETUP-R2.md) | Step-by-step setup Cloudflare R2 |
| [SETUP-FCM.md](docs/SETUP-FCM.md) | Step-by-step setup Firebase FCM |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Panduan deployment ke Vercel |
| [MONOREPO.md](docs/MONOREPO.md) | Panduan migrasi ke Nx monorepo |

## 🎯 Fitur Utama V1.4

### Super Admin (16 modul)
1. Dashboard dengan statistik & chart
2. Tahun Ajaran & Semester
3. Data Wali Santri (multi-anak per wali)
4. Data Santri (auto-generate NIS)
5. Data Guru
6. Data Kelas
7. Mata Pelajaran
8. Jadwal Pelajaran
9. Data Absensi (input massal per kelas)
10. Data Nilai (input massal per mapel)
11. Rapor (auto-generate per kelas)
12. Data Tagihan (generate massal)
13. Data Pembayaran (auto-link ke tagihan)
14. Pengumuman (target audience)
15. User & Hak Akses (Permission matrix)
16. Pengaturan Sistem

### Wali Portal
- Login via Nomor WhatsApp + PIN (6 digit)
- Lupa PIN via OTP
- Multi-anak (1 wali → banyak santri)
- Dashboard anak: Profil, Jadwal, Absensi, Nilai, Tagihan, Info
- Access control: wali hanya bisa lihat santri yang ter-link

### Keamanan
- bcrypt password hashing (10 rounds)
- Permission check di semua API route (60 permission codes)
- Audit log otomatis (CREATE/UPDATE/DELETE)
- Rate limiting OTP (max 5/jam)
- Auto-lock 5x salah PIN (15 menit)
- Soft delete untuk data induk

## 🔧 Scripts

```bash
# Development
bun run dev              # Start dev server (port 3000)
bun run lint             # Run ESLint

# Database
bun run db:push          # Push schema ke database
bun run db:generate      # Generate Prisma client
bun run db:migrate       # Run migration (Postgres)
bun run db:seed          # Seed data demo
bun run db:reset         # Reset database

# Production
bun run build            # Build for production
bun run start            # Start production server
```

## 📦 Struktur Project

```
sim-madin/
├── docs/                    # All documentation
├── packages/                # Shared code (untuk monorepo Nx)
│   ├── shared/              # Constants, types, utils
│   ├── database/            # Prisma schema (Postgres-ready)
│   └── api-client/          # Typed API client (web & mobile)
├── prisma/
│   └── schema.prisma        # Database schema (19 model)
├── public/
│   └── uploads/            # Local storage (dev)
├── scripts/
│   ├── seed.ts              # Seed data demo
│   └── patch-permissions.ts # Update permission matrix
├── src/
│   ├── app/
│   │   ├── api/             # API routes (admin + wali + auth)
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # AuthGate (admin/wali switch)
│   ├── components/
│   │   ├── admin/           # Super Admin UI (16 views)
│   │   ├── auth/            # Login & AuthGate
│   │   ├── wali/            # Wali Portal UI
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── auth/             # NextAuth + guards
│   │   ├── firebase/         # Firebase Admin adapter
│   │   ├── supabase/         # Supabase adapter
│   │   ├── storage/          # Storage adapter (R2/Firebase/Local)
│   │   ├── wali/             # Wali auth helpers
│   │   ├── constants.ts     # Re-export dari packages/shared
│   │   ├── db.ts             # Prisma client
│   │   └── api-client.ts    # Client API helper
│   ├── stores/               # Zustand stores
│   └── types/                # TypeScript declarations
├── .env.example              # Template env vars
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

## 🚀 Production Setup

Aplikasi siap production. Setup 3 service cloud (semua free tier):

1. **Supabase** — Database + Auth + Storage (15-20 menit)
   Ikuti: [`docs/SETUP-SUPABASE.md`](docs/SETUP-SUPABASE.md)

2. **Cloudflare R2** — File storage (10-15 menit)
   Ikuti: [`docs/SETUP-R2.md`](docs/SETUP-R2.md)

3. **Firebase FCM** — Push notifications (10-15 menit, optional V1.4, required V1.6+)
   Ikuti: [`docs/SETUP-FCM.md`](docs/SETUP-FCM.md)

**Total biaya: $0/bulan** untuk skala awal madrasah (< 1000 santri, < 50k MAU, < 10GB storage).

## 🗺️ Roadmap

Lihat [`docs/ROADMAP.md`](docs/ROADMAP.md) untuk detail lengkap.

| Versi | Status | Fokus |
|-------|--------|-------|
| V1.0 | ✅ Done | MVP V1 — 16 modul Super Admin |
| V1.1 | ✅ Done | Stabilisasi auth & keamanan |
| V1.2 | ✅ Done | Monorepo adapter + backend pattern |
| V1.3 | ✅ Done | Wali auth (WA+PIN) + NIS auto |
| V1.4 | ✅ Done | Production-ready adapters (Supabase + R2 + FCM) |
| V1.5 | 🚧 Next | Migrate auth ke Supabase Auth |
| V1.6 | 📋 Planned | Firebase FCM push notification |
| V2 | 📋 Planned | Akademik & Pembelajaran |
| V3 | 📋 Planned | Ujian & Rapor Terintegrasi |
| ... | ... | Sampai V14 (Sistem Cerdas) |

## 🤝 Contributing

Kontribusi sangat diterima! Tolong:

1. Fork repo ini
2. Buat branch fitur (`git checkout -b feature/nama-fitur`)
3. Commit perubahan (`git commit -m 'feat: tambah fitur X'`)
4. Push ke branch (`git push origin feature/nama-fitur`)
5. Buat Pull Request

Pakai [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` fitur baru
- `fix:` bug fix
- `docs:` dokumentasi
- `refactor:` refactor tanpa ubah behavior
- `chore:` task maintenance

## 📄 License

MIT License — lihat file [LICENSE](LICENSE) untuk detail.

## 📞 Kontak

- **GitHub Issues**: [https://github.com/mdta01/sim-madin/issues](https://github.com/mdta01/sim-madin/issues)
- **Email**: mdtamiftahululum001@gmail.com

---

<p align="center">
  Dibangun dengan ❤️ untuk Madrasah Diniyah Terpadu<br>
  <sub>"Satu pintu, bertahap, fondasi kuat"</sub>
</p>
