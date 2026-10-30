/**
 * ============================================================================
 * MOBILE PRE-BUILD SYNC — Copy shared packages into each mobile app
 * ============================================================================
 * Problem:
 *   Mobile apps (apps/mobile-*) import shared code via relative path:
 *     import { formatRupiah } from "../../../packages/mobile-shared/src"
 *
 *   When EAS Build uploads the mobile app dir to its cloud, the parent
 *   `packages/` folder is NOT included by default. Metro then fails with:
 *     "Unable to resolve module ../../../packages/mobile-shared/src"
 *
 * Solution:
 *   Before running `eas build`, copy the relevant shared package sources
 *   into each app's local `vendor/shared/` and `vendor/mobile-shared/`
 *   directory, then rewrite the app's App.tsx import to point to the
 *   vendored copy.
 *
 *   This script performs:
 *     1. Copy packages/shared/src → apps/mobile-<name>/vendor/shared/src
 *     2. Copy packages/mobile-shared/src → apps/mobile-<name>/vendor/mobile-shared/src
 *     3. Rewrite import paths in src/App.tsx from "../../../packages/..."
 *        to "../vendor/mobile-shared/src"
 *
 * Run before: `eas build --platform android --profile preview`
 *
 * Usage:
 *   npx tsx scripts/sync-mobile-shared.ts
 * ============================================================================
 */
import * as fs from "node:fs"
import * as path from "node:path"

const ROOT = path.resolve(__dirname, "..")
const APPS = ["mobile-bendahara", "mobile-guru", "mobile-kepala", "mobile-wali"]
const SHARED_PKG_SRC = path.join(ROOT, "packages", "shared", "src")
const MOBILE_SHARED_PKG_SRC = path.join(ROOT, "packages", "mobile-shared", "src")

function copyDir(src: string, dst: string): number {
  if (!fs.existsSync(src)) {
    console.warn(`  ! source missing: ${src}`)
    return 0
  }
  fs.mkdirSync(dst, { recursive: true })
  let count = 0
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      count += copyDir(s, d)
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d)
      count++
    }
  }
  return count
}

function rewriteImports(appDir: string): { files: number; rewrites: number } {
  let files = 0
  let rewrites = 0
  const srcDir = path.join(appDir, "src")
  if (!fs.existsSync(srcDir)) return { files: 0, rewrites: 0 }

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        const original = fs.readFileSync(full, "utf8")
        // Rewrite ../../../packages/<name>/src → ../vendor/<name>/src
        // Also rewrite ../../packages/<name>/src → ../vendor/<name>/src (defensive)
        const updated = original
          .replace(/["']\.\.\/\.\.\/\.\.\/packages\/(mobile-shared|shared|api-client|database)\/src["']/g,
            (_, name) => `"../vendor/${name}/src"`)
          .replace(/["']\.\.\/\.\.\/packages\/(mobile-shared|shared|api-client|database)\/src["']/g,
            (_, name) => `"../vendor/${name}/src"`)
        if (updated !== original) {
          fs.writeFileSync(full, updated)
          rewrites++
        }
        files++
      }
    }
  }
  walk(srcDir)
  return { files, rewrites }
}

function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("MOBILE PRE-BUILD SYNC — copy shared packages into each app")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  let totalFiles = 0
  let totalApps = 0

  for (const appName of APPS) {
    const appDir = path.join(ROOT, "apps", appName)
    if (!fs.existsSync(appDir)) {
      console.log(`⚠️  ${appName}: app dir missing, skipping`)
      continue
    }
    const vendorDir = path.join(appDir, "vendor")
    // Clean previous vendor dir
    fs.rmSync(vendorDir, { recursive: true, force: true })
    fs.mkdirSync(vendorDir, { recursive: true })

    console.log(`▸ ${appName}`)
    // 1. Copy shared/src → vendor/shared/src
    const sharedDst = path.join(vendorDir, "shared", "src")
    const sharedCount = copyDir(SHARED_PKG_SRC, sharedDst)
    // 2. Copy mobile-shared/src → vendor/mobile-shared/src
    const mobileSharedDst = path.join(vendorDir, "mobile-shared", "src")
    const mobileSharedCount = copyDir(MOBILE_SHARED_PKG_SRC, mobileSharedDst)
    console.log(`    copied: shared/src (${sharedCount} files), mobile-shared/src (${mobileSharedCount} files)`)

    // 3. Rewrite imports in src/
    const { files, rewrites } = rewriteImports(appDir)
    console.log(`    rewritten: ${rewrites} import(s) across ${files} source file(s)`)

    totalFiles += sharedCount + mobileSharedCount
    totalApps++
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`Done: synced ${totalFiles} files across ${totalApps} apps.`)
  console.log("\n⚠️  Run `git status` to review changes. The vendor/ folders and the")
  console.log("   rewritten App.tsx imports should be committed before pushing")
  console.log("   to GitHub so EAS Build picks them up.")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
}

main()
