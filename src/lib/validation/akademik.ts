/**
 * ============================================================================
 * GURU, KELAS & MAPEL VALIDATION SCHEMAS
 * ============================================================================
 */
import { z } from "zod"
import {
  genderSchema,
  guruStatusSchema,
  phoneSchema,
  idSchema,
  isoDateSchema,
  nonEmptyString,
  shortText,
  longText,
  emailSchema,
  codeSchema,
} from "./common"

// ============================================================================
// GURU
// ============================================================================

export const guruCreateSchema = z.object({
  name: nonEmptyString.max(255),
  gender: genderSchema,
  nip: z.string()
    .min(8, "NIP minimal 8 digit")
    .max(20, "NIP maksimal 20 digit")
    .regex(/^\d+$/, "NIP hanya boleh angka")
    .optional(),
  nuptk: z.string()
    .length(16, "NUPTK harus 16 digit")
    .regex(/^\d+$/, "NUPTK hanya boleh angka")
    .optional(),
  birthPlace: shortText(100).optional(),
  birthDate: isoDateSchema.optional(),
  address: longText(500),
  phone: phoneSchema.optional(),
  email: emailSchema,
  specialization: shortText(100).optional(),
  joinDate: isoDateSchema.optional(),
  status: guruStatusSchema.optional(),
})
export type GuruCreateInput = z.infer<typeof guruCreateSchema>

export const guruUpdateSchema = z.object({
  name: nonEmptyString.max(255).optional(),
  gender: genderSchema.optional(),
  nip: z.string().min(8).max(20).regex(/^\d+$/).optional().nullable(),
  nuptk: z.string().length(16).regex(/^\d+$/).optional().nullable(),
  birthPlace: shortText(100).optional().nullable(),
  birthDate: isoDateSchema.optional().nullable(),
  address: longText(500),
  phone: phoneSchema.optional().nullable(),
  email: emailSchema,
  specialization: shortText(100).optional().nullable(),
  joinDate: isoDateSchema.optional(),
  status: guruStatusSchema.optional(),
})
export type GuruUpdateInput = z.infer<typeof guruUpdateSchema>

// ============================================================================
// KELAS
// ============================================================================

export const kelasCreateSchema = z.object({
  code: z.string()
    .trim()
    .min(1, "Kode kelas wajib diisi")
    .max(20, "Kode maksimal 20 karakter")
    .regex(/^[A-Z0-9-]+$/, "Kode hanya boleh huruf besar, angka, dan tanda hubung"),
  name: nonEmptyString.max(100),
  level: z.string().trim().min(1, "Level wajib diisi").max(20, "Level maksimal 20 karakter"),
  description: longText(500),
  capacity: z.number().int().min(1, "Kapasitas minimal 1").max(100, "Kapasitas maksimal 100").default(30),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  waliKelasId: idSchema.optional().nullable(),
})
export type KelasCreateInput = z.infer<typeof kelasCreateSchema>

export const kelasUpdateSchema = z.object({
  code: z.string().trim().min(1).max(20).regex(/^[A-Z0-9-]+$/).optional(),
  name: nonEmptyString.max(100).optional(),
  level: z.string().trim().min(1).max(20).optional(),
  description: longText(500),
  capacity: z.number().int().min(1).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  waliKelasId: idSchema.optional().nullable(),
})
export type KelasUpdateInput = z.infer<typeof kelasUpdateSchema>

// ============================================================================
// MAPEL (Mata Pelajaran)
// ============================================================================

export const mapelCreateSchema = z.object({
  code: codeSchema,
  name: nonEmptyString.max(100),
  description: longText(500),
  kkm: z.number().int().min(50, "KKM minimal 50").max(100, "KKM maksimal 100").default(75),
  isActive: z.boolean().default(true),
  // Optional: assign to kelas + guru in one call
  kelasIds: z.array(idSchema).optional(),
  guruId: idSchema.optional(),
})
export type MapelCreateInput = z.infer<typeof mapelCreateSchema>

export const mapelUpdateSchema = z.object({
  code: codeSchema,
  name: nonEmptyString.max(100).optional(),
  description: longText(500),
  kkm: z.number().int().min(50).max(100).optional(),
  isActive: z.boolean().optional(),
})
export type MapelUpdateInput = z.infer<typeof mapelUpdateSchema>
