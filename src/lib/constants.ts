/**
 * ============================================================================
 * RE-EXPORT SHIM — Backward compatibility
 * ============================================================================
 * Selama transisi ke monorepo Nx, file ini re-export semua dari
 * packages/shared/src/constants.ts agar import path "@/lib/constants" tetap jalan.
 *
 * Setelah migrasi ke Nx selesai, import langsung dari "@sim-madin/shared".
 * ============================================================================
 */

export * from "../../packages/shared/src/constants"
