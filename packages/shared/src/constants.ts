/**
 * ============================================================================
 * SHARED CONSTANTS & TYPES — SIM MADIN
 * ============================================================================
 * File ini adalah sumber kebenaran tunggal untuk:
 * - Daftar menu Super Admin
 * - Daftar role & permission
 * - Status label & warna
 * - Opsi dropdown yang dipakai berulang
 *
 * Saat ini diimpor oleh:
 * - apps/super-admin (Next.js) via "@/lib/constants"
 * - apps/mobile-* (Expo RN, akan datang) via "@sim-madin/shared"
 *
 * Catatan: file ini di-reexport dari src/lib/constants.ts untuk backward compat.
 * Setelah migrasi ke Nx, import path akan disesuaikan ke "@sim-madin/shared".
 * ============================================================================
 */

// ============================================================================
// ROLE & PERMISSION MATRIX
// ============================================================================
export const ROLE_CODES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  KEPALA: "KEPALA",
  BENDAHARA: "BENDAHARA",
  GURU: "GURU",
  WALI: "WALI",
} as const

export type RoleCode = typeof ROLE_CODES[keyof typeof ROLE_CODES]

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  KEPALA: "Kepala Madrasah",
  BENDAHARA: "Bendahara",
  GURU: "Guru",
  WALI: "Wali Santri",
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: "Akses penuh mengelola seluruh sistem",
  KEPALA: "Monitoring & pengambilan keputusan",
  BENDAHARA: "Pengelolaan keuangan madrasah",
  GURU: "Input absensi, nilai, dan catatan santri",
  WALI: "Memantau perkembangan & administrasi anak",
}

// ============================================================================
// STATUS CONSTANTS (label + warna badge)
// ============================================================================
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning"

export const STATUS_STYLES: Record<string, { label: string; variant: BadgeVariant }> = {
  // Santri status
  AKTIF: { label: "Aktif", variant: "success" },
  LULUS: { label: "Lulus", variant: "default" },
  PINDAH: { label: "Pindah", variant: "secondary" },
  KELUAR: { label: "Keluar", variant: "destructive" },

  // Absensi
  HADIR: { label: "Hadir", variant: "success" },
  SAKIT: { label: "Sakit", variant: "warning" },
  IZIN: { label: "Izin", variant: "secondary" },
  ALFA: { label: "Alfa", variant: "destructive" },

  // Tagihan & Pembayaran
  BELUM_BAYAR: { label: "Belum Bayar", variant: "destructive" },
  CICIL: { label: "Cicil", variant: "warning" },
  LUNAS: { label: "Lunas", variant: "success" },
  PENDING: { label: "Menunggu Verifikasi", variant: "warning" },
  VERIFIED: { label: "Terverifikasi", variant: "success" },
  REJECTED: { label: "Ditolak", variant: "destructive" },

  // Pengumuman priority
  NORMAL: { label: "Normal", variant: "secondary" },
  PENTING: { label: "Penting", variant: "warning" },
  URGENT: { label: "Urgent", variant: "destructive" },
}

// ============================================================================
// GENDER
// ============================================================================
export const GENDER_LABELS: Record<string, string> = {
  L: "Laki-laki",
  P: "Perempuan",
}

// ============================================================================
// LEVEL KELAS (Madrasah Diniyah Awaliyah + Ibtidaiyah)
// ============================================================================
export const KELAS_LEVELS = [
  { value: "MDA-1", label: "Madrasah Diniyah Awwaliyah - Kelas 1" },
  { value: "MDA-2", label: "Madrasah Diniyah Awwaliyah - Kelas 2" },
  { value: "MDA-3", label: "Madrasah Diniyah Awwaliyah - Kelas 3" },
  { value: "MDA-4", label: "Madrasah Diniyah Awwaliyah - Kelas 4" },
  { value: "MDA-5", label: "Madrasah Diniyah Awwaliyah - Kelas 5" },
  { value: "MDA-6", label: "Madrasah Diniyah Awwaliyah - Kelas 6" },
  { value: "MDI-1", label: "Madrasah Diniyah Ibtidaiyah - Kelas 1" },
  { value: "MDI-2", label: "Madrasah Diniyah Ibtidaiyah - Kelas 2" },
  { value: "MDI-3", label: "Madrasah Diniyah Ibtidaiyah - Kelas 3" },
  { value: "MDI-4", label: "Madrasah Diniyah Ibtidaiyah - Kelas 4" },
  { value: "MDI-5", label: "Madrasah Diniyah Ibtidaiyah - Kelas 5" },
  { value: "MDI-6", label: "Madrasah Diniyah Ibtidaiyah - Kelas 6" },
]

