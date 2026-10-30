/**
 * ============================================================================
 * KEUANGAN VALIDATION SCHEMAS
 * ============================================================================
 * Tagihan, Pembayaran, Kas, TransaksiKas, HonorGuru
 * ============================================================================
 */
import { z } from "zod"
import {
  paymentMethodSchema,
  paymentStatusSchema,
  tagihanStatusSchema,
  transaksiKasTypeSchema,
  transaksiKasCategorySchema,
  rupiahSchema,
  idSchema,
  isoDateSchema,
  nonEmptyString,
  shortText,
  longText,
} from "./common"

// ============================================================================
// TAGIHAN
// ============================================================================

/**
 * Honor Guru lifecycle status — matches Prisma model HonorGuru.status.
 * DRAFT → DISETUJUI → DIBAYARKAN (or DITOLAK at any point).
 *
 * NOTE: also accepts legacy "PENDING" for backward-compat with old clients.
 */
const honorGuruStatusInputSchema = z.enum([
  "DRAFT",
  "DISETUJUI",
  "DIBAYARKAN",
  "DITOLAK",
  "PENDING",
])

/**
 * Jenis Tagihan category — matches Prisma JenisTagihan.category.
 * RUTIN = bulanan (syahriyah), INSIDENTAL = sesekali (seragam, ujian).
 */
const jenisTagihanCategorySchema = z.enum(["RUTIN", "INSIDENTAL"])

export const tagihanCreateSchema = z.object({
  santriId: idSchema,
  kelasId: idSchema.optional(),
  jenisTagihanId: idSchema,
  tahunAjaranId: idSchema.optional(), // default to active TA if not provided
  amount: rupiahSchema,
  description: shortText(200).optional(),
  dueDate: isoDateSchema.optional(),
  status: tagihanStatusSchema.optional(),
  // Trigger bulk creation for a kelas/santri list instead of single santri.
  bulk: z.boolean().optional(),
  // Optional: create for bulk santri
  santriIds: z.array(idSchema).optional(),
})
  .refine(
    (data) => !data.santriIds || !data.santriId || data.santriIds.length === 0 || data.santriIds.includes(data.santriId),
    {
      message: "santriId harus salah satu dari santriIds jika keduanya diisi",
      path: ["santriId"],
    },
  )
export type TagihanCreateInput = z.infer<typeof tagihanCreateSchema>

export const tagihanUpdateSchema = z.object({
  amount: rupiahSchema.optional(),
  description: shortText(200).optional().nullable(),
  dueDate: isoDateSchema.optional().nullable(),
  status: tagihanStatusSchema.optional(),
})
export type TagihanUpdateInput = z.infer<typeof tagihanUpdateSchema>

// ============================================================================
// PEMBAYARAN (Payment)
// ============================================================================

export const pembayaranCreateSchema = z.object({
  santriId: idSchema,
  tagihanId: idSchema.optional(),
  tahunAjaranId: idSchema.optional(),
  amount: rupiahSchema,
  paymentMethod: paymentMethodSchema,
  paymentDate: isoDateSchema.optional(),
  note: longText(500),
  status: paymentStatusSchema.optional(),
  // Optional: file upload URL (bukti transfer)
  proofUrl: z.string().url("URL bukti pembayaran tidak valid").optional(),
})
export type PembayaranCreateInput = z.infer<typeof pembayaranCreateSchema>

export const pembayaranUpdateSchema = z.object({
  amount: rupiahSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  paymentDate: isoDateSchema.optional(),
  note: longText(500),
  status: paymentStatusSchema.optional(),
  // For verification: which kas account receives this payment
  kasId: idSchema.optional(),
})
export type PembayaranUpdateInput = z.infer<typeof pembayaranUpdateSchema>

// ============================================================================
// KAS (account)
// ============================================================================

export const kasCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode wajib diisi")
    .max(50, "Kode maksimal 50 karakter")
    .regex(/^[A-Z0-9_-]+$/, "Kode hanya boleh huruf besar, angka, underscores, dan tanda hubung"),
  name: nonEmptyString.max(100),
  description: longText(500),
  accountNumber: shortText(50).optional(), // bank account number
  bankName: shortText(50).optional(),
  type: z
    .string()
    .trim()
    .min(1, "Tipe wajib diisi")
    .max(50, "Tipe maksimal 50 karakter"),
  balance: z.number().min(0, "Saldo awal tidak boleh negatif").default(0),
  isActive: z.boolean().default(true),
})
export type KasCreateInput = z.infer<typeof kasCreateSchema>

