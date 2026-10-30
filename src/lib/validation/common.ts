/**
 * ============================================================================
 * COMMON SCHEMAS — Reusable Zod primitives for SIM MADIN domain
 * ============================================================================
 * These are the building blocks for per-module schemas. Importing them
 * keeps validation rules consistent across API routes.
 *
 * Pattern: each primitive exports both the schema AND its inferred type,
 * so callers can use either form depending on context.
 * ============================================================================
 */
import { z } from "zod"

// ============================================================================
// ENUMS — match Prisma schema enums
// ============================================================================

export const genderSchema = z.enum(["L", "P"])
export type Gender = z.infer<typeof genderSchema>

export const santriStatusSchema = z.enum([
  "AKTIF",
  "LULUS",
  "PINDAH",
  "KELUAR",
])
export type SantriStatus = z.infer<typeof santriStatusSchema>

export const guruStatusSchema = z.enum(["AKTIF", "TIDAK_AKTIF", "CUTI"])
export type GuruStatus = z.infer<typeof guruStatusSchema>

export const activationStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
])
export type ActivationStatus = z.infer<typeof activationStatusSchema>

export const paymentMethodSchema = z.enum([
  "TUNAI",
  "TRANSFER",
  "QRIS",
  "DEPOSIT",
])
export type PaymentMethod = z.infer<typeof paymentMethodSchema>

export const paymentStatusSchema = z.enum([
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "REFUNDED",
])
export type PaymentStatus = z.infer<typeof paymentStatusSchema>

export const tagihanStatusSchema = z.enum([
  "BELUM_BAYAR",
  "CICIL",
  "LUNAS",
  "DIBATALKAN",
])
export type TagihanStatus = z.infer<typeof tagihanStatusSchema>

export const transaksiKasTypeSchema = z.enum(["PEMASUKAN", "PENGELUARAN"])
export type TransaksiKasType = z.infer<typeof transaksiKasTypeSchema>

export const transaksiKasCategorySchema = z.enum([
  "PEMBAYARAN_SANTRI",
  "HONOR_GURU",
  "OPERASIONAL",
  "INVESTASI",
  "LAIN_LAIN",
])
export type TransaksiKasCategory = z.infer<typeof transaksiKasCategorySchema>

export const honorGuruStatusSchema = z.enum([
  "PENDING",
  "DIBAYARKAN",
  "DITOLAK",
])
export type HonorGuruStatus = z.infer<typeof honorGuruStatusSchema>

export const absensiStatusSchema = z.enum([
  "HADIR",
  "IZIN",
  "SAKIT",
  "ALFA",
])
export type AbsensiStatus = z.infer<typeof absensiStatusSchema>

export const nilaiTypeSchema = z.enum([
  "HARIAN",
  "TUGAS",
  "UTS",
  "UAS",
  "PRAKTIK",
])
export type NilaiType = z.infer<typeof nilaiTypeSchema>

export const ujianTypeSchema = z.enum(["UTS", "UAS", "QUIZ", "MAKEUP"])
export type UjianType = z.infer<typeof ujianTypeSchema>

export const tipeSoalSchema = z.enum(["PG", "ISIAN", "ESSAY", "PRAKTIK"])
export type TipeSoal = z.infer<typeof tipeSoalSchema>

export const tipeTugasSchema = z.enum([
  "INDIVIDU",
  "KELOMPOK",
  "PRAKTIK",
  "HAFALAN",
])
export type TipeTugas = z.infer<typeof tipeTugasSchema>

export const tipeMateriSchema = z.enum(["PDF", "FOTO", "AUDIO", "LINK"])
export type TipeMateri = z.infer<typeof tipeMateriSchema>

// ============================================================================
// ID FORMAT — Prisma uses CUID (24 chars), accept any non-empty string for safety
// ============================================================================

export const idSchema = z
  .string()
  .min(1, "ID wajib diisi")
  .max(100, "ID terlalu panjang")
export type Id = z.infer<typeof idSchema>

// ============================================================================
// PHONE — Indonesian phone number (08xxxxxxxx or +62xxx)
// ============================================================================

export const phoneSchema = z
  .string()
  .min(8, "Nomor telepon minimal 8 digit")
  .max(20, "Nomor telepon maksimal 20 digit")
  .regex(/^[\d+\-\s()]+$/, "Nomor telepon hanya boleh angka, +, -, spasi, kurung")
export type Phone = z.infer<typeof phoneSchema>