// ============================================================================
// HARI (untuk jadwal)
// ============================================================================
export const DAYS = [
  { value: 1, label: "Senin", short: "Sen" },
  { value: 2, label: "Selasa", short: "Sel" },
  { value: 3, label: "Rabu", short: "Rab" },
  { value: 4, label: "Kamis", short: "Kam" },
  { value: 5, label: "Jumat", short: "Jum" },
  { value: 6, label: "Sabtu", short: "Sab" },
  { value: 7, label: "Ahad", short: "Ahad" },
]

// ============================================================================
// KATEGORI MATA PELAJARAN
// ============================================================================
export const MAPEL_CATEGORIES = [
  { value: "AL_QURAN", label: "Al-Qur'an" },
  { value: "DINIYAH", label: "Diniyah" },
  { value: "BAHASA", label: "Bahasa" },
  { value: "UMUM", label: "Umum" },
]

// ============================================================================
// JENIS NILAI + BOBOT
// ============================================================================
export const NILAI_TYPES = [
  { value: "HARIAN", label: "Harian" },
  { value: "TUGAS", label: "Tugas" },
  { value: "UTS", label: "UTS" },
  { value: "UAS", label: "UAS" },
  { value: "PRAKTIK", label: "Praktik" },
]

export const NILAI_BOBAT: Record<string, number> = {
  HARIAN: 0.25,
  TUGAS: 0.15,
  UTS: 0.25,
  UAS: 0.25,
  PRAKTIK: 0.10,
}

// ============================================================================
// V2 — AKADEMIK & PEMBELAJARAN
// ============================================================================

// Tipe Materi Pembelajaran
export const MATERI_TYPES = [
  { value: "DOKUMEN", label: "Dokumen (PDF/DOC)", icon: "FileText" },
  { value: "FOTO", label: "Foto/Gambar", icon: "Image" },
  { value: "VIDEO", label: "Video", icon: "Video" },
  { value: "LINK", label: "Link Eksternal", icon: "Link" },
  { value: "AUDIO", label: "Audio", icon: "Headphones" },
]

// Tipe Tugas
export const TUGAS_TYPES = [
  { value: "INDIVIDU", label: "Individu" },
  { value: "KELOMPOK", label: "Kelompok" },
  { value: "PRAKTIK", label: "Praktik" },
  { value: "HAFALAN", label: "Hafalan" },
]

// Status Pengumpulan Tugas
export const PENGUMPULAN_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  SUBMITTED: { label: "Dikumpulkan", variant: "secondary" },
  GRADED: { label: "Dinilai", variant: "success" },
  LATE: { label: "Terlambat", variant: "warning" },
  RETURNED: { label: "Dikembalikan", variant: "destructive" },
  NOT_SUBMITTED: { label: "Belum Kumpul", variant: "outline" },
}

// Kategori Kompetensi
export const KOMPETENSI_CATEGORIES = [
  { value: "UMUM", label: "Umum" },
  { value: "KOGNITIF", label: "Kognitif" },
  { value: "PSIKOMOTORIK", label: "Psikomotorik" },
  { value: "AFEKTIF", label: "Afektif" },
  { value: "SPIRITUAL", label: "Spiritual" },
]

// ============================================================================
// V3 — UJIAN & RAPOR TERINTEGRASI
// ============================================================================

// Tipe Ujian
export const UJIAN_TYPES = [
  { value: "UTS", label: "Ujian Tengah Semester" },
  { value: "UAS", label: "Ujian Akhir Semester" },
  { value: "QUIZ", label: "Kuis" },
  { value: "MAKEUP", label: "Ujian Susulan" },
]

// Tipe Soal Bank Soal
export const SOAL_TYPES = [
  { value: "PG", label: "Pilihan Ganda" },
  { value: "ISIAN", label: "Isian Singkat" },
  { value: "ESSAY", label: "Essay" },
  { value: "PRAKTIK", label: "Praktik" },
]

