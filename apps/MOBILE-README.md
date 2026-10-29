# SIM MADIN — Mobile Apps (Expo React Native)

4 mobile apps untuk 4 role berbeda, semua terintegrasi dengan backend yang sama.

## 📱 Struktur Monorepo

```
sim-madin/
├── apps/
│   ├── mobile-wali/          # Wali Santri (WhatsApp + PIN login)
│   ├── mobile-guru/          # Guru (Email + Password, Supabase Auth)
│   ├── mobile-bendahara/     # Bendahara (Email + Password)
│   └── mobile-kepala/        # Kepala Madrasah (Email + Password)
├── packages/
│   ├── shared/               # Constants, types, utils (web + mobile)
│   ├── mobile-shared/        # Mobile-specific: Supabase client, API client, auth
│   ├── database/             # Prisma schema
│   └── api-client/           # Typed API client
├── nx.json                   # Nx config
├── pnpm-workspace.yaml       # Workspace config
└── tsconfig.base.json        # Shared TS paths
```

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js 18+
- npm atau pnpm
- Expo CLI: `npm install -g expo-cli`
- Android Studio (untuk Android) atau Xcode (untuk iOS)

### Setup

```bash
# Clone repo
git clone https://github.com/mdta01/sim-madin.git
cd sim-madin

# Install root dependencies
npm install

# Pilih app yang ingin dijalankan:
```

### Jalan Wali App
```bash
cd apps/mobile-wali
npm install
npx expo start
```
- Scan QR code dengan Expo Go app (Android/iOS)
- Login: `081234511001` / PIN: `258041`

### Jalan Guru App
```bash
cd apps/mobile-guru
npm install
npx expo start
```
- Login: `guru@madrasah.test` / `admin123`

### Jalan Bendahara App
```bash
cd apps/mobile-bendahara
npm install
npx expo start
```
- Login: `bendahara@madrasah.test` / `admin123`

### Jalan Kepala App
```bash
cd apps/mobile-kepala
npm install
npx expo start
```
- Login: `kepala@madrasah.test` / `admin123`

## ⚙️ Environment Variables

Setiap app butuh env vars. Buat file `.env` di masing-masing app folder:

```bash
# apps/mobile-wali/.env (atau set di app.json expo.extra)
EXPO_PUBLIC_API_URL=https://sim-madin.netlify.app
EXPO_PUBLIC_SUPABASE_URL=https://ooglxextkliuhpequwme.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZ2x4ZXh0a2xpdWhwZXF1d21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDYyNzUsImV4cCI6MjEwODc4MjI3NX0.os3Vbdo0TB6z4OrH4b3ZLFQqBpNY1pMN-8LKyhZaK2w
EXPO_PUBLIC_WALI_JWT_SECRET=sim-madin-dev-secret-change-in-production-2025
```

## 🏗️ Build APK / IPA

### Android APK (untuk distribusi)
```bash
cd apps/mobile-wali
eas build --platform android --profile preview
```

### iOS (butuh Apple Developer account)
```bash
cd apps/mobile-wali
eas build --platform ios --profile preview
```

## 🔗 Backend Integration

Semua mobile apps terhubung ke:
- **API**: https://sim-madin.netlify.app (Next.js di Netlify)
- **Database**: Supabase Postgres (Singapore region)
- **Auth**: Supabase Auth (admin/guru/bendahara/kepala) + Custom JWT (wali)
- **Storage**: Local/Cloudflare R2 (production)

## 🎨 Color Theme per App

| App | Primary Color | Icon |
|-----|--------------|------|
| Wali | Emerald `#059669` | people-circle |
| Guru | Orange `#ea580c` | school |
| Bendahara | Violet `#7c3aed` | wallet |
| Kepala | Blue `#2563eb` | analytics |

## 📋 Fitur per App

### Wali Santri (`mobile-wali`)
- ✅ Login WhatsApp + PIN
- ✅ List anak (multi-anak per wali)
- ✅ Detail santri: Profil, Absensi, Nilai, Tagihan
- ✅ Quick stats absensi (hadir/sakit/izin/alfa)
- ✅ Tagihan summary (lunas/cicil/belum bayar)
- ✅ SecureStore untuk session persistence
- 🔜 Lupa PIN via OTP
- 🔜 Push notification (FCM)

### Guru (`mobile-guru`)
- ✅ Login Email + Password (Supabase Auth)
- ✅ Dashboard dengan jadwal hari ini
- ✅ Jadwal lengkap semua hari
- 🔜 Input absensi cepat per kelas
- 🔜 Input nilai per santri
- 🔜 Catatan santri

### Bendahara (`mobile-bendahara`)
- ✅ Login Email + Password (Supabase Auth)
- ✅ Dashboard keuangan (total pemasukan)
- ✅ Riwayat pembayaran (10 terakhir)
- 🔜 Input pembayaran baru
- 🔜 Daftar tunggakan
- 🔜 Rekap keuangan

### Kepala Madrasah (`mobile-kepala`)
- ✅ Login Email + Password (Supabase Auth)
- ✅ Dashboard monitoring (6 stat cards)
- ✅ Absensi hari ini (hadir/sakit/izin/alfa)
- ✅ Distribusi santri per kelas
- 🔜 Grafik & laporan
- 🔜 Monitoring guru