/**
 * WhatsApp number — strict format: starts with 08 OR +62 OR 62
 * (without spaces). Used for wali activation flow.
 *
 * NOTE: this validates the INPUT format the user typed. The actual
 * normalization (08xxx → 628xxx) happens in normalizeWhatsApp() helper.
 */
export const whatsappInputSchema = z
  .string()
  .min(10, "Nomor WhatsApp minimal 10 digit")
  .max(15, "Nomor WhatsApp maksimal 15 digit")
  .regex(
    /^(\+62|62|0)8\d{6,12}$/,
    "Nomor WhatsApp tidak valid. Format: 08xxx, 628xxx, atau +628xxx",
  )
export type WhatsAppInput = z.infer<typeof whatsappInputSchema>

// ============================================================================
// NIS — Numeric, 6-12 digits (school-internal student ID)
// ============================================================================

export const nisSchema = z
  .string()
  .min(6, "NIS minimal 6 digit")
  .max(12, "NIS maksimal 12 digit")
  .regex(/^\d+$/, "NIS hanya boleh angka")
  .optional()
export type NIS = z.infer<typeof nisSchema>

// NISN (national student ID) — 10 digits exact
export const nisnSchema = z
  .string()
  .length(10, "NISN harus 10 digit")
  .regex(/^\d+$/, "NISN hanya boleh angka")
  .optional()
export type NISN = z.infer<typeof nisnSchema>

// ============================================================================
// PIN — 6 digit numeric (wali auth)
// ============================================================================

export const pinSchema = z
  .string()
  .length(6, "PIN harus 6 digit")
  .regex(/^\d{6}$/, "PIN hanya boleh angka")
export type Pin = z.infer<typeof pinSchema>

// ============================================================================
// OTP — 6 digit numeric
// ============================================================================

export const otpSchema = z
  .string()
  .length(6, "OTP harus 6 digit")
  .regex(/^\d{6}$/, "OTP hanya boleh angka")
export type Otp = z.infer<typeof otpSchema>

// ============================================================================
// DATES — accept ISO 8601 string, validate parseable to Date
// ============================================================================

export const isoDateSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid (gunakan ISO 8601: YYYY-MM-DD)",
  })
  .transform((val) => new Date(val))
export type IsoDate = z.infer<typeof isoDateSchema>

// ============================================================================
// MONETARY — positive number, max 2 decimals (Rupiah)
// ============================================================================

export const rupiahSchema = z
  .number()
  .min(0, "Nominal tidak boleh negatif")
  .max(1_000_000_000, "Nominal terlalu besar (maks 1 miliar)")
  .refine((n) => Math.round(n * 100) === n * 100, {
    message: "Nominal maksimal 2 desimal",
  })
export type Rupiah = z.infer<typeof rupiahSchema>

// Coerced variant — accepts string ("50000") from query/form-data
export const rupiahCoercedSchema = z.coerce
  .number()
  .min(0, "Nominal tidak boleh negatif")
  .max(1_000_000_000, "Nominal terlalu besar (maks 1 miliar)")
export type RupiahCoerced = z.infer<typeof rupiahCoercedSchema>

// ============================================================================
// SCORE — 0-100 (default KKM range)
// ============================================================================

export const scoreSchema = z
  .number()
  .min(0, "Nilai minimal 0")
  .max(100, "Nilai maksimal 100")
export type Score = z.infer<typeof scoreSchema>

// ============================================================================
// STRING SAFE — non-empty trimmed string, max 255 chars (default text fields)
// ============================================================================

export const nonEmptyString = z
  .string()
  .trim()
  .min(1, "Wajib diisi")
  .max(255, "Maksimal 255 karakter")

export const shortText = (max = 100) =>
  z.string().trim().min(1, "Wajib diisi").max(max, `Maksimal ${max} karakter`)

export const longText = (max = 2000) =>
  z.string().trim().max(max, `Maksimal ${max} karakter`).optional().or(z.literal(""))

// ============================================================================
// EMAIL — standard RFC 5322 simplified
// ============================================================================

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Format email tidak valid")
  .max(255, "Email terlalu panjang")
  .optional()
  .or(z.literal(""))
export type Email = z.infer<typeof emailSchema>

// ============================================================================
// SLUG / CODE — alphanumeric + dash, used for kelas.code, mapel.code
// ============================================================================

export const codeSchema = z
  .string()
  .trim()
  .min(1, "Kode wajib diisi")
  .max(20, "Kode maksimal 20 karakter")
  .regex(/^[A-Z0-9-]+$/, "Kode hanya boleh huruf besar, angka, dan tanda hubung")
  .optional()
export type Code = z.infer<typeof codeSchema>