// Tingkat Kesulitan Soal
export const SOAL_DIFFICULTY = [
  { value: "MUDAH", label: "Mudah" },
  { value: "SEDANG", label: "Sedang" },
  { value: "SULIT", label: "Sulit" },
]

// Predikat Nilai Rapor
export const PREDIKAT_OPTIONS = [
  { value: "A", label: "A (Sangat Baik)", min: 90 },
  { value: "B", label: "B (Baik)", min: 80 },
  { value: "C", label: "C (Cukup)", min: 70 },
  { value: "D", label: "D (Kurang)", min: 60 },
  { value: "E", label: "E (Kurang Sekali)", min: 0 },
]

// Helper: get predikat from score
export function getPredikat(score: number): string {
  for (const p of PREDIKAT_OPTIONS) {
    if (score >= p.min) return p.value
  }
  return "E"
}

// ============================================================================
// V4 — PERKEMBANGAN SANTRI & PEMBINAAN
// ============================================================================

// Tipe Perkembangan Al-Qur'an (sesuai roadmap.pdf V4)
export const QURAN_TYPES = [
  { value: "TAHSIN", label: "Tahsin" },
  { value: "TILAWAH", label: "Tilawah" },
  { value: "HAFALAN", label: "Hafalan" },
]

// Tipe Perkembangan Kitab (sesuai roadmap.pdf V4)
export const KITAB_TYPES = [
  { value: "HAFALAN", label: "Hafalan Kitab" },
  { value: "KELANCARAN", label: "Kelancaran Membaca" },
  { value: "PEMAHAMAN", label: "Pemahaman" },
]

// Status Perkembangan (Quran + Kitab)
export const PERKEMBANGAN_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  PROGRESS: { label: "Sedang Berjalan", variant: "warning" },
  SELESAI: { label: "Selesai", variant: "success" },
  BELUM: { label: "Belum Mulai", variant: "outline" },
  REMEDIAL: { label: "Remedial", variant: "destructive" },
}

// 6 Aspek Akhlak (sesuai roadmap.pdf V4)
export const AKHLAK_ASPEK = [
  { value: "adabGuru", label: "Adab kepada Guru", min: 0, max: 100 },
  { value: "adabOrangTua", label: "Adab kepada Orang Tua", min: 0, max: 100 },
  { value: "adabTeman", label: "Adab kepada Teman", min: 0, max: 100 },
  { value: "kedisiplinan", label: "Kedisiplinan", min: 0, max: 100 },
  { value: "kebersihan", label: "Kebersihan", min: 0, max: 100 },
  { value: "tanggungJawab", label: "Tanggung Jawab", min: 0, max: 100 },
]

// Predikat Akhlak
export const AKHLAK_PREDIKAT: Record<string, { label: string; variant: BadgeVariant; min: number }> = {
  SANGAT_BAIK: { label: "Sangat Baik", variant: "success", min: 90 },
  BAIK: { label: "Baik", variant: "default", min: 75 },
  CUKUP: { label: "Cukup", variant: "warning", min: 60 },
  KURANG: { label: "Kurang", variant: "destructive", min: 0 },
}

// Helper: get akhlak predikat from rata-rata
export function getAkhlakPredikat(score: number): string {
  for (const [key, p] of Object.entries(AKHLAK_PREDIKAT)) {
    if (score >= p.min) return key
  }
  return "KURANG"
}

// Tipe Pembinaan (sesuai roadmap.pdf V4)
export const PEMBINAAN_TYPES = [
  { value: "PELANGGARAN", label: "Pelanggaran" },
  { value: "TINDAKAN", label: "Tindakan Pembinaan" },
  { value: "CATATAN_GURU", label: "Catatan Guru" },
  { value: "CATATAN_UMUM", label: "Catatan Umum" },
]

// Kategori Pembinaan
export const PEMBINAAN_CATEGORIES = [
  { value: "AKADEMIK", label: "Akademik" },
  { value: "AKHLAK", label: "Akhlak" },
  { value: "DISIPLIN", label: "Disiplin" },
  { value: "KEBERSIHAN", label: "Kebersihan" },
  { value: "UMUM", label: "Umum" },
]