export const kasUpdateSchema = z.object({
  name: nonEmptyString.max(100).optional(),
  description: longText(500),
  accountNumber: shortText(50).optional().nullable(),
  bankName: shortText(50).optional().nullable(),
  balance: z.number().min(0, "Saldo tidak boleh negatif").optional(),
  isActive: z.boolean().optional(),
})
export type KasUpdateInput = z.infer<typeof kasUpdateSchema>

// ============================================================================
// TRANSAKSI KAS
// ============================================================================

export const transaksiKasCreateSchema = z.object({
  kasId: idSchema,
  tahunAjaranId: idSchema.optional(),
  type: transaksiKasTypeSchema,
  category: transaksiKasCategorySchema,
  amount: rupiahSchema,
  description: shortText(200),
  reference: shortText(100).optional(), // e.g. invoice number, receipt number
  paymentId: idSchema.optional(),
  honorGuruId: idSchema.optional(),
  transaksiDate: isoDateSchema.optional(),
})
  .refine(
    // PENGELUARAN with HONOR_GURU category must have honorGuruId
    (data) => !(data.type === "PENGELUARAN" && data.category === "HONOR_GURU" && !data.honorGuruId),
    {
      message: "Transaksi honor guru wajib mencantumkan honorGuruId",
      path: ["honorGuruId"],
    },
  )
  .refine(
    // PEMASUKAN with PEMBAYARAN_SANTRI category must have paymentId
    (data) => !(data.type === "PEMASUKAN" && data.category === "PEMBAYARAN_SANTRI" && !data.paymentId),
    {
      message: "Transaksi pembayaran santri wajib mencantumkan paymentId",
      path: ["paymentId"],
    },
  )
export type TransaksiKasCreateInput = z.infer<typeof transaksiKasCreateSchema>

export const transaksiKasUpdateSchema = z.object({
  description: shortText(200).optional().nullable(),
  category: transaksiKasCategorySchema.optional(),
  reference: shortText(100).optional().nullable(),
})
export type TransaksiKasUpdateInput = z.infer<typeof transaksiKasUpdateSchema>

// ============================================================================
// HONOR GURU
// ============================================================================

export const honorGuruCreateSchema = z.object({
  guruId: idSchema,
  tahunAjaranId: idSchema.optional(),
  semesterId: idSchema.optional(), // defaults to active semester if not provided
  periode: shortText(50), // e.g. "2025-10"
  periodeLabel: shortText(100), // e.g. "Oktober 2025"
  // Breakdown
  honorMengajar: z.number().min(0).default(0),
  insentif: z.number().min(0).default(0),
  tunjangan: z.number().min(0).default(0),
  potongan: z.number().min(0).default(0),
  // Optional
  catatan: longText(500),
  paymentDate: isoDateSchema.optional(),
  status: honorGuruStatusInputSchema.optional(),
})
export type HonorGuruCreateInput = z.infer<typeof honorGuruCreateSchema>

export const honorGuruUpdateSchema = z.object({
  periode: shortText(50).optional(),
  periodeLabel: shortText(100).optional(),
  honorMengajar: z.number().min(0).optional(),
  insentif: z.number().min(0).optional(),
  tunjangan: z.number().min(0).optional(),
  potongan: z.number().min(0).optional(),
  catatan: longText(500),
  paymentDate: isoDateSchema.optional().nullable(),
  status: honorGuruStatusInputSchema.optional(),
  // When status → DIBAYARKAN, kasId is required (for auto-create TransaksiKas)
  kasId: idSchema.optional(),
})
  .refine(
    (data) => !(data.status === "DIBAYARKAN" && !data.kasId),
    {
      message: "Status DIBAYARKAN wajib mencantumkan kasId untuk auto-create transaksi kas",
      path: ["kasId"],
    },
  )
export type HonorGuruUpdateInput = z.infer<typeof honorGuruUpdateSchema>

// ============================================================================
// JENIS TAGIHAN (Tagihan type)
// ============================================================================

export const jenisTagihanCreateSchema = z.object({
  code: z.string().trim().min(1).max(20).regex(/^[A-Z0-9-]+$/),
  name: nonEmptyString.max(100),
  description: longText(500),
  defaultAmount: rupiahSchema,
  category: jenisTagihanCategorySchema.optional(),
  isActive: z.boolean().default(true),
})
export type JenisTagihanCreateInput = z.infer<typeof jenisTagihanCreateSchema>

export const jenisTagihanUpdateSchema = z.object({
  code: z.string().trim().min(1).max(20).regex(/^[A-Z0-9-]+$/).optional(),
  name: nonEmptyString.max(100).optional(),
  description: longText(500),
  defaultAmount: rupiahSchema.optional(),
  category: jenisTagihanCategorySchema.optional(),
  isActive: z.boolean().optional(),
})
export type JenisTagihanUpdateInput = z.infer<typeof jenisTagihanUpdateSchema>
