# Mobile Apps Typecheck — Setup & Usage

> Panduan untuk typecheck 4 Expo React Native apps (mobile-bendahara, mobile-guru, mobile-kepala, mobile-wali) dari root workspace tanpa harus install full Expo toolchain.

---

## TL;DR

```bash
# Typecheck Next.js (web app) saja — sudah ada sebelumnya
npm run typecheck

# Typecheck 4 mobile apps + 2 shared packages saja
npm run typecheck:mobile

# Keduanya sekaligus (CI-friendly)
npm run typecheck:all
```

Output yang diharapkan (semua sukses):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MOBILE APPS TYPECHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ packages/shared              ✅ 0 errors     (1.2s)
▸ packages/mobile-shared       ✅ 0 errors     (1.7s)
▸ Bendahara Mobile App         ✅ 0 errors     (2.1s)
▸ Guru Mobile App              ✅ 0 errors     (2.2s)
▸ Kepala Mobile App            ✅ 0 errors     (2.0s)
▸ Wali Mobile App              ✅ 0 errors     (2.2s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULT: 6 passed, 0 failed | 6 projects | 0 total errors
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Latar Belakang

Monorepo SIM MADIN punya 2 konteks TypeScript yang **terpisah**:

1. **Next.js web app** (`src/`) — pakai dependencies React DOM + Next.js + Radix UI + Prisma.
2. **Expo React Native mobile apps** (`apps/mobile-*/`) — pakai dependencies `react-native`, `expo-secure-store`, `@react-navigation/*`, `@expo/vector-icons`, dll.

Masalahnya: ketika typecheck Next.js dengan `npx tsc --noEmit` di root, tsc juga akan men-scan file mobile apps dan crash karena module `react-native` tidak di-install di root workspace (dependencies mobile apps ada di `apps/mobile-*/package.json`, tidak di root).

### Solusi

1. **Root `tsconfig.json`** exclude `apps/mobile-*`, `packages/mobile-shared`, `examples`, `skills` — sehingga typecheck Next.js fokus hanya pada web app.
2. **Setiap mobile app punya `tsconfig.json` sendiri** yang extend `tsconfig.base.json`, dan **include ambient shim file** `apps/mobile-types/rn-shims.d.ts` supaya tsc bisa resolve modul RN tanpa harus install Expo.
3. **Script `scripts/typecheck-mobile.ts`** menjalankan `tsc --noEmit` per app secara berurutan, lalu cetak ringkasan pass/fail.

---

## Struktur File yang Ditambahkan

```
apps/
├── mobile-types/
│   └── rn-shims.d.ts          # Ambient declarations untuk: react-native,
│                               # expo-secure-store, @expo/vector-icons,
│                               # @react-navigation/*, react-native-safe-area-context,
│                               # react-native-screens, react-native-gesture-handler,
│                               # react-native-reanimated, expo-status-bar, expo
├── mobile-bendahara/tsconfig.json   # include shim
├── mobile-guru/tsconfig.json        # include shim
├── mobile-kepala/tsconfig.json      # include shim
└── mobile-wali/tsconfig.json        # include shim
packages/
├── shared/tsconfig.json             # baru — untuk typecheck shared package
└── mobile-shared/tsconfig.json      # baru — include shim + shared
scripts/
└── typecheck-mobile.ts              # runner script
```

---

## Bagaimana Ambient Shim Bekerja

File `apps/mobile-types/rn-shims.d.ts` berisi deklarasi `declare module "react-native" { ... }` untuk semua modul RN yang dipakai mobile apps. Saat tsc menemukan `import { View, Text } from "react-native"` di kode app, tsc resolve ke deklarasi shim (karena pakai asli tidak ada).

**Penting dipahami:**
- Shim bersifat **loose** (kebanyakan `any`-typed). Tujuannya: memastikan import resolve dan struktur kode benar (typo, missing props), BUKAN menggantikan type asli RN.
- Saat developer benar-benar menjalankan `expo start` dari dalam `apps/mobile-bendahara/`, Expo akan install dependencies asli di node_modules lokal, dan tsc akan prefer types asli (lebih akurat) ketimbang shim.
- Jika ada modul RN baru yang dipakai di app tapi belum ada di shim → tambahkan declaration baru di `apps/mobile-types/rn-shims.d.ts`.

---

## Bug Asli yang Ditemukan & Diperbaiki

Saat menjalankan typecheck ini pertama kali, ditemukan 2 bug asli di mobile apps (yang sebelumnya tidak terdeteksi karena apps tidak di-typecheck):

### 1. `apps/mobile-guru/src/App.tsx` — `Picker` unused import
```diff
 import {
   View, Text, TextInput, TouchableOpacity, StyleSheet,
   ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Alert,
-  FlatList, Modal, Picker, Linking,
+  FlatList, Modal, Linking,
 } from "react-native"
```
`Picker` sudah deprecated dari `react-native` core (sejak RN 0.65+, dipindah ke `@react-native-picker/picker`). Tidak digunakan di kode → dihapus.

### 2. `apps/mobile-guru/src/App.tsx` — `styles.statusBadge` & `styles.statusText` tidak didefinisikan
Dipakai di 8+ tempat tapi tidak ada di `StyleSheet.create({ ... })`. Ditambahkan:
```diff
+ statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "transparent" },
+ statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
```

---

## Workflow untuk Developer

### Saat menulis kode mobile app baru

1. Edit kode di `apps/mobile-*/src/`
2. Jalankan: `npm run typecheck:mobile`
3. Jika muncul error "Cannot find module 'X'" → tambahkan `declare module "X"` di `apps/mobile-types/rn-shims.d.ts`
4. Jika muncul error lain (typo, missing prop, dll) → fix di kode app

### Saat menjalankan Expo dev server

```bash
cd apps/mobile-bendahara
npx expo install   # install deps asli ke node_modules lokal app
npx expo start    # Metro bundler + Expo Go / Emulator
```

Typecheck lewat `expo start` akan pakai type packages asli (lebih akurat). `npm run typecheck:mobile` di root tetap berguna untuk CI & verifikasi cepat dari root.

### Saat menambah modul RN baru

1. Tambah import di kode app
2. Jika tsc root tidak kenal → tambahkan deklarasi di `apps/mobile-types/rn-shims.d.ts`:
   ```typescript
   declare module "new-rn-package" {
     export function someFunction(arg: string): Promise<boolean>
     export const SomeComponent: React.ComponentType<{ title?: string }>
   }
   ```
3. Jalankan `npm run typecheck:mobile` untuk verifikasi

---

## CI Integration

Script `scripts/typecheck-mobile.ts` exit dengan code:
- `0` — semua project pass
- `1` — minimal 1 project fail

Cocok untuk GitHub Actions / GitLab CI:

```yaml
# .github/workflows/typecheck.yml
name: Typecheck
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run typecheck:all
```

---

## FAQ

**Q: Kenapa tidak install deps Expo di root workspace saja?**
A: Karena dependencies RN conflict dengan deps Next.js (misal React Native punya React 18.3 ter-pinned, sementara Next.js butuh React 19). Pisah via workspace monorepo + ambient shim adalah pendekatan paling clean.

**Q: Bagaimana kalau shim tidak match dengan API asli RN?**
A: Shim adalah loose types (`any` di banyak tempat). Jika developer menemukan mismatch saat running di Expo, fix di shim atau gunakan types asli via `expo start`.

**Q: Bisakah menjalankan typecheck untuk 1 app saja?**
A: Ya, langsung dari dalam folder app:
```bash
cd apps/mobile-bendahara
npx tsc --noEmit
```
Atau skip shared packages di runner script dengan comment baris terkait di `PROJECTS` array.

**Q: Kenapa mobile-shared dan shared punya tsconfig sendiri?**
A: Supaya tsc bisa verifikasi type consistency pada shared code tanpa harus include full Next.js app. Mereka juga include shim file karena `mobile-shared` import `expo-secure-store`.
