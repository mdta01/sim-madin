# Alur Autentikasi Wali Santri & Sistem NIS — SIM MADIN

> Dokumen ini adalah catatan resmi logika wali auth dan NIS.
> Semua perubahan kode harus mengikuti aturan di sini.

## 🔑 Konsep Identitas (Penting!)

Ada 4 identitas yang berbeda dan TIDAK boleh tertukar:

| Identitas | Penentu | Kegunaan | Bisa Berubah? |
|-----------|---------|----------|---------------|
| **ID Sistem** | Database (cuid) | Identitas internal database, foreign key | Tidak pernah |
| **NIS** | Sistem generate otomatis | Identitas permanen santri | Tidak (kecuali override admin untuk santri lama) |
| **Nomor WhatsApp** | Diisi admin saat daftar santri | Identitas login akun wali | Bisa, lewat admin (dengan riwayat) |
| **Relasi Wali-Santri** | Diatur admin via pivot table | Penentu anak mana yang bisa dilihat wali | Bisa diubah admin kapan saja |

**Aturan keamanan:**
- Nomor WhatsApp **bukan** penentu kepemilikan data otomatis
- Hubungan data harus:
  ```
  Akun Wali → Data Wali → Relasi Wali-Santri → Santri
  ```
- Wali hanya bisa lihat santri yang sudah di-link oleh madrasah
- Tidak boleh ada orang yang cukup masukkan NIS anak orang lain lalu bisa lihat datanya

---

## 📋 Sistem NIS Otomatis

### Format NIS
- **Format**: `YY` (2 digit tahun masuk) + `NNNNNN` (6 digit urut per tahun, zero-padded)
- **Contoh**:
  - Santri pertama tahun 2026: `26000001`
  - Santri kedua tahun 2026: `26000002`
  - Santri pertama tahun 2027: `27000001`
- **Total**: 8 digit

### Karakteristik
- Dibuat **otomatis** oleh sistem saat santri baru didaftarkan
- Identitas **permanen** — tidak berubah saat naik kelas, pindah kelas, atau lulus
- **Unik** — sistem menjamin tidak ada NIS kembar via unique constraint + race-condition-safe query
- Admin **bisa override** untuk santri lama yang sudah punya NIS resmi (input manual di form)

### Alur Generate NIS
```
Admin input santri baru
↓
Cek apakah NIS diisi manual?
  → Ya: validasi unique, simpan apa adanya
  → Tidak: sistem generate otomatis
↓
Generate: ambil tahun sekarang (2 digit)
↓
Query: SELECT MAX(sequence) FROM santri WHERE nis LIKE 'YY______'
↓
Next sequence = max + 1
↓
Format: YY + sequence zero-padded 6 digit
↓
Simpan ke DB
```

### Override NIS (untuk santri lama)
- Admin klik "Edit NIS" di form santri
- Sistem tampilkan warning: "NIS adalah identitas permanen. Ubah hanya untuk santri lama yang sudah punya NIS resmi."
- Setelah diubah, NIS baru juga harus unique
- Audit log mencatat perubahan NIS dengan alasan

---

## 🔄 Alur Pendaftaran Akun Wali Santri

### A. Saat Santri Baru Didaftarkan

```
Admin/Super Admin input data santri:
  - Nama santri
  - Tanggal lahir, jenis kelamin, alamat
  - Kelas
  - Tahun ajaran
  - Nama wali
  - Nomor WhatsApp wali
  - Hubungan (Ayah/Ibu/Wali)
↓
Sistem simpan data santri
↓
Sistem generate NIS otomatis (jika tidak diisi manual)
↓
Sistem cek nomor WA wali:
  - Sudah ada di DB? → link santri ke wali tersebut (SantriWali pivot)
  - Belum ada? → buat Wali baru dengan status "PENDING" + link ke santri
↓
Sistem generate activation token + OTP (6 digit)
↓
Sistem kirim undangan aktivasi (link berisi token)
  (Dev mode: tampilkan link & OTP di response. Production: kirim via WhatsApp)
↓
Sistem tampilkan ke admin:
  "✅ Santri didaftarkan. NIS: 26000001"
  "📱 Undangan aktivasi akun wali: https://madin.id/activate?token=xxx"
  "🔑 Kode OTP (dev): 123456"
```

### B. Aktivasi Akun Wali

Wali menerima link/undangan aktivasi (via WA atau langsung dari admin).

