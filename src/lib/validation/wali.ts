/**
 * ============================================================================
 * WALI SANTRI VALIDATION SCHEMAS
 * ============================================================================
 * Maps to Prisma model Wali. Used by /api/admin/wali route.
 * ============================================================================
 */
import { z } from "zod"
import {
  whatsappInputSchema,
  activationStatusSchema,
  phoneSchema,
  idSchema,
  nonEmptyString,
  shortText,
  longText,
  emailSchema,
} from "./common"

// ============================================================================
// CREATE
// ============================================================================

export const waliCreateSchema = z.object({
  name: nonEmptyString.max(255),
  phone: whatsappInputSchema,
  email: emailSchema,
  occupation: shortText(100).optional(),
  address: longText(500),
  relationship: shortText(50).default("WALI"),
  nik: z.string()
    .length(16, "NIK harus 16 digit")
    .regex(/^\d+$/, "NIK hanya boleh angka")
    .optional(),
  // Initial santri link (optional — can be added later via SantriWali)
  santriIds: z.array(idSchema).optional(),
  isPrimary: z.boolean().optional(),
})
export type WaliCreateInput = z.infer<typeof waliCreateSchema>

// ============================================================================
// UPDATE
// ============================================================================

export const waliUpdateSchema = z.object({
  name: nonEmptyString.max(255).optional(),
  phone: whatsappInputSchema.optional(),
  email: emailSchema,
  occupation: shortText(100).optional(),
  address: longText(500),
  relationship: shortText(50).optional(),
  nik: z.string()
    .length(16, "NIK harus 16 digit")
    .regex(/^\d+$/, "NIK hanya boleh angka")
    .optional()
    .nullable(),
  activationStatus: activationStatusSchema.optional(),
})
export type WaliUpdateInput = z.infer<typeof waliUpdateSchema>

// ============================================================================
// CHANGE PHONE — POST /api/admin/wali/[id]/change-phone
// ============================================================================

export const waliChangePhoneSchema = z.object({
  newPhone: whatsappInputSchema,
  reason: shortText(200).optional(),
})
export type WaliChangePhoneInput = z.infer<typeof waliChangePhoneSchema>

// ============================================================================
// OTP REQUEST — POST /api/wali/request-otp
// ============================================================================

export const waliOtpRequestSchema = z.object({
  phone: whatsappInputSchema,
  type: z.enum(["INVITE", "FORGOT_PIN"]),
})
export type WaliOtpRequestInput = z.infer<typeof waliOtpRequestSchema>

// ============================================================================
// OTP VERIFY — POST /api/wali/verify-otp
// ============================================================================

export const waliOtpVerifySchema = z.object({
  phone: whatsappInputSchema,
  otp: z.string().length(6, "OTP harus 6 digit").regex(/^\d{6}$/, "OTP hanya boleh angka"),
})
export type WaliOtpVerifyInput = z.infer<typeof waliOtpVerifySchema>

// ============================================================================
// SET PIN — POST /api/wali/set-pin
// ============================================================================

/**
 * Set PIN baru setelah OTP verifikasi berhasil.
 *
 * Body yang diterima route adalah { verifyToken, pin } — `verifyToken` adalah
 * JWT 10-menit yang di-return oleh /api/wali/verify-otp.
 *
 * PIN format: 6 digit angka. Cek PIN lemah (sequential/repeated) tetap
 * dilakukan oleh validatePIN() di route — Zod hanya memvalidasi format.
 */
export const waliSetPinSchema = z.object({
  verifyToken: z.string().min(1, "Token verifikasi wajib diisi"),
  pin: z.string().length(6, "PIN harus 6 digit").regex(/^\d{6}$/, "PIN hanya boleh angka"),
})
export type WaliSetPinInput = z.infer<typeof waliSetPinSchema>

// ============================================================================
// LOGIN — POST /api/wali/login
// ============================================================================

export const waliLoginSchema = z.object({
  phone: whatsappInputSchema,
  pin: z.string().length(6).regex(/^\d{6}$/, "PIN harus 6 digit angka"),
})
export type WaliLoginInput = z.infer<typeof waliLoginSchema>
