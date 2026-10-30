/**
 * ============================================================================
 * AKADEMIK & PEMBELAJARAN VALIDATION SCHEMAS
 * ============================================================================
 * Ujian, BankSoal, Absensi, Nilai, Pertemuan, Jadwal, Materi, Tugas
 * ============================================================================
 */
import { z } from "zod"
import {
  ujianTypeSchema,
  tipeSoalSchema,
  absensiStatusSchema,
  nilaiTypeSchema,
  idSchema,
  isoDateSchema,
  nonEmptyString,
  shortText,
  longText,
  scoreSchema,
} from "./common"

// ============================================================================
// UJIAN
// ============================================================================

export const ujianCreateSchema = z.object({
  title: nonEmptyString.max(200),
  type: ujianTypeSchema,
  mapelId: idSchema,
  kelasId: idSchema,
  guruId: idSchema.optional(),
  tahunAjaranId: idSchema.optional(),
  semesterId: idSchema.optional(),
  description: longText(1000),
  startTime: isoDateSchema,
  endTime: isoDateSchema,
  durationMnt: z.number().int().min(5, "Durasi minimal 5 menit").max(300, "Durasi maksimal 300 menit").default(90),
  ruang: shortText(50).optional(),
  pengawas: shortText(100).optional(),
  isPublished: z.boolean().default(false),
  maxScore: z.number().int().min(1).max(100).default(100),
  passingScore: z.number().int().min(0).max(100).optional().nullable(),
})
  .refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    {
      message: "Waktu selesai harus setelah waktu mulai",
      path: ["endTime"],
    },
  )
export type UjianCreateInput = z.infer<typeof ujianCreateSchema>

export const ujianUpdateSchema = z.object({
  title: nonEmptyString.max(200).optional(),
  type: ujianTypeSchema.optional(),
  mapelId: idSchema.optional(),
  kelasId: idSchema.optional(),
  guruId: idSchema.optional().nullable(),
  description: longText(1000),
  startTime: isoDateSchema.optional(),
  endTime: isoDateSchema.optional(),
  durationMnt: z.number().int().min(5).max(300).optional(),
  ruang: shortText(50).optional().nullable(),
  pengawas: shortText(100).optional().nullable(),
  isPublished: z.boolean().optional(),
  maxScore: z.number().int().min(1).max(100).optional(),
  passingScore: z.number().int().min(0).max(100).optional().nullable(),
})
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime)
      }
      return true
    },
    { message: "Waktu selesai harus setelah waktu mulai", path: ["endTime"] },
  )
export type UjianUpdateInput = z.infer<typeof ujianUpdateSchema>

// ============================================================================
// BANK SOAL
// ============================================================================

/**
 * NOTE: field names match Prisma column names (e.g. `type`, `question`,
 * `code`, `answerKey`, `externalUrl`) so routes can spread validated data
 * directly into `db.bankSoal.create({ data: ... })` without remapping.
 */
export const bankSoalCreateSchema = z.object({
  mapelId: idSchema,
  tahunAjaranId: idSchema.optional(),
  guruId: idSchema.optional(),
  kompetensiId: idSchema.optional().nullable(),
  code: shortText(50),
  type: tipeSoalSchema,
  question: nonEmptyString.max(2000),
  // For PG: array of options; for ISIAN/ESSAY: empty
  options: z.array(
    z.object({
      label: z.string().min(1).max(5), // "A", "B", "C", "D"
      text: nonEmptyString.max(500),
      isCorrect: z.boolean().default(false),
    }),
  ).optional(),
  correctAnswer: shortText(500).optional().nullable(), // for PG/ISIAN/ESSAY
  answerKey: longText(2000), // rubric for ESSAY/PRAKTIK
  difficulty: z.enum(["MUDAH", "SEDANG", "SULIT"]).default("SEDANG"),
  bobot: z.number().min(0, "Bobot minimal 0").max(100, "Bobot maksimal 100").default(1),
  tags: z.array(shortText(50)).optional(),
  isActive: z.boolean().default(true),
})
  .refine(
    // PG must have at least 2 options
    (data) => data.type !== "PG" || (data.options && data.options.length >= 2),
    {
      message: "Soal pilihan ganda wajib memiliki minimal 2 opsi jawaban",
      path: ["options"],
    },
  )
  .refine(
    // PG must have exactly 1 correct option
    (data) => {
      if (data.type !== "PG" || !data.options) return true
      const correctCount = data.options.filter((o) => o.isCorrect).length
      return correctCount === 1
    },
    {
      message: "Soal pilihan ganda wajib memiliki tepat 1 jawaban benar",
      path: ["options"],
    },
  )