```
Wali buka link aktivasi
↓
Halaman aktivasi menampilkan:
  "Akun Wali untuk: Bapak Muhammad"
  "Terhubung dengan santri: Ahmad (NIS: 26000001)"
↓
Wali masukkan nomor WhatsApp (verifikasi)
↓
Sistem generate & kirim OTP 6 digit (dev: tampilkan, prod: WhatsApp)
↓
Wali masukkan OTP
↓
Sistem verify OTP (cek token + OTP + expiry + attempts)
↓
Wali buat PIN (6 digit) + konfirmasi PIN
↓
Sistem hash PIN (bcrypt) + set status "ACTIVE" + clear OTP
↓
Akun aktif → redirect ke login wali
```

### C. Login Wali (WhatsApp + PIN)

```
Wali buka halaman login wali (mode=wali atau subdomain wali.madin.id)
↓
Wali masukkan:
  - Nomor WhatsApp (62xxx atau 08xxx)
  - PIN (6 digit)
↓
Sistem normalize nomor WA (08xxx → 628xxx)
↓
Sistem cari Wali by phone + activationStatus="ACTIVE"
↓
Sistem verify PIN (bcrypt.compare)
↓
Sistem create session JWT:
  - waliId
  - phone
  - name
  - santriIds[] (list anak yang terhubung & canAccess=true)
↓
Wali masuk ke Dashboard Wali
```

### D. Dashboard Wali — Multi-Anak

```
Wali login berhasil
↓
Sistem query SantriWali where waliId=current AND canAccess=true
↓
Tampilkan kartu untuk setiap santri:
  "Anak Saya"
  👦 Ahmad — NIS 26000001 — Kelas 4
  👧 Fatimah — NIS 25001002 — Kelas 2
  👦 Ali — NIS 26001003 — Kelas 1
↓
Wali klik salah satu anak
↓
Sistem verify: SantriWali exists where waliId=current AND santriId=clicked
  - Jika ada → tampilkan detail santri dengan tabs
  - Jika tidak ada → 403 Forbidden
↓
Tabs yang tersedia:
  - Profil Santri
  - Jadwal
  - Absensi (30 hari terakhir)
  - Nilai (per mapel)
  - Rapor (semester ini)
  - Perkembangan (V2 — belum di MVP V1)
  - Prestasi (V2)
  - Tagihan (status per tagihan)
  - Riwayat Pembayaran
  - Pengumuman (filter audience=WALI atau KELAS)
```

### E. Jika Nomor WhatsApp Wali Berubah

```
Admin buka data wali → klik "Ganti Nomor WhatsApp"
↓
Admin input:
  - Nomor baru
  - Alasan perubahan (opsional)
↓
Sistem simpan PhoneChangeLog:
  - waliId
  - oldPhone → newPhone
  - changedById (admin yang mengubah)
  - changedAt
  - reason
↓
Sistem update Wali.phone = newPhone
↓
Sistem set activationStatus = "PENDING" (wajib re-verify)
↓
Sistem generate OTP baru, kirim ke nomor baru
↓
Wali harus aktivasi ulang dengan OTP + PIN baru
  (PIN lama di-reset, wali buat PIN baru)
↓
Data santri TIDAK hilang — relasi SantriWali tetap utuh
```

### F. Jika Satu Santri Memiliki Ayah dan Ibu

Database mendukung multiple wali per santri via pivot table `SantriWali`.

```
Admin buka detail santri → tab "Wali"
↓
Tambah wali:
  - Nama: Siti
  - No. WA: 62xxx
  - Hubungan: Ibu
  - Wali Utama? Tidak (Ayah sudah jadi wali utama)
  - Bisa Akses? Ya
↓
Sistem buat Wali baru (atau link jika no WA sudah ada)
↓
Sistem create SantriWali record:
  - santriId
  - waliId (wali Siti)
  - relationship = "IBU"
  - isPrimary = false
  - canAccess = true
↓
Wali Siti aktivasi akun seperti biasa
↓
Wali Siti login → lihat santri yang sama dengan wali Ayah
```

**Field di SantriWali:**
- `santriId` — foreign key ke Santri
- `waliId` — foreign key ke Wali
- `relationship` — AYAH | IBU | WALI | KAKEK | NENEK | PAMAN | BIBI
- `isPrimary` — boolean, true untuk wali utama (1 per santri)
- `canAccess` — boolean, admin bisa disable akses wali tertentu tanpa hapus relasi
- Unique constraint: [santriId, waliId] — tidak boleh ada relasi ganda

