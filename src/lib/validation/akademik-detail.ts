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
  tipeTugasSchema,
  tipeMateriSchema,
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

export const bankSoalCreateSchema = z.object({
  mapelId: idSchema,
  kompetensiId: idSchema.optional(),
  tipe: tipeSoalSchema,
  pertanyaan: nonEmptyString.max(2000),
  // For PG: array of options; for ISIAN/ESSAY: empty
  options: z.array(
    z.object({
      label: z.string().min(1).max(5), // "A", "B", "C", "D"
      text: nonEmptyString.max(500),
      isCorrect: z.boolean().default(false),
    }),
  ).optional(),
  correctAnswer: shortText(500).optional(), // for ISIAN/ESSAY
  explanation: longText(1000),
  difficulty: z.enum(["MUDAH", "SEDANG", "SULIT"]).default("SEDANG"),
  bobot: z.number().int().min(1).max(100).default(1),
  tags: z.array(shortText(50)).optional(),
  isActive: z.boolean().default(true),
})
  .refine(
    // PG must have at least 2 options
    (data) => data.tipe !== "PG" || (data.options && data.options.length >= 2),
    {
      message: "Soal pilihan ganda wajib memiliki minimal 2 opsi jawaban",
      path: ["options"],
    },
  )
  .refine(
    // PG must have exactly 1 correct option
    (data) => {
      if (data.tipe !== "PG" || !data.options) return true
      const correctCount = data.options.filter((o) => o.isCorrect).length
      return correctCount === 1
    },
    {
      message: "Soal pilihan ganda wajib memiliki tepat 1 jawaban benar",
      path: ["options"],
    },
  )
  .refine(
    // ISIAN/ESSAY must have correctAnswer
    (data) => !["ISIAN", "ESSAY"].includes(data.tipe) || !!data.correctAnswer,
    {
      message: "Soal isian/essay wajib memiliki kunci jawaban",
      path: ["correctAnswer"],
    },
  )
export type BankSoalCreateInput = z.infer<typeof bankSoalCreateSchema>

export const bankSoalUpdateSchema = z.object({
  mapelId: idSchema.optional(),
  kompetensiId: idSchema.optional().nullable(),
  tipe: tipeSoalSchema.optional(),
  pertanyaan: nonEmptyString.max(2000).optional(),
  options: z.array(
    z.object({
      label: z.string().min(1).max(5),
      text: nonEmptyString.max(500),
      isCorrect: z.boolean().default(false),
    }),
  ).optional(),
  correctAnswer: shortText(500).optional().nullable(),
  explanation: longText(1000),
  difficulty: z.enum(["MUDAH", "SEDANG", "SULIT"]).optional(),
  bobot: z.number().int().min(1).max(100).optional(),
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
  pertemuanId: idSchema.optional(),
  tugasId: idSchema.optional(),
  ujianId: idSchema.optional(),
  kompetensiId: idSchema.optional(),
  type: nilaiTypeSchema,
  score: scoreSchema,
  description: shortText(200).optional(),
})
export type NilaiCreateInput = z.infer<typeof nilaiCreateSchema>

export const nilaiUpdateSchema = z.object({
  score: scoreSchema.optional(),
  description: shortText(200).optional().nullable(),
  type: nilaiTypeSchema.optional(),
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
  topic: shortText(200).optional(),
  description: longText(1000),
  startTime: z.string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu mulai harus HH:MM (contoh: 08:30)")
    .optional(),
  endTime: z.string()
    .regex(/^\d{2}:\d{2}$/, "Format waktu selesai harus HH:MM (contoh: 09:30)")
    .optional(),
  isCompleted: z.boolean().default(false),
})
export type PertemuanCreateInput = z.infer<typeof pertemuanCreateSchema>

export const pertemuanUpdateSchema = z.object({
  topic: shortText(200).optional().nullable(),
  description: longText(1000),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  isCompleted: z.boolean().optional(),
  completedAt: isoDateSchema.optional().nullable(),
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
  kelasId: idSchema.optional(),
  guruId: idSchema.optional(),
  tahunAjaranId: idSchema.optional(),
  semesterId: idSchema.optional(),
  title: nonEmptyString.max(200),
  description: longText(1000),
  tipe: tipeMateriSchema,
  // For PDF/FOTO/AUDIO: URL to uploaded file
  fileUrl: z.string().url("URL file tidak valid").optional(),
  // For LINK: external URL (YouTube, Drive, etc.)
  linkUrl: z.string().url("URL link tidak valid").optional(),
  duration: z.number().int().min(1).optional(), // duration in minutes (for video/audio)
  isPublished: z.boolean().default(false),
})
  .refine(
    (data) => {
      if (data.tipe === "LINK") return !!data.linkUrl
      return !!data.fileUrl // PDF, FOTO, AUDIO need fileUrl
    },
    {
      message: "Tipe LINK wajib mencantumkan linkUrl; tipe lain wajib mencantumkan fileUrl",
      path: ["tipe"],
    },
  )
export type MateriCreateInput = z.infer<typeof materiCreateSchema>

export const materiUpdateSchema = z.object({
  title: nonEmptyString.max(200).optional(),
  description: longText(1000),
  fileUrl: z.string().url().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
  duration: z.number().int().min(1).optional().nullable(),
  isPublished: z.boolean().optional(),
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
  title: nonEmptyString.max(200),
  description: longText(2000),
  tipe: tipeTugasSchema,
  // Due date in the future
  dueDate: isoDateSchema,
  maxScore: z.number().int().min(1).max(100).default(100),
  isPublished: z.boolean().default(false),
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
  tipe: tipeTugasSchema.optional(),
  dueDate: isoDateSchema.optional(),
  maxScore: z.number().int().min(1).max(100).optional(),
  isPublished: z.boolean().optional(),
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
  score: scoreSchema,
  feedback: longText(2000),
})
export type PengumpulanTugasGradeInput = z.infer<typeof pengumpulanTugasGradeSchema>