// Severity Pembinaan
export const PEMBINAAN_SEVERITY: Record<string, { label: string; variant: BadgeVariant }> = {
  RINGAN: { label: "Ringan", variant: "secondary" },
  SEDANG: { label: "Sedang", variant: "warning" },
  BERAT: { label: "Berat", variant: "destructive" },
}

// Status Pembinaan
export const PEMBINAAN_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  OPEN: { label: "Terbuka", variant: "warning" },
  IN_PROGRESS: { label: "Dalam Proses", variant: "default" },
  RESOLVED: { label: "Selesai", variant: "success" },
  CLOSED: { label: "Ditutup", variant: "secondary" },
}

// Periode Penilaian (Akhlak + Catatan Wali Kelas)
export const PERIODE_OPTIONS = [
  { value: "MINGGUAN", label: "Mingguan" },
  { value: "BULANAN", label: "Bulanan" },
  { value: "SEMESTER", label: "Semester" },
]

// ============================================================================
// V5 — KEUANGAN TERINTEGRASI LANJUTAN
// ============================================================================

// Tipe Kas (sesuai roadmap.pdf V5: Kas, Rekening)
export const KAS_TYPES = [
  { value: "TUNAI", label: "Kas Tunai" },
  { value: "BANK", label: "Rekening Bank" },
  { value: "E_WALLET", label: "E-Wallet" },
]

// Tipe Transaksi Kas (Pemasukan & Pengeluaran)
export const TRANSAKSI_KAS_TYPES = [
  { value: "PEMASUKAN", label: "Pemasukan" },
  { value: "PENGELUARAN", label: "Pengeluaran" },
]

// Kategori Transaksi Kas
export const TRANSAKSI_KAS_CATEGORIES = [
  { value: "PEMBAYARAN_SANTRI", label: "Pembayaran Santri" },
  { value: "HONOR_GURU", label: "Honor Guru" },
  { value: "OPERASIONAL", label: "Operasional" },
  { value: "KEGIATAN", label: "Kegiatan" },
  { value: "LAIN_LAIN", label: "Lain-lain" },
]

// Status Honor Guru
export const HONOR_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  DISETUJUI: { label: "Disetujui", variant: "default" },
  DIBAYARKAN: { label: "Dibayar", variant: "success" },
}

// Periode Honor Guru
export const HONOR_PERIODE_TYPES = [
  { value: "BULANAN", label: "Bulanan" },
  { value: "SEMESTER", label: "Semester" },
]

// Jenis Tagihan tambahan V5 (sesuai roadmap.pdf)
export const JENIS_TAGIHAN_V5 = [
  { value: "SYAHRIYAH", label: "Syahriyah", category: "RUTIN" },
  { value: "UJIAN", label: "Uang Ujian", category: "INSIDENTAL" },
  { value: "LKS", label: "LKS", category: "INSIDENTAL" },
  { value: "SERAGAM", label: "Seragam", category: "INSIDENTAL" },
  { value: "KEGIATAN", label: "Kegiatan", category: "INSIDENTAL" },
  { value: "HAFLAH", label: "Haflah", category: "INSIDENTAL" },
  { value: "KELULUSAN", label: "Kelulusan", category: "INSIDENTAL" },
  { value: "ADMINISTRASI", label: "Administrasi", category: "RUTIN" },
  { value: "KHUSUS", label: "Tagihan Khusus", category: "INSIDENTAL" },
]

// ============================================================================
// V6 — KOMUNIKASI & NOTIFIKASI
// ============================================================================

// Tipe Notifikasi Otomatis (sesuai roadmap.pdf V6)
export const NOTIFIKASI_TYPES = [
  { value: "ABSENSI_ALFA", label: "Absensi Alfa", template: "Ananda {santriName} tidak hadir hari ini." },
  { value: "TAGIHAN_DUE", label: "Tagihan Jatuh Tempo", template: "Tagihan {jenisTagihan} ananda {santriName} belum dibayar." },
  { value: "UJIAN_TOMORROW", label: "Ujian Besok", template: "Besok terdapat ujian {mapel} ananda {santriName}." },
  { value: "NILAI_UPDATED", label: "Nilai Diperbarui", template: "Nilai {mapel} ananda {santriName} telah diperbarui." },
  { value: "RAPOR_PUBLISHED", label: "Rapor Tersedia", template: "Rapor semester ananda {santriName} telah tersedia." },
  { value: "PENGUMUMAN", label: "Pengumuman Baru", template: "{title}" },
  { value: "TUGAS_BARU", label: "Tugas Baru", template: "Tugas {tugasTitle} untuk ananda {santriName} telah diberikan." },
  { value: "CUSTOM", label: "Custom", template: "" },
]

