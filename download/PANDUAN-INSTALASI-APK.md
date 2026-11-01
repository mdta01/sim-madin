# Panduan Instalasi APK SIM MADIN

## Masalah: "Apl tidak terpasang"

Error ini muncul ketika mencoba memasang APK di Android. Setelah dianalisis, APK yang dibangun hari ini (1 November 2026, 08:41) sebenarnya **valid dan dapat dipasang**, tetapi Android menolak karena konflik dengan versi yang sudah terpasang.

## Akar Masalah

Dari analisis APK terbaru:

| Item | Status |
|------|--------|
| Ukuran APK | 71 MB ✅ |
| Signature v1 (JAR) | ✅ |
| Signature v2/v3 (APK Signing Block) | ✅ |
| Arsitektur native libs | arm64-v8a, armeabi-v7a, x86, x86_64 ✅ (universal) |
| minSdkVersion | 23 (Android 6.0+) ✅ — mendukung Android 8 |
| targetSdkVersion | 34 (Android 14) ✅ |
| **Version Code** | **1** ❌ (sama untuk SEMUA build) |

**Penyebab utama:**

1. **Version Code konflik** — Setiap build APK dari profile `preview` selalu menggunakan `versionCode: 1`. Android menolak update bila versionCode tidak lebih tinggi dari yang sudah terpasang.
2. **Kemungkinan signature berbeda** — Bila pernah memasang APK dari sumber berbeda (build lokal/debug, atau build EAS sebelumnya yang keystore-nya berbeda), Android akan menolak dengan error yang sama.

## Solusi

### Langkah 1 — Perbaikan Instan (Bagi Pengguna HP)

**Bila aplikasi SIM MADIN sebelumnya masih terpasang di HP:**

1. Buka **Settings** → **Apps** → **SIM MADIN - Wali Santri**
2. Tekan **Uninstall** → konfirmasi
3. Setelah benar-benar terhapus, pasang APK baru
4. Seharusnya berhasil terpasang tanpa error

> Catatan: Tidak perlu khawatir kehilangan data, karena data aplikasi tersimpan di server Supabase (cloud), bukan di HP.

### Langkah 2 — Perbaikan Permanen (Sudah Diterapkan)

Sudah diperbarui file `eas.json` di keempat aplikasi (wali, guru, bendahara, kepala):

```json
"preview": {
  "distribution": "internal",
  "autoIncrement": true,         // ← TAMBAHAN: versionCode naik tiap build
  "credentialsSource": "remote",  // ← TAMBAHAN: keystore stabil dari EAS
  "android": {
    "buildType": "apk",
    "image": "latest"
  },
  ...
}
```

**Efek perbaikan ini:**

- `autoIncrement: true` → Build berikutnya otomatis punya `versionCode: 2, 3, 4, ...` sehingga bisa **update** tanpa uninstall
- `credentialsSource: "remote"` → Pastikan keystore yang sama digunakan untuk semua build (keystore EAS yang dikelola server)

### Langkah 3 — Membangun Ulang APK

Setelah perbaikan `eas.json`, jalankan perintah berikut untuk membangun APK baru dengan versionCode yang sudah naik:

```bash
# Untuk aplikasi Wali Santri
cd apps/mobile-wali
EXPO_TOKEN="KU8CPu24xJxvuVj8dCTIM3ROCYZdULmfKCw_8vqi" \
  eas build --profile preview --platform android --non-interactive

# Untuk aplikasi Guru
cd ../mobile-guru
EXPO_TOKEN="KU8CPu24xJxvuVj8dCTIM3ROCYZdULmfKCw_8vqi" \
  eas build --profile preview --platform android --non-interactive

# Untuk aplikasi Bendahara
cd ../mobile-bendahara
EXPO_TOKEN="KU8CPu24xJxvuVj8dCTIM3ROCYZdULmfKCw_8vqi" \
  eas build --profile preview --platform android --non-interactive

# Untuk aplikasi Kepala Madrasah
cd ../mobile-kepala
EXPO_TOKEN="KU8CPu24xJxvuVj8dCTIM3ROCYZdULmfKCw_8vqi" \
  eas build --profile preview --platform android --non-interactive
```

Setelah build selesai, APK baru bisa diunduh dari URL yang diberikan EAS. VersionCode akan menjadi 2 (atau lebih tinggi bila sudah ada build sebelumnya), sehingga pengguna bisa **meng-update tanpa uninstall**.

## Tips Tambahan untuk Pengguna

### Jika masih gagal setelah uninstall:

1. **Cek ruang penyimpanan** — pastikan minimal 200 MB free space
2. **Matikan Play Protect sementara**:
   - Buka **Play Store** → tap profil → **Play Protect** → matikan **Scan apps with Play Protect** sementara
   - Pasang APK
   - Nyalakan kembali setelah selesai
3. **Izinkan sumber tidak dikenal**:
   - Settings → Apps → Special access → Install unknown apps
   - Pilih browser/pengelola file yang dipakai → aktifkan **Allow from this source**
4. **Cek integritas APK**:
   - Bandingkan ukuran file APK dengan yang ditampilkan EAS
   - Bila berbeda, unduh ulang (kemungkinan corrupt saat unduh)
   - Screenshot menunjukkan kecepatan download 14.3 KB/s — unduh ulang saat koneksi stabil

### Untuk Pengembang

- **Kuota EAS Build**: 30 build/bulan (free plan). Sudah terpakai 2 hari ini.
- **Build profile**: gunakan `preview` (APK, untuk sideload), bukan `production` (AAB, untuk Play Store).
- **File config** yang diubah: `apps/mobile-{wali,guru,bendahara,kepala}/eas.json`
- **Tidak ada perubahan** pada `app.json` (konfigurasi sudah benar; `newArchEnabled` sudah dihapus sebelumnya)

## Verifikasi APK

Untuk mengecek APK secara manual sebelum dipasang:

```bash
# Unduh APK
curl -L -o app.apk "URL_EAS"

# Cek info APK
pip install pyaxmlparser
python3 -c "
from pyaxmlparser import APK
apk = APK('app.apk')
print(f'Package: {apk.package}')
print(f'Version Code: {apk.version_code}')
print(f'Version Name: {apk.version_name}')
print(f'minSdkVersion: {apk.get_min_sdk_version()}')
print(f'targetSdkVersion: {apk.get_target_sdk_version()}')
"

# Cek arsitektur native libs
unzip -l app.apk | grep "^.*lib/" | awk '{print $4}' | sed 's|/[^/]*$||' | sort -u
```

Pastikan:
- `versionCode` lebih tinggi dari yang sudah terpasang di HP
- `minSdkVersion` ≤ versi Android HP (Android 8 = API 26)
- Ada lib untuk arsitektur HP (sebagian besar HP modern = arm64-v8a)
