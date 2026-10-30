/**
 * ============================================================================
 * INDEX — Re-export semua schemas untuk import yang ringkas
 * ============================================================================
 *
 * Usage:
 *   import { santriCreateSchema, waliLoginSchema } from "@/lib/validation"
 *
 * Atau import per-modul jika ingin lebih explicit:
 *   import { santriCreateSchema } from "@/lib/validation/santri"
 */
export * from "./helpers"
export * from "./common"
export * from "./santri"
export * from "./wali"
export * from "./akademik"
export * from "./keuangan"
export * from "./akademik-detail"
