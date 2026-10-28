# Roadmap SIM MADIN — Prioritas & Status

> Roadmap ini disusun berdasarkan dokumen asli `roadmap.pdf` dari user, dipetakan ke prioritas praktis untuk pengembangan bertahap.

## 🎯 Prinsip Roadmap

1. **Satu pintu**: Semua app (web + mobile) pakai 1 backend, 1 database
2. **Bertahap**: Versi baru tidak boleh break versi lama
3. **Fondasi dulu**: Setiap versi harus stabil sebelum lanjut versi berikutnya
4. **Tanpa bongkar total**: Schema V1 harus siap untuk V2-V14 tanpa migrasi besar

---

## 📅 Status Saat Ini: V1.3 (28 Okt 2025)

**Sedang stabilkan V1.3** — selesai audit + fix bug. Setelah stabil, lanjut ke V1.4 (simplify auth ke Supabase).

---

## 🚦 Prioritas Pengembangan (Berurutan)

### V1.4 — Simplify Auth + Setup Production Backend (PRIORITAS BERIKUTNYA)
**Estimasi:** 3-5 hari
**Tujuan:** Reduce dari 3 auth systems (NextAuth + custom JWT wali + rencana Firebase Auth) jadi 1 (Supabase Auth).

- [ ] Setup Supabase project (free tier)
- [ ] Migrate Prisma schema ke Postgres (ganti `provider = "postgresql"`)
- [ ] Implement Supabase Auth untuk admin web (ganti NextAuth)
- [ ] Implement Supabase Auth untuk wali (phone + PIN via Supabase RLS atau Edge Functions)
- [ ] Update API guards untuk verify Supabase JWT (ganti NextAuth session check)
- [ ] Migrate demo users ke Supabase Auth
- [ ] Update seed script
- [ ] Setup Cloudflare R2 untuk upload storage (ganti Firebase Storage adapter)
- [ ] Test end-to-end semua flow

**Setelah ini:** Aplikasi siap deploy ke Vercel + Supabase + R2 dengan biaya $0/bulan.

---

### V1.5 — Stabilkan Wali Management di Super Admin
**Estimasi:** 2-3 hari
**Tujuan:** Super Admin bisa kelola wali dengan lengkap dari UI.

- [ ] Form Santri: tambah field nomor WhatsApp wali + auto-create wali dari UI
- [ ] Form Santri: tampilkan NIS yang di-generate di toast/response
- [ ] List Santri: tambah kolom status aktivasi wali (badge PENDING/ACTIVE)
- [ ] Detail Santri: tambah tab "Wali" yang list semua wali via `waliLinks`
- [ ] API `/api/admin/wali/[id]/change-phone` — ganti nomor WA dengan PhoneChangeLog
- [ ] API `/api/admin/santri/[id]/wali` untuk manage multi-wali (add/remove/setPrimary/toggleAccess)
- [ ] UI di Super Admin: tabel pivot SantriWali di detail Santri
- [ ] UI di Super Admin: tombol "Re-send Invite" untuk wali yang masih PENDING
- [ ] Halaman aktivasi `/activate?token=xxx` — wali input WA + OTP + set PIN

---

### V1.6 — Setup Firebase FCM untuk Push Notif
**Estimasi:** 2 hari
**Tujuan:** Push notif ke mobile apps (saat mobile apps sudah dibangun).

- [ ] Setup Firebase project (FCM only)
- [ ] Install `firebase-admin` package
- [ ] Implement `/api/notifications/send` endpoint
- [ ] Send push notif saat:
  - Pengumuman baru dipublikasi
  - Tagihan jatuh tempo mendekati
  - Pembayaran terverifikasi
  - Absensi anak ditandai ALFA
- [ ] Mobile apps register FCM token saat login

---

### V2 — Akademik & Pembelajaran (Berdasarkan roadmap.pdf)
**Estimasi:** 5-7 hari
**Tujuan:** Materi pembelajaran, tugas, nilai harian terstruktur.

**Modul yang Ditambahkan:**
- [ ] Materi Pembelajaran (upload PDF, foto, video per mapel)
- [ ] Tugas dari guru ke santri
- [ ] Pengumpulan tugas
- [ ] Status tugas (belum/selesai/terlambat)
- [ ] Catatan guru per tugas
- [ ] Kompetensi/capaian pembelajaran per mapel
- [ ] Target pembelajaran
- [ ] Rekap perkembangan
- [ ] Nilai harian (terstruktur per pertemuan)
- [ ] Nilai tugas
- [ ] Nilai praktik
- [ ] Nilai ujian (jika V3 sudah jadi)
- [ ] Absensi per pertemuan (lebih granular dari V1)
- [ ] Persentase kehadiran otomatis
- [ ] Wali bisa lihat perkembangan akademik anak berkala

---

### V3 — Ujian & Rapor Terintegrasi
**Estimasi:** 7-10 hari
**Tujuan:** Eliminasi pekerjaan manual Excel untuk ujian & rapor.