// Tipe Chat Room (sesuai roadmap.pdf V6: Wali ↔ Wali Kelas, Wali ↔ Madrasah, Guru ↔ Wali)
export const CHAT_ROOM_TYPES = [
  { value: "WALI_WALI_KELAS", label: "Wali ↔ Wali Kelas" },
  { value: "WALI_MADRASAH", label: "Wali ↔ Madrasah" },
  { value: "GURU_WALI", label: "Guru ↔ Wali" },
]

// Sender Type untuk Chat Message
export const CHAT_SENDER_TYPES = [
  { value: "WALI", label: "Wali" },
  { value: "GURU", label: "Guru" },
  { value: "ADMIN", label: "Admin/Madrasah" },
]

// ============================================================================
// V7 — ADMINISTRASI & DOKUMEN
// ============================================================================

// Tipe Surat Otomatis (sesuai roadmap.pdf V7)
export const SURAT_TYPES = [
  { value: "AKTIF", label: "Surat Keterangan Aktif", desc: "Keterangan santri masih aktif" },
  { value: "IZIN", label: "Surat Izin", desc: "Surat izin untuk santri/guru" },
  { value: "TUGAS", label: "Surat Tugas", desc: "Surat penugasan guru" },
  { value: "UNDANGAN", label: "Surat Undangan", desc: "Undangan untuk wali santri" },
  { value: "KETERANGAN", label: "Surat Keterangan", desc: "Keterangan umum" },
  { value: "KEPUTUSAN", label: "Surat Keputusan", desc: "Keputusan madrasah" },
  { value: "KELULUSAN", label: "Surat Kelulusan", desc: "Keterangan kelulusan santri" },
]

// Status Surat
export const SURAT_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  DITERBITKAN: { label: "Diterbitkan", variant: "success" },
  DIARSIP: { label: "Diarsip", variant: "outline" },
}

// Tipe Dokumen (sesuai roadmap.pdf V7)
export const DOKUMEN_TYPES = [
  { value: "SERTIFIKAT", label: "Sertifikat", desc: "Sertifikat kegiatan/prestasi" },
  { value: "PIAGAM", label: "Piagam", desc: "Piagam penghargaan" },
  { value: "KARTU_SANTRI", label: "Kartu Santri", desc: "Kartu identitas santri digital" },
  { value: "KARTU_UJIAN", label: "Kartu Ujian", desc: "Kartu ujian per santri" },
  { value: "BERITA_ACARA", label: "Berita Acara", desc: "Berita acara kegiatan" },
]

// ============================================================================
// JENIS TAGIHAN
// ============================================================================
export const JENIS_TAGIHAN_CATEGORY = [
  { value: "RUTIN", label: "Rutin" },
  { value: "INSIDENTAL", label: "Insidental" },
]

// ============================================================================
// METODE PEMBAYARAN
// ============================================================================
export const PAYMENT_METHODS = [
  { value: "TUNAI", label: "Tunai" },
  { value: "TRANSFER", label: "Transfer Bank" },
  { value: "QRIS", label: "QRIS" },
]

// ============================================================================
// AUDIENCE PENGUMUMAN
// ============================================================================
export const AUDIENCE_TYPES = [
  { value: "ALL", label: "Semua Pengguna" },
  { value: "GURU", label: "Guru" },
  { value: "WALI", label: "Wali Santri" },
  { value: "KELAS", label: "Per Kelas" },
]

