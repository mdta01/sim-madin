/**
 * ============================================================================
 * SANTRI VALIDATION SCHEMAS
 * ============================================================================
 * Maps to Prisma model Santri. Used by /api/admin/santri route.
 * ============================================================================
 */
import { z } from "zod"
import {
  genderSchema,
  santriStatusSchema,
  whatsappInputSchema,
  nisSchema,
  nisnSchema,
  phoneSchema,
  idSchema,
  isoDateSchema,
  nonEmptyString,
  shortText,
  longText,
} from "./common"

// ============================================================================
// CREATE — POST /api/admin/santri
// ============================================================================

export const santriCreateSchema = z.object({
  // Required
  name: nonEmptyString.max(255, "Nama maksimal 255 karakter"),
  gender: genderSchema,

  // Optional identification
  nis: nisSchema,
  nisn: nisnSchema,

  // Optional biographical
  birthPlace: shortText(100).optional(),
  birthDate: isoDateSchema.optional(),
  address: longText(500),
  phone: phoneSchema.optional(),

  // Optional relations
  waliId: idSchema.optional(),
  kelasId: idSchema.optional(),
  tahunAjaranId: idSchema.optional(),
  entryDate: isoDateSchema.optional(),
  status: santriStatusSchema.optional(),
  photoUrl: z.string().url("URL foto tidak valid").optional(),

  // Auto-create new wali (if waliId not provided)
  waliName: shortText(100).optional(),
  waliPhone: whatsappInputSchema.optional(),
  waliRelationship: shortText(50).optional(),
}).refine(
  // Either waliId (existing wali) OR waliName+waliPhone (new wali) — not both
  (data) => {
    const hasExistingWali = !!data.waliId
    const hasNewWali = !!(data.waliName && data.waliPhone)
    // OK: neither (no wali linked) OR existing OR new (with both name+phone)
    if (!hasExistingWali && !hasNewWali) return true
    if (hasExistingWali && !hasNewWali) return true
    if (!hasExistingWali && hasNewWali) return true
    return false // can't have both
  },
  {
    message: "Pilih salah satu: link ke wali existing (waliId) ATAU buat wali baru (waliName+waliPhone), jangan keduanya",
    path: ["waliId"],
  },
)
export type SantriCreateInput = z.infer<typeof santriCreateSchema>

// ============================================================================
// UPDATE — PUT /api/admin/santri/[id]
// ============================================================================

export const santriUpdateSchema = z.object({
  name: nonEmptyString.max(255).optional(),
  gender: genderSchema.optional(),
  nis: nisSchema,
  nisn: nisnSchema,
  birthPlace: shortText(100).optional(),
  birthDate: isoDateSchema.optional(),
  address: longText(500),
  phone: phoneSchema.optional(),
  waliId: idSchema.optional(),
  kelasId: idSchema.optional().nullable(),
  tahunAjaranId: idSchema.optional(),
  entryDate: isoDateSchema.optional(),
  status: santriStatusSchema.optional(),
  photoUrl: z.string().url().optional().nullable(),
})
export type SantriUpdateInput = z.infer<typeof santriUpdateSchema>

// ============================================================================
// QUERY — GET /api/admin/santri (extends pagination)
// ============================================================================

export const santriQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  kelasId: idSchema.optional(),
  status: santriStatusSchema.optional(),
  gender: genderSchema.optional(),
})
export type SantriQuery = z.infer<typeof santriQuerySchema>