- [ ] Jadwal ujian
- [ ] Peserta ujian
- [ ] Kartu ujian (cetak)
- [ ] Pengawas & ruang
- [ ] Bank soal (PG, isian, essay, praktik)
- [ ] Ujian online (mobile, dengan timer)
- [ ] Random soal & random pilihan
- [ ] Koreksi otomatis soal objektif
- [ ] Nilai otomatis
- [ ] Rekap nilai ujian
- [ ] Nilai akhir
- [ ] Ranking & leger
- [ ] Rapor semester dengan deskripsi
- [ ] Catatan wali kelas di rapor
- [ ] Prestasi & akhlak di rapor
- [ ] Cetak PDF rapor

---

### V4 — Perkembangan Santri & Pembinaan
**Estimasi:** 5-7 hari
**Tujuan:** Sistem tidak hanya mengukur nilai akademik, tapi perkembangan santri menyeluruh.

- [ ] Tahsin & tilawah
- [ ] Hafalan Al-Qur'an (juz 30, target hafalan, progress)
- [ ] Hafalan kitab
- [ ] Kelancaran membaca kitab
- [ ] Pemahaman kitab
- [ ] Akhlak (adab ke guru, orang tua, teman, kedisiplinan, kebersihan, tanggung jawab)
- [ ] Catatan guru per pertemuan
- [ ] Pelanggaran & tindakan pembinaan
- [ ] Riwayat pembinaan
- [ ] Catatan wali kelas
- [ ] Wali bisa lihat perkembangan berkala

---

### V5 — Keuangan Terintegrasi Lanjutan
**Estimasi:** 5-7 hari
**Tujuan:** Aplikasi jadi pusat administrasi keuangan madrasah.

- [ ] Jenis tagihan lengkap (syahriyah, ujian, LKS, seragam, kegiatan, haflah, kelulusan, administrasi, khusus)
- [ ] Pembayaran tunai/transfer/QRIS
- [ ] Upload bukti transfer
- [ ] Verifikasi bendahara
- [ ] Kwitansi otomatis (cetak)
- [ ] Riwayat pembayaran lengkap
- [ ] Kas & rekening
- [ ] Pemasukan & pengeluaran
- [ ] Saldo & mutasi
- [ ] Rekap tunggakan
- [ ] Laporan bulanan/semester/tahunan
- [ ] Honor guru (mengajar, insentif, tunjangan, potongan, slip honor)
- [ ] Roadmap: QRIS, payment gateway, notifikasi jatuh tempo

---

### V6 — Komunikasi & Notifikasi
**Estimasi:** 3-5 hari
**Tujuan:** Aplikasi jadi pusat komunikasi resmi madrasah.

- [ ] Pengumuman per kelas/guru/wali/kegiatan
- [ ] Notifikasi otomatis ("Ananda Ahmad tidak hadir hari ini", "Tagihan belum dibayar", dst)
- [ ] Chat internal Wali ↔ Wali Kelas ↔ Madrasah
- [ ] Chat Guru ↔ Wali
- [ ] Riwayat komunikasi
- [ ] Integrasi WhatsApp otomatis (opsional, via gateway)
- [ ] Email notification
- [ ] Push notification via FCM

---

### V7 — Administrasi & Dokumen
**Estimasi:** 5 hari
**Tujuan:** Kurangi pekerjaan administrasi manual.

- [ ] Surat otomatis (aktif, izin, tugas, undangan, keterangan, keputusan, kelulusan)
- [ ] Sertifikat
- [ ] Piagam
- [ ] Kartu santri digital
- [ ] Kartu ujian digital
- [ ] Berita acara
- [ ] Data dokumen auto-ambil dari database

---

### V8 — QR Code & Digitalisasi
**Estimasi:** 5 hari
**Tujuan:** Percepat aktivitas sehari-hari.

- [ ] QR Santri (untuk absensi, identitas, perpustakaan, kegiatan)
- [ ] QR Guru
- [ ] Absensi via QR scan
- [ ] Digital card santri & guru
- [ ] Integrasi dengan V1 absensi

---

### V9 — Perpustakaan & Inventaris
**Estimasi:** 5-7 hari

- [ ] Data buku & kitab
- [ ] Stok
- [ ] Peminjaman & pengembalian
- [ ] Riwayat peminjaman
- [ ] Denda (opsional)
- [ ] Data inventaris barang
- [ ] Kondisi, lokasi, tahun pembelian
- [ ] Penanggung jawab
- [ ] Riwayat perawatan

---

### V10 — Kelulusan & Alumni
**Estimasi:** 5 hari

- [ ] Persyaratan kelulusan
- [ ] Ujian akhir
- [ ] Nilai akhir
- [ ] Penentuan kelulusan
- [ ] Berita acara
- [ ] Sertifikat & piagam
- [ ] Surat keterangan lulus
- [ ] Alumni tracking (tahun lulus, pendidikan lanjutan, pekerjaan, kontak, domisili, aktivitas)

---