// ============================================================================
// MENU NAVIGASI SUPER ADMIN
// ============================================================================
export interface MenuItem {
  id: string
  label: string
  icon: string // lucide icon name
  group: "main" | "akademik" | "pembelajaran" | "keuangan" | "sistem"
  description?: string
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", group: "main", description: "Ringkasan & statistik madrasah" },
  { id: "tahun-ajaran", label: "Tahun Ajaran & Semester", icon: "CalendarDays", group: "akademik" },
  { id: "wali", label: "Data Wali Santri", icon: "Users", group: "akademik" },
  { id: "santri", label: "Data Santri", icon: "GraduationCap", group: "akademik" },
  { id: "guru", label: "Data Guru", icon: "UserCog", group: "akademik" },
  { id: "kelas", label: "Data Kelas", icon: "School", group: "akademik" },
  { id: "mapel", label: "Mata Pelajaran", icon: "BookOpen", group: "akademik" },
  { id: "jadwal", label: "Jadwal Pelajaran", icon: "CalendarClock", group: "akademik" },
  // V2 — Akademik & Pembelajaran
  { id: "materi", label: "Materi Pembelajaran", icon: "FolderOpen", group: "pembelajaran", description: "Materi PDF/foto/video per mapel" },
  { id: "tugas", label: "Tugas & Pengumpulan", icon: "ClipboardList", group: "pembelajaran", description: "Tugas guru ke santri + grading" },
  { id: "pertemuan", label: "Pertemuan & Absensi", icon: "CalendarCheck", group: "pembelajaran", description: "Sesi kelas + absensi + nilai per pertemuan" },
  { id: "kompetensi", label: "Kompetensi", icon: "Target", group: "pembelajaran", description: "Capaian pembelajaran per mapel" },
  // End V2
  // V3 — Ujian & Rapor
  { id: "bank-soal", label: "Bank Soal", icon: "Library", group: "pembelajaran", description: "Bank soal PG/isian/essay/praktik" },
  { id: "ujian", label: "Ujian", icon: "FileQuestion", group: "pembelajaran", description: "Jadwal ujian + peserta + nilai" },
  // End V3
  // V4 — Perkembangan Santri & Pembinaan
  { id: "perkembangan", label: "Perkembangan Santri", icon: "Heart", group: "pembelajaran", description: "Tahsin, hafalan, akhlak, pembinaan" },
  // End V4
  { id: "absensi", label: "Data Absensi", icon: "ClipboardCheck", group: "akademik" },
  { id: "nilai", label: "Data Nilai", icon: "Award", group: "akademik" },
  { id: "rapor", label: "Rapor", icon: "FileText", group: "akademik" },
  { id: "tagihan", label: "Data Tagihan", icon: "Receipt", group: "keuangan" },
  { id: "pembayaran", label: "Data Pembayaran", icon: "Wallet", group: "keuangan" },
  // V5 — Keuangan Lanjutan
  { id: "kas", label: "Kas & Transaksi", icon: "Landmark", group: "keuangan", description: "Kas, rekening, pemasukan & pengeluaran" },
  { id: "honor-guru", label: "Honor Guru", icon: "Banknote", group: "keuangan", description: "Honor mengajar, insentif, slip honor" },
  // End V5
  { id: "pengumuman", label: "Pengumuman", icon: "Megaphone", group: "sistem" },
  // V6 — Komunikasi & Notifikasi
  { id: "notifikasi", label: "Notifikasi", icon: "Bell", group: "sistem", description: "Notifikasi otomatis ke wali" },
  { id: "chat", label: "Chat Internal", icon: "MessageCircle", group: "sistem", description: "Chat wali ↔ wali kelas ↔ madrasah" },
  // End V6
  // V7 — Administrasi & Dokumen
  { id: "surat", label: "Surat & Dokumen", icon: "FileText", group: "sistem", description: "Surat otomatis, sertifikat, kartu, berita acara" },
  // End V7
  { id: "users", label: "User & Hak Akses", icon: "ShieldCheck", group: "sistem" },
  { id: "pengaturan", label: "Pengaturan Sistem", icon: "Settings", group: "sistem" },
]

export const MENU_GROUPS: { id: MenuItem["group"]; label: string }[] = [
  { id: "main", label: "Utama" },
  { id: "akademik", label: "Akademik" },
  { id: "pembelajaran", label: "Pembelajaran" },
  { id: "keuangan", label: "Keuangan" },
  { id: "sistem", label: "Sistem" },
]

// ============================================================================
// FORMAT CURRENCY (Rupiah)
// ============================================================================
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string, withTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (withTime) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d)
  }
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}
