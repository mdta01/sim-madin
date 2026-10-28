/**
 * Shared TypeScript types — SIM MADIN
 * Dipakai oleh semua app (web & mobile) untuk konsistensi data.
 */

// User & Auth
export interface User {
  id: string
  email: string
  username: string
  name: string
  phone?: string | null
  avatarUrl?: string | null
  isActive: boolean
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: string
  code: string
  name: string
  description?: string | null
  sortOrder: number
  isSystem: boolean
}

export interface Permission {
  id: string
  code: string
  name: string
  module: string
  description?: string | null
}

export interface AppSession {
  user: {
    id: string
    email: string
    name: string
    username: string
    phone?: string
    image?: string | null
    roles: string[]
    permissions: string[]
  }
}

// Master Akademik
export interface TahunAjaran {
  id: string
  code: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

export interface Semester {
  id: string
  tahunAjaranId: string
  code: string
  name: string
  type: "GANJIL" | "GENAP"
  startDate: string
  endDate: string
  isActive: boolean
}

export interface Kelas {
  id: string
  code: string
  name: string
  level: string
  description?: string | null
  capacity: number
  sortOrder: number
  isActive: boolean
  waliKelasId?: string | null
  waliKelas?: Pick<Guru, "id" | "name"> | null
}

export interface MataPelajaran {
  id: string
  code: string
  name: string
  category: string
  description?: string | null
  kkm: number
  durationMnt: number
  sortOrder: number
  isActive: boolean
}

// Data Induk
export interface Wali {
  id: string
  name: string
  nik?: string | null
  phone: string
  email?: string | null
  occupation?: string | null
  address?: string | null
  relationship: string
  userId?: string | null
}

export interface Santri {
  id: string
  nis: string
  nisn?: string | null
  name: string
  gender: "L" | "P"
  birthPlace?: string | null
  birthDate?: string | null
  address?: string | null
  phone?: string | null
  photoUrl?: string | null
  entryDate: string
  status: "AKTIF" | "LULUS" | "PINDAH" | "KELUAR"
  waliId?: string | null
  kelasId?: string | null
  tahunAjaranId?: string | null
  kelas?: Pick<Kelas, "id" | "name" | "code"> | null
  wali?: Pick<Wali, "id" | "name" | "phone" | "relationship"> | null
}

export interface Guru {
  id: string
  nip?: string | null
  nuptk?: string | null
  name: string
  gender: "L" | "P"
  birthPlace?: string | null
  birthDate?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  photoUrl?: string | null
  joinDate: string
  specialization?: string | null
  status: "AKTIF" | "CUTI" | "KELUAR"
  userId?: string | null
  kelasWali?: Pick<Kelas, "id" | "name" | "code">[]
}

// Jadwal
export interface Jadwal {
  id: string
  tahunAjaranId: string
  semesterId: string
  kelasId: string
  mapelId: string
  guruId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  kelas?: Kelas
  mapel?: MataPelajaran
  guru?: Pick<Guru, "id" | "name">
}

// Akademik Harian
export type AbsensiStatus = "HADIR" | "SAKIT" | "IZIN" | "ALFA"

export interface Absensi {
  id: string
  tahunAjaranId: string
  santriId: string
  kelasId: string
  date: string
  status: AbsensiStatus
  note?: string | null
  recordedByGuruId?: string | null
}

export type NilaiType = "HARIAN" | "TUGAS" | "UTS" | "UAS" | "PRAKTIK"

export interface Nilai {
  id: string
  tahunAjaranId: string
  semesterId: string
  santriId: string
  kelasId: string
  mapelId: string
  guruId?: string | null
  type: NilaiType
  score: number
  notes?: string | null
  assessmentDate: string
}

export interface Rapor {
  id: string
  tahunAjaranId: string
  semesterId: string
  santriId: string
  kelasId: string
  notes?: string | null
  absensiHadir: number
  absensiSakit: number
  absensiIzin: number
  absensiAlfa: number
  published: boolean
  publishedAt?: string | null
}

// Keuangan
export type TagihanStatus = "BELUM_BAYAR" | "CICIL" | "LUNAS"

export interface JenisTagihan {
  id: string
  code: string
  name: string
  description?: string | null
  defaultAmount: number
  category: "RUTIN" | "INSIDENTAL"
  isActive: boolean
}

export interface Tagihan {
  id: string
  tahunAjaranId: string
  santriId: string
  kelasId?: string | null
  jenisTagihanId: string
  amount: number
  paidAmount: number
  description?: string | null
  dueDate?: string | null
  status: TagihanStatus
  santri?: Pick<Santri, "id" | "name" | "nis">
  jenisTagihan?: JenisTagihan
}

export type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED"
export type PaymentMethod = "TUNAI" | "TRANSFER" | "QRIS"

export interface Payment {
  id: string
  invoiceNo: string
  tahunAjaranId?: string | null
  tagihanId?: string | null
  santriId?: string | null
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  status: PaymentStatus
  note?: string | null
  proofUrl?: string | null
  recordedById?: string | null
  santri?: Pick<Santri, "id" | "name" | "nis">
}

// Pengumuman
export type AnnouncementAudience = "ALL" | "GURU" | "WALI" | "KELAS"
export type AnnouncementPriority = "NORMAL" | "PENTING" | "URGENT"

export interface Announcement {
  id: string
  title: string
  content: string
  audience: AnnouncementAudience
  kelasId?: string | null
  priority: AnnouncementPriority
  isPublished: boolean
  publishedAt: string
  expiresAt?: string | null
  createdById?: string | null
}

// Audit Log
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "UPLOAD"

export interface AuditLog {
  id: string
  userId?: string | null
  action: AuditAction
  module: string
  entityId?: string | null
  entityType?: string | null
  changes?: string | null
  ip?: string | null
  userAgent?: string | null
  createdAt: string
  user?: { name: string; email: string } | null
}

// Generic API response
export interface ApiResponse<T> {
  data: T
}

export interface ApiListResponse<T> {
  data: T[]
  total: number
}

export interface ApiErrorResponse {
  error: string
  message?: string
  requiredPermission?: string
}