### V11 — Dashboard & Analitik Madrasah
**Estimasi:** 5-7 hari
**Tujuan:** Kepala madrasah bisa ambil keputusan berdasarkan data.

- [ ] Dashboard Kepala yang komprehensif
- [ ] Grafik jumlah santri (aktif, baru, lulus, tidak aktif)
- [ ] Akademik (rata-rata nilai, ranking, kelulusan, perkembangan kelas)
- [ ] Kehadiran (persentase, santri sering tidak hadir, rekap per kelas)
- [ ] Guru (jumlah, jadwal, kehadiran)
- [ ] Keuangan (pemasukan, pengeluaran, saldo, tunggakan, pembayaran)
- [ ] Multiple chart types
- [ ] Tren & forecast (sederhana)

---

### V12 — Sistem Terintegrasi Penuh
**Estimasi:** 3-5 hari
**Tujuan:** Hubungkan semua modul yang sudah ada jadi satu siklus utuh.

- [ ] Siklus Santri: PPDB → Data → Kelas → Jadwal → Pembelajaran → Absensi → Nilai → Perkembangan → Ujian → Rapor → Kenaikan Kelas → Kelulusan → Alumni
- [ ] Siklus Keuangan: Santri → Jenis Tagihan → Tagihan → Pembayaran → Verifikasi → Kas → Laporan → Monitoring
- [ ] Siklus Guru: Data → Penugasan → Jadwal → Absensi Guru → Mengajar → Absensi Santri → Nilai → Catatan → Honor

---

### V13 — PPDB & Penerimaan Santri Baru
**Estimasi:** 5-7 hari

- [ ] Pendaftaran online (calon santri)
- [ ] Data calon santri + orang tua
- [ ] Upload dokumen
- [ ] Nomor pendaftaran
- [ ] Verifikasi & seleksi panitia
- [ ] Pengumuman
- [ ] Daftar ulang
- [ ] Auto-convert calon → santri aktif (tanpa re-input data)

---

### V14 — Sistem Cerdas / Advanced
**Estimasi:** 7-10 hari
**Tujuan:** AI-powered insights.

- [ ] Sistem rekomendasi ("Santri Ahmad kehadiran 72% dan nilai Fikih menurun, disarankan pembinaan")
- [ ] Deteksi santri berisiko (sering tidak hadir, nilai menurun, tunggakan)
- [ ] Deteksi santri berisiko tidak naik kelas
- [ ] Analitik otomatis untuk kepala madrasah
- [ ] Tren & forecast

---

## 🎯 Prioritas jika Waktu Terbatas

Jika harus prioritaskan dalam waktu terbatas, urutan ini:

1. **V1.4 — Supabase Auth migration** (paling penting, fundamental)
2. **V1.5 — Wali management di Super Admin** (lengkapi V1.3 yang belum tuntas)
3. **V2 — Akademik & Pembelajaran** (fitur yang paling dirasakan user)
4. **V3 — Ujian & Rapor** (eliminasi pekerjaan manual Excel)
5. **V5 — Keuangan lanjutan** (transparansi keuangan)

Sisanya bisa follow-up sesuai kebutuhan madrasah.

---

## 📊 Tracking Progress per Versi

| Versi | Status | Tanggal Target | Realisasi |
|-------|--------|----------------|-----------|
| V1.0 — MVP V1 Complete | ✅ Done | 27 Okt 2025 | 27 Okt 2025 |
| V1.1 — Stabilisasi Auth | ✅ Done | 27 Okt 2025 | 27 Okt 2025 |
| V1.2 — Monorepo + Backend Adapter | ✅ Done | 28 Okt 2025 | 28 Okt 2025 |
| V1.3 — Wali Auth + NIS Auto | ✅ Done | 28 Okt 2025 | 28 Okt 2025 |
| V1.4 — Supabase Auth migration | 🚧 Next | 5 Nov 2025 | - |
| V1.5 — Wali Management UI | 📋 Planned | 10 Nov 2025 | - |
| V1.6 — Firebase FCM Push Notif | 📋 Planned | 15 Nov 2025 | - |
| V2 — Akademik & Pembelajaran | 📋 Planned | 30 Nov 2025 | - |
| V3 — Ujian & Rapor | 📋 Planned | 20 Des 2025 | - |
| V4 — Perkembangan Santri | 📋 Planned | 15 Jan 2026 | - |
| V5 — Keuangan Lanjutan | 📋 Planned | 10 Feb 2026 | - |
| V6-V14 | 📋 Long-term | Q1-Q2 2026 | - |

---

## 🔄 Cara Update Roadmap Ini

Setiap kali selesai sebuah versi:
1. Update status di tabel "Tracking Progress" di atas
2. Pindahkan checkbox `[ ]` → `[x]` untuk task yang selesai
3. Tambahkan entry baru di `docs/CHANGELOG.md` dengan detail apa yang selesai
4. Update `docs/ARCHITECTURE.md` jika ada perubahan arsitektur

**Roadmap ini bukan sekadar checklist, tapi dokumen hidup yang reflect kondisi sebenarnya.**
