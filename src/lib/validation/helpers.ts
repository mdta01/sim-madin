/**
 * ============================================================================
 * VALIDATION HELPERS — Reusable Zod utilities for Next.js API routes
 * ============================================================================
 *
 * Usage pattern in API routes:
 *
 *   import { validateBody, sanitizeZodError } from "@/lib/validation/helpers"
 *   import { santriCreateSchema } from "@/lib/validation/santri"
 *
 *   export async function POST(req: NextRequest) {
 *     const guard = await requireApiPermission("santri:create", req)
 *     if (guard.error) return guard.error
 *
 *     const body = await validateBody(req, santriCreateSchema)
 *     if (!body.ok) return body.error  // 400 with formatted issues
 *     // body.data is now typed as SantriCreateInput
 *
 *     // ... business logic with body.data
 *   }
 *
 * Why Zod over manual validation?
 *   - Single source of truth: schema defines types AND runtime validation
 *   - Better DX: TypeScript infers input types from schema
 *   - Consistent error format: every endpoint returns the same shape
 *   - Composable: schemas can extend/merge each other
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/**
 * Result of validateBody — discriminated union so callers can early-return
 * on error without unpacking.
 */
export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: NextResponse }

/**
 * Parse + validate the JSON body of a NextRequest against a Zod schema.
 *
 * On success: returns { ok: true, data: T } where T is the schema's inferred type.
 * On failure: returns { ok: false, error: NextResponse(400) } with a clean
 * Indonesian error message + array of field-level issues for form display.
 *
 * @example
 *   const body = await validateBody(req, santriCreateSchema)
 *   if (!body.ok) return body.error
 *   // body.data.name, body.data.gender, etc. — fully typed
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
): Promise<ValidationResult<T>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Body request bukan JSON valid" },
        { status: 400 },
      ),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      error: NextResponse.json(
        {
          error: "Validasi input gagal",
          issues: sanitizeZodError(result.error),
        },
        { status: 400 },
      ),
    }
  }

  return { ok: true, data: result.data }
}

/**
 * Validate query string params from a NextRequest URL.
 *
 * @example
 *   const query = await validateQuery(req, z.object({
 *     page: z.coerce.number().int().min(1).default(1),
 *     limit: z.coerce.number().int().min(1).max(200).default(50),
 *     search: z.string().trim().optional(),
 *   }))
 *   if (!query.ok) return query.error
 *   // query.data.page, query.data.limit, query.data.search
 */
export async function validateQuery<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
): Promise<ValidationResult<T>> {
  const url = new URL(req.url)
  // Build a plain object from URLSearchParams (handles repeated keys)
  const raw: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      error: NextResponse.json(
        {
          error: "Query parameter tidak valid",
          issues: sanitizeZodError(result.error),
        },
        { status: 400 },
      ),
    }
  }

  return { ok: true, data: result.data }
}

/**
 * Format Zod issues into a clean, frontend-friendly array.
 *
 * Each issue has:
 *   - path: dotted path to the field (e.g. "wali.phone" or "items[0].id")
 *   - message: human-readable Indonesian error
 *   - code: Zod issue code (for programmatic handling if needed)
 *
 * @example output
 *   [
 *     { path: "name", message: "Nama wajib diisi", code: "too_small" },
 *     { path: "waliPhone", message: "Format nomor WhatsApp tidak valid", code: "invalid_string" }
 *   ]
 */
export function sanitizeZodError(error: z.ZodError): Array<{
  path: string
  message: string
  code: string
}> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }))
}

/**
 * Common pagination query schema — used by most list endpoints.
 * Coerces string params from URL to numbers with safe defaults.
 *
 * @example
 *   const query = await validateQuery(req, paginationQuerySchema.extend({
 *     search: z.string().trim().optional(),
 *   }))
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

/**
 * Helper for building a "create or update" pair from a base schema:
 *   - Create variant: all required fields
 *   - Update variant: all fields optional (partial)
 *
 * @example
 *   const santriBase = z.object({ name: z.string().min(1), ... })
 *   export const santriCreateSchema = santriBase
 *   export const santriUpdateSchema = makeUpdateSchema(santriBase)
 */
export function makeUpdateSchema<T extends z.ZodObject<any>>(
  base: T,
): z.ZodOptional<z.ZodObject<any>> {
  // Make all fields optional & allow undefined values
  return base.partial().optional() as any
}