export type BankSoalCreateInput = z.infer<typeof bankSoalCreateSchema>

export const bankSoalUpdateSchema = z.object({
  mapelId: idSchema.optional(),
  kompetensiId: idSchema.optional().nullable(),
  type: tipeSoalSchema.optional(),
  question: nonEmptyString.max(2000).optional(),
  options: z.array(
    z.object({
      label: z.string().min(1).max(5),
      text: nonEmptyString.max(500),
      isCorrect: z.boolean().default(false),
    }),
  ).optional(),
  correctAnswer: shortText(500).optional().nullable(),
  answerKey: longText(2000),
  difficulty: z.enum(["MUDAH", "SEDANG", "SULIT"]).optional(),
  bobot: z.number().min(0).max(100).optional(),
  tags: z.array(shortText(50)).optional(),
  isActive: z.boolean().optional(),
})
export type BankSoalUpdateInput = z.infer<typeof bankSoalUpdateSchema>

// ============================================================================
// ABSENSI
// ============================================================================

export const absensiCreateSchema = z.object({
  santriId: idSchema,
  pertemuanId: idSchema.optional(),
  kelasId: idSchema,
  tahunAjaranId: idSchema.optional(),
  date: isoDateSchema.optional(),
  status: absensiStatusSchema,
  note: longText(500),
  // Optional: recorded by guru
  guruId: idSchema.optional(),
})
export type AbsensiCreateInput = z.infer<typeof absensiCreateSchema>

/**
 * Bulk absensi — used by "Tandai Semua Hadir" button or per-pertemuan bulk update.
 */
export const absensiBulkCreateSchema = z.object({
  pertemuanId: idSchema.optional(),
  kelasId: idSchema,
  tahunAjaranId: idSchema.optional(),
  date: isoDateSchema.optional(),
  // Optional: guru who recorded the bulk absensi (applies to all entries)
  recordedByGuruId: idSchema.optional(),
  entries: z.array(
    z.object({
      santriId: idSchema,
      status: absensiStatusSchema,
      note: longText(500),
      // Optional per-entry guru override
      guruId: idSchema.optional(),
    }),
  ).min(1, "Minimal 1 entry absensi wajib diisi"),
})
export type AbsensiBulkCreateInput = z.infer<typeof absensiBulkCreateSchema>

// ============================================================================
// NILAI
// ============================================================================

export const nilaiCreateSchema = z.object({
  santriId: idSchema,
  mapelId: idSchema,
  kelasId: idSchema.optional(),
  tahunAjaranId: idSchema.optional(),
  semesterId: idSchema.optional(),
  guruId: idSchema.optional(),
  kompetensiId: idSchema.optional().nullable(),
  type: nilaiTypeSchema,
  score: scoreSchema,
  notes: longText(500),
  assessmentDate: isoDateSchema.optional(),
})
export type NilaiCreateInput = z.infer<typeof nilaiCreateSchema>

export const nilaiUpdateSchema = z.object({
  score: scoreSchema.optional(),
  notes: longText(500),
  type: nilaiTypeSchema.optional(),
  guruId: idSchema.optional().nullable(),
  kompetensiId: idSchema.optional().nullable(),
  assessmentDate: isoDateSchema.optional(),
})
export type NilaiUpdateInput = z.infer<typeof nilaiUpdateSchema>

/**
 * Bulk nilai — used by per-pertemuan grading (assign same score to multiple santri)
 */
