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
  { id: "absensi", label: "Data Absensi", icon: "ClipboardCheck", group: "akademik" },
  { id: "nilai", label: "Data Nilai", icon: "Award", group: "akademik" },
  { id: "rapor", label: "Rapor", icon: "FileText", group: "akademik" },
  { id: "tagihan", label: "Data Tagihan", icon: "Receipt", group: "keuangan" },
  { id: "pembayaran", label: "Data Pembayaran", icon: "Wallet", group: "keuangan" },
  { id: "pengumuman", label: "Pengumuman", icon: "Megaphone", group: "sistem" },
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