### G. Jika Wali Belum Punya WhatsApp

```
Admin input data wali tanpa nomor WA:
  - Nama wali: Bapak Hasan
  - No. WA: (kosong)
↓
Sistem tetap simpan Wali dengan phone=null
↓
Sistem set activationStatus = "PENDING_NO_PHONE"
↓
Sistem tampilkan ke admin:
  "⚠️ Wali belum punya nomor WhatsApp. Akun belum bisa diaktifkan."
  "Klik 'Tambah Nomor WA' kapan saja setelah wali punya nomor."
↓
Nanti ketika admin input nomor WA:
  - Sistem update phone
  - Sistem set activationStatus = "PENDING"
  - Sistem generate OTP & link aktivasi
  - Wali bisa aktivasi seperti biasa
```

### H. Jika Wali Lupa PIN/Password

```
Wali buka halaman login → klik "Lupa PIN?"
↓
Wali masukkan nomor WhatsApp
↓
Sistem cek: Wali with phone=... AND activationStatus="ACTIVE"
  - Jika tidak ada → "Nomor tidak terdaftar atau belum aktif"
  - Jika ada → generate OTP 6 digit, simpan dengan expiry 15 menit
↓
Sistem kirim OTP (dev: tampilkan, prod: WhatsApp)
↓
Wali masukkan OTP
↓
Sistem verify OTP
↓
Wali buat PIN baru + konfirmasi
↓
Sistem hash PIN baru + clear OTP + tetap "ACTIVE"
↓
Wali bisa login dengan PIN baru
```

**Tidak perlu datang ke admin** untuk reset PIN.

---

## 🛡️ Aturan Keamanan

### 1. Verifikasi Akses Santri
Setiap endpoint yang akses data santri WAJIB cek relasi:
```ts
const link = await db.santriWali.findFirst({
  where: {
    waliId: currentWaliId,
    santriId: requestedSantriId,
    canAccess: true,
  },
})
if (!link) return 403 Forbidden
```

### 2. OTP Rate Limiting
- Max 3 attempt per OTP code
- Setelah 3x salah, OTP invalidated, wali harus request OTP baru
- Max 5 OTP request per nomor per jam (anti-spam)

### 3. PIN Policy
- 6 digit angka
- Hash dengan bcrypt (10 rounds)
- Tidak boleh "123456" atau "000000" (blacklist PIN lemah)
- Setelah 5x salah login berturut-turut, akun di-suspend 15 menit

### 4. Session Management
- JWT token, expired 7 hari
- Refresh token otomatis saat user aktif
- Logout = clear token di client + invalidate di server (optional blacklist)

### 5. Phone Normalization
- Format input: `08xxx`, `628xxx`, `+628xxx` — semua diterima
- Disimpan normalized: `628xxx` (format international Indonesia)
- Cek unique saat input/ubah

---

## 🗄️ Schema Database (Tambahan)

### Tabel Baru: `SantriWali` (pivot multi-wali)
```prisma
model SantriWali {
  id           String   @id @default(cuid())
  santriId     String
  waliId       String
  relationship String   // AYAH | IBU | WALI | KAKEK | NENEK | PAMAN | BIBI
  isPrimary    Boolean  @default(false)
  canAccess    Boolean  @default(true)
  createdAt    DateTime @default(now())

  santri       Santri   @relation(...)
  wali         Wali     @relation(...)

  @@unique([santriId, waliId])
  @@index([waliId])
}
```

### Tabel Baru: `WaliActivation` (track OTP & token)
```prisma
model WaliActivation {
  id           String   @id @default(cuid())
  waliId       String
  token        String   @unique  // untuk link aktivasi
  otpCode      String   // 6 digit OTP
  type         String   // INVITE | FORGOT_PIN | CHANGE_PHONE
  expiresAt    DateTime
  usedAt       DateTime?
  attempts     Int      @default(0)
  createdAt    DateTime @default(now())

  @@index([waliId])
  @@index([token])
  @@index([type, expiresAt])
}
```

### Tabel Baru: `PhoneChangeLog` (riwayat perubahan nomor WA)
```prisma
model PhoneChangeLog {
  id           String   @id @default(cuid())
  waliId       String
  oldPhone     String?
  newPhone     String
  changedById  String?  // admin yang mengubah
  changedAt    DateTime @default(now())
  reason       String?

  @@index([waliId])
}
```