export const nilaiBulkCreateSchema = z.object({
  mapelId: idSchema,
  kelasId: idSchema,
  pertemuanId: idSchema.optional(),
  tahunAjaranId: idSchema.optional(),
  semesterId: idSchema.optional(),
  guruId: idSchema.optional(),
  type: nilaiTypeSchema,
  entries: z.array(
    z.object({
      santriId: idSchema,
      score: scoreSchema,
      description: shortText(200).optional(),
    }),
  ).min(1, "Minimal 1 entry nilai wajib diisi"),
})
export type NilaiBulkCreateInput = z.infer<typeof nilaiBulkCreateSchema>

// ============================================================================
// PERTEMUAN
// ============================================================================

export const pertemuanCreateSchema = z.object({
  jadwalId: idSchema.optional(),
  kelasId: idSchema,
  mapelId: idSchema,
  guruId: idSchema.optional(),
  tahunAjaranId: idSchema.optional(),
  semesterId: idSchema.optional(),
  date: isoDateSchema,
  pertemuanKe: z.coerce
    .number()
    .int("Pertemuan ke- wajib bilangan bulat")
    .min(1, "Pertemuan ke- minimal 1")
    .max(200, "Pertemuan ke- maksimal 200"),
  topic: shortText(200).optional(),
  description: longText(1000),
  isCompleted: z.boolean().default(false),
})
export type PertemuanCreateInput = z.infer<typeof pertemuanCreateSchema>

export const pertemuanUpdateSchema = z.object({
  topic: shortText(200).optional().nullable(),
  description: longText(1000),
  date: isoDateSchema.optional(),
  guruId: idSchema.optional().nullable(),
  isCompleted: z.boolean().optional(),
})
export type PertemuanUpdateInput = z.infer<typeof pertemuanUpdateSchema>

// ============================================================================
// JADWAL
// ============================================================================

export const jadwalCreateSchema = z.object({
  kelasId: idSchema,
  mapelId: idSchema,
  guruId: idSchema,
  tahunAjaranId: idSchema.optional(),
  semesterId: idSchema.optional(),
  dayOfWeek: z
    .number()
    .int("Hari wajib berupa angka 1-7")
    .min(1, "Hari minimal 1 (Senin)")
    .max(7, "Hari maksimal 7 (Minggu)"),
  startTime: z.string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu mulai harus HH:MM"),
  endTime: z.string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu selesai harus HH:MM"),
  // Optional: recurring pattern
  isRecurring: z.boolean().default(true),
})
  .refine(
    (data) => data.endTime > data.startTime,
    {
      message: "Waktu selesai harus setelah waktu mulai",
      path: ["endTime"],
    },
  )
export type JadwalCreateInput = z.infer<typeof jadwalCreateSchema>

export const jadwalUpdateSchema = z.object({
  kelasId: idSchema.optional(),
  mapelId: idSchema.optional(),
  guruId: idSchema.optional(),
  dayOfWeek: z
    .number()
    .int("Hari wajib berupa angka 1-7")
    .min(1, "Hari minimal 1 (Senin)")
    .max(7, "Hari maksimal 7 (Minggu)")
    .optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format waktu mulai harus HH:MM").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format waktu selesai harus HH:MM").optional(),
  isRecurring: z.boolean().optional(),
})
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime
      }
      return true
    },
    { message: "Waktu selesai harus setelah waktu mulai", path: ["endTime"] },
  )
export type JadwalUpdateInput = z.infer<typeof jadwalUpdateSchema>

// ============================================================================
// MATERI PEMBELAJARAN
// ============================================================================

