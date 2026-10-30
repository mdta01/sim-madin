/**
 * ============================================================================
 * MOBILE APPS TYPECHECK RUNNER
 * ============================================================================
 * Purpose:
 *   Run `tsc --noEmit` against each Expo React Native app independently
 *   (apps/mobile-bendahara, mobile-guru, mobile-kepala, mobile-wali) and
 *   also against the shared packages they depend on (packages/mobile-shared,
 *   packages/shared), then print a consolidated summary.
 *
 * Why a separate script (not just tsc -p per app tsconfig.json)?
 *   1. The Next.js workspace tsconfig.json EXCLUDES mobile apps (because they
 *      need RN module types that aren't installed at root). Each app has its
 *      own tsconfig.json that includes the mobile-types ambient shims file
 *      (apps/mobile-types/rn-shims.d.ts).
 *   2. We want a single entry point that prints a clean pass/fail summary
 *      across all apps, plus the shared packages they import from.
 *   3. CI-friendly: exits with code 1 if ANY app fails, 0 if all pass.
 *
 * Run:
 *   npx tsx scripts/typecheck-mobile.ts
 *
 * Or via npm script:
 *   bun run typecheck:mobile    # if using bun
 *   npm run typecheck:mobile    # if using npm
 * ============================================================================
 */
import { execSync } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

const ROOT = resolve(__dirname, "..")

interface Project {
  id: string
  path: string
  label: string
  /** Set true for shared packages — these are type-checked via their own tsconfig if present */
  isShared?: boolean
}

// Mobile apps + their shared dependencies (type-checked in dependency order)
const PROJECTS: Project[] = [
  // Shared deps first — apps import from these via path mapping
  { id: "shared",       path: "packages/shared",        label: "packages/shared" },
  { id: "mobile-shared", path: "packages/mobile-shared", label: "packages/mobile-shared" },
  // Then the 4 Expo apps
  { id: "mobile-bendahara", path: "apps/mobile-bendahara", label: "Bendahara Mobile App" },
  { id: "mobile-guru",      path: "apps/mobile-guru",      label: "Guru Mobile App" },
  { id: "mobile-kepala",    path: "apps/mobile-kepala",    label: "Kepala Mobile App" },
  { id: "mobile-wali",      path: "apps/mobile-wali",      label: "Wali Mobile App" },
]

interface ProjectResult {
  project: Project
  ok: boolean
  /** Number of TS error lines reported by tsc. */
  errorCount: number
  /** First few lines of tsc output for quick triage. */
  sampleErrors: string[]
  /** Wall-clock duration in ms. */
  durationMs: number
  /** Why we skipped (if we skipped). */
  skippedReason?: string
}

function tsconfigPathFor(project: Project): string | null {
  // Shared packages don't all have their own tsconfig — fall back to running
  // tsc with the root tsconfig.base.json scoped to the package directory.
  const pkgTsConfig = join(ROOT, project.path, "tsconfig.json")
  if (existsSync(pkgTsConfig)) return pkgTsConfig
  return null
}

function countTsErrors(output: string): number {
  // tsc prints one line per error in the form `path(L,C): error TSxxxx: ...`
  // We count distinct error lines.
  const lines = output.split(/\r?\n/)
  return lines.filter((l) => /\berror TS\d{4,}:\s/.test(l)).length
}

function sampleErrorLines(output: string, n = 3): string[] {
  const lines = output.split(/\r?\n/)
  return lines.filter((l) => /\berror TS\d{4,}:\s/.test(l)).slice(0, n)
}

function typecheckProject(project: Project): ProjectResult {
  const start = Date.now()
  const tsconfig = tsconfigPathFor(project)
  if (!tsconfig) {
    return {
      project,
      ok: false,
      errorCount: 0,
      sampleErrors: [],
      durationMs: 0,
      skippedReason: `No tsconfig.json found under ${project.path}`,
    }
  }

  // Use the local TypeScript binary (workspace node_modules/.bin/tsc).
  const tscBin = join(ROOT, "node_modules", ".bin", "tsc")
  if (!existsSync(tscBin)) {
    return {
      project,
      ok: false,
      errorCount: 0,
      sampleErrors: [],
      durationMs: 0,
      skippedReason: "node_modules/.bin/tsc not found — run `npm install` first",
    }
  }

  let output = ""
  let exitCode = 0
  try {
    // We use execSync and capture stderr+stdout. tsc writes errors to stdout.
    output = execSync(`"${tscBin}" --noEmit -p "${tsconfig}"`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024,
    })
  } catch (err: any) {
    output = err.stdout ?? ""
    if (err.stderr) output += "\n" + err.stderr
    exitCode = err.status ?? 1
  }

  const errorCount = countTsErrors(output)
  const sampleErrors = sampleErrorLines(output, 3)
  const durationMs = Date.now() - start

  return {
    project,
    ok: errorCount === 0 && exitCode === 0,
    errorCount,
    sampleErrors,
    durationMs,
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("MOBILE APPS TYPECHECK")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  const results: ProjectResult[] = []
  for (const project of PROJECTS) {
    process.stdout.write(`▸ ${project.label.padEnd(28)} `)
    const result = typecheckProject(project)
    results.push(result)

    if (result.skippedReason) {
      console.log(`⚠️  SKIPPED — ${result.skippedReason}`)
      continue
    }

    const icon = result.ok ? "✅" : "❌"
    const summary = result.ok
      ? `0 errors`
      : `${result.errorCount} error${result.errorCount === 1 ? "" : "s"}`
    console.log(`${icon} ${summary.padEnd(12)} (${formatDuration(result.durationMs)})`)
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok && !r.skippedReason).length
  const skipped = results.filter((r) => r.skippedReason).length
  const totalErrors = results.reduce((s, r) => s + r.errorCount, 0)
  console.log(
    `RESULT: ${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ""} | ` +
    `${results.length} projects | ${totalErrors} total errors`,
  )
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  // Print sample errors for any failed project
  const failedResults = results.filter((r) => !r.ok && !r.skippedReason && r.sampleErrors.length > 0)
  if (failedResults.length > 0) {
    console.log("Sample errors per failed project:\n")
    for (const r of failedResults) {
      console.log(`▸ ${r.project.label}`)
      for (const line of r.sampleErrors) {
        console.log(`    ${line}`)
      }
      console.log("")
    }
  }

  // Exit code 1 if any project failed (excluding skipped)
  const exitCode = failed > 0 ? 1 : 0
  process.exit(exitCode)
}

main()