### Field Tambahan di `Wali`
```prisma
model Wali {
  // existing fields...
  phone         String   @unique  // WAJIB unique untuk login wali
  activationStatus String @default("PENDING")  // PENDING | PENDING_NO_PHONE | ACTIVE | SUSPENDED
  activationToken String?
  activationExpiresAt DateTime?
  pinHash       String?  // PIN yang di-hash
  otpCode       String?  // OTP aktif saat ini
  otpExpiresAt  DateTime?
  otpAttempts   Int      @default(0)
  failedLoginAttempts Int @default(0)
  lockedUntil   DateTime?
  // ...
}
```

### Field di `Santri` (tetap dipertahankan untuk backward compat)
- `waliId` tetap ada sebagai shortcut ke wali utama (isPrimary=true di pivot)
- Saat create santri: set `santri.waliId` = waliId utama + create SantriWali record

---

## 📁 Struktur API Endpoints (Wali)

### Public (tanpa auth)
- `POST /api/wali/request-otp` — request OTP untuk aktivasi/lupa PIN
  - Body: `{ phone, type: "INVITE" | "FORGOT_PIN" }`
  - Return: `{ message, expiresIn }` (OTP tidak di-return di production)

- `POST /api/wali/verify-otp` — verify OTP
  - Body: `{ phone, otpCode }`
  - Return: `{ verifyToken }` (token sementara untuk set-pin)

- `POST /api/wali/set-pin` — set PIN baru (after verify OTP)
  - Body: `{ verifyToken, pin }`
  - Return: `{ success, message }`

- `POST /api/wali/login` — login dengan WA + PIN
  - Body: `{ phone, pin }`
  - Return: `{ token, wali: {...}, santriList: [...] }`

### Authenticated (Bearer token)
- `GET /api/wali/me` — profil wali + list anak
- `GET /api/wali/santri/[id]` — detail santri (dengan cek relasi)
- `GET /api/wali/santri/[id]/absensi`
- `GET /api/wali/santri/[id]/nilai`
- `GET /api/wali/santri/[id]/tagihan`
- `POST /api/wali/logout`

### Admin (untuk kelola wali dari Super Admin)
- `POST /api/admin/wali/[id]/invite` — re-send undangan aktivasi
- `POST /api/admin/wali/[id]/change-phone` — ganti nomor WA (dengan riwayat)
- `POST /api/admin/santri/[id]/wali` — tambah wali ke santri (multi-wali)
- `DELETE /api/admin/santri/[id]/wali/[waliId]` — hapus relasi wali-santri
- `PATCH /api/admin/santri/[id]/wali/[waliId]` — set primary / toggle canAccess

---

## 🎨 UI yang Dibuat

### Login Wali (separate dari admin)
- URL: `/?mode=wali` atau halaman khusus
- Toggle "Login sebagai Admin" / "Login sebagai Wali"
- Input: Nomor WhatsApp + PIN (6 digit)
- Link: "Lupa PIN?" → flow reset via OTP

### Aktivasi Akun Wali
- URL: `/activate?token=xxx` (dari undangan)
- Step 1: Tampilkan info wali & santri yang terhubung
- Step 2: Verifikasi nomor WA (input nomor, kirim OTP)
- Step 3: Input OTP
- Step 4: Buat PIN + konfirmasi
- Step 5: Success → redirect ke login wali

### Dashboard Wali
- Layout terpisah dari Super Admin (lebih simple, mobile-first)
- Header: nama wali + tombol logout
- List kartu anak (foto, nama, NIS, kelas)
- Klik anak → detail santri dengan tabs:
  - Profil
  - Jadwal
  - Absensi
  - Nilai
  - Rapor
  - Tagihan & Pembayaran
  - Pengumuman

### Super Admin (update)
- Form Santri: tombol "Generate NIS Otomatis" + field NIS editable
- Form Santri: input nomor WA wali → auto-detect existing wali
- Detail Santri: tab "Wali" untuk manage multi-wali
- Detail Wali: status aktivasi, tombol re-send invite, change phone dengan riwayat
- List Wali: kolom status aktivasi (badge warna: ACTIVE=ijo, PENDING=kuning, SUSPENDED=merah)