export const materiCreateSchema = z.object({
  mapelId: idSchema,
  kelasId: idSchema.optional().nullable(),
  guruId: idSchema.optional(),
  tahunAjaranId: idSchema.optional(),
  semesterId: idSchema.optional(),
  title: nonEmptyString.max(200),
  description: longText(1000),
  type: z.enum(["PDF", "FOTO", "AUDIO", "LINK", "DOKUMEN"]).default("DOKUMEN"),
  // For PDF/FOTO/AUDIO: URL to uploaded file
  fileUrl: z.string().url("URL file tidak valid").optional().nullable(),
  // For LINK: external URL (YouTube, Drive, etc.)
  externalUrl: z.string().url("URL link tidak valid").optional().nullable(),
  pertemuan: z.number().int().min(1).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
})
  .refine(
    (data) => {
      if (data.type === "LINK") return !!data.externalUrl
      if (["PDF", "FOTO", "AUDIO"].includes(data.type)) return !!data.fileUrl
      return true // DOKUMEN may have neither (text-only)
    },
    {
      message: "Tipe LINK wajib mencantumkan externalUrl; tipe PDF/FOTO/AUDIO wajib mencantumkan fileUrl",
      path: ["type"],
    },
  )
export type MateriCreateInput = z.infer<typeof materiCreateSchema>

export const materiUpdateSchema = z.object({
  title: nonEmptyString.max(200).optional(),
  description: longText(1000),
  type: z.enum(["PDF", "FOTO", "AUDIO", "LINK", "DOKUMEN"]).optional(),
  fileUrl: z.string().url().optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  pertemuan: z.number().int().min(1).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
  mapelId: idSchema.optional(),
  kelasId: idSchema.optional().nullable(),
  guruId: idSchema.optional().nullable(),
})
export type MateriUpdateInput = z.infer<typeof materiUpdateSchema>

// ============================================================================
// TUGAS
// ============================================================================

export const tugasCreateSchema = z.object({
  mapelId: idSchema,
  kelasId: idSchema,
  guruId: idSchema.optional(),
  tahunAjaranId: idSchema.optional(),
  semesterId: idSchema.optional(),
  materiId: idSchema.optional().nullable(),
  title: nonEmptyString.max(200),
  description: longText(2000),
  type: z.enum(["INDIVIDU", "KELOMPOK", "PRAKTIK", "HAFALAN"]).default("INDIVIDU"),
  fileUrl: z.string().url().optional().nullable(),
  // Due date in the future
  dueDate: isoDateSchema,
  maxScore: z.number().int().min(1).max(100).default(100),
  isPublished: z.boolean().default(true),
  // Optional: attach files (URL list)
  attachments: z.array(z.string().url()).optional(),
})
  .refine(
    (data) => new Date(data.dueDate) > new Date(),
    {
      message: "Tenggat waktu harus di masa depan",
      path: ["dueDate"],
    },
  )
export type TugasCreateInput = z.infer<typeof tugasCreateSchema>

export const tugasUpdateSchema = z.object({
  title: nonEmptyString.max(200).optional(),
  description: longText(2000),
  type: z.enum(["INDIVIDU", "KELOMPOK", "PRAKTIK", "HAFALAN"]).optional(),
  fileUrl: z.string().url().optional().nullable(),
  dueDate: isoDateSchema.optional(),
  maxScore: z.number().int().min(1).max(100).optional(),
  isPublished: z.boolean().optional(),
  mapelId: idSchema.optional(),
  kelasId: idSchema.optional(),
  guruId: idSchema.optional().nullable(),
  materiId: idSchema.optional().nullable(),
  attachments: z.array(z.string().url()).optional(),
})
export type TugasUpdateInput = z.infer<typeof tugasUpdateSchema>

// ============================================================================
// PENGUMPULAN TUGAS (submission)
// ============================================================================

export const pengumpulanTugasCreateSchema = z.object({
  tugasId: idSchema,
  santriId: idSchema.optional(), // optional if submitted by wali (linked via token)
  content: longText(5000),
  // Optional: file attachment URLs
  fileUrls: z.array(z.string().url()).optional(),
})
export type PengumpulanTugasCreateInput = z.infer<typeof pengumpulanTugasCreateSchema>

export const pengumpulanTugasGradeSchema = z.object({
  score: scoreSchema.optional().nullable(),
  feedback: longText(2000),
  status: z.enum(["SUBMITTED", "GRADED", "RETURNED", "LATE"]).optional(),
})
export type PengumpulanTugasGradeInput = z.infer<typeof pengumpulanTugasGradeSchema>
