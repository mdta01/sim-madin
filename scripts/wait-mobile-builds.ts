/**
 * Poll EAS builds for completion and collect APK download URLs.
 *
 * Usage:
 *   EXPO_TOKEN=xxx npx tsx scripts/wait-mobile-builds.ts
 */
import { execSync } from "node:child_process"

const EXPO_TOKEN = process.env.EXPO_TOKEN
if (!EXPO_TOKEN) {
  console.error("EXPO_TOKEN env var required")
  process.exit(1)
}

interface BuildJob {
  app: string
  buildId: string
  projectSlug: string
}

const BUILDS: BuildJob[] = [
  { app: "mobile-wali",      buildId: "afe8b2e5-a0c9-43a4-9dca-537072d1a2e1", projectSlug: "sim-madin-wali" },
  { app: "mobile-bendahara", buildId: "e0ae46ca-2222-4d16-b95a-8ad684880da0", projectSlug: "sim-madin-bendahara" },
  { app: "mobile-guru",      buildId: "effb8c12-edac-4707-81d4-7d8939a47957", projectSlug: "sim-madin-guru" },
  { app: "mobile-kepala",    buildId: "417dbc06-8a38-46df-a926-1d860d1ee946", projectSlug: "sim-madin-kepala" },
]

interface BuildStatus {
  status: string
  artifacts: { buildUrl?: string }
  shareUrl?: string
}

function fetchStatus(job: BuildJob): BuildStatus {
  const cwd = `/home/z/my-project/apps/${job.app}`
  const out = execSync(
    `eas build:view ${job.buildId} --json --non-interactive`,
    { cwd, encoding: "utf8", env: { ...process.env, EXPO_TOKEN } },
  )
  return JSON.parse(out)
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("Waiting for 4 APK builds to finish (parallel)...")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  const start = Date.now()
  const results: Array<{ job: BuildJob; status: string; apkUrl?: string; shareUrl?: string }> = []
  const pending = new Set(BUILDS.map((b) => b.app))

  while (pending.size > 0) {
    for (const job of BUILDS) {
      if (!pending.has(job.app)) continue
      let status: BuildStatus
      try {
        status = fetchStatus(job)
      } catch (e: any) {
        // transient API errors — retry on next tick
        continue
      }
      const elapsed = formatDuration(Date.now() - start)
      process.stdout.write(`▸ ${job.app.padEnd(20)} ${status.status.padEnd(15)} (${elapsed})\r`)
      if (status.status === "FINISHED" || status.status === "DONE") {
        results.push({
          job,
          status: status.status,
          apkUrl: status.artifacts?.buildUrl,
          shareUrl: status.shareUrl,
        })
        pending.delete(job.app)
        console.log(`▸ ${job.app.padEnd(20)} ✅ FINISHED              (${elapsed})  `)
        if (status.artifacts?.buildUrl) {
          console.log(`    APK: ${status.artifacts.buildUrl}`)
        }
      } else if (status.status === "ERRORED" || status.status === "CANCELED" || status.status === "FAILED") {
        results.push({ job, status: status.status, apkUrl: undefined, shareUrl: status.shareUrl })
        pending.delete(job.app)
        console.log(`▸ ${job.app.padEnd(20)} ❌ ${status.status}              (${elapsed})  `)
      }
    }
    if (pending.size > 0) {
      await new Promise((r) => setTimeout(r, 30000)) // 30s between polls
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("BUILD RESULTS")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
  const succeeded = results.filter((r) => r.apkUrl)
  const failed = results.filter((r) => !r.apkUrl)

  if (succeeded.length > 0) {
    console.log("✅ APKs ready for download:\n")
    for (const r of succeeded) {
      const shareUrl = r.shareUrl || `https://expo.dev/accounts/madinmu01s-team/projects/${r.job.projectSlug}/builds/${r.job.buildId}`
      console.log(`  ${r.job.app}`)
      console.log(`    APK:    ${r.apkUrl}`)
      console.log(`    Status: ${shareUrl}`)
      console.log("")
    }
  }
  if (failed.length > 0) {
    console.log("❌ Failed builds:")
    for (const r of failed) {
      console.log(`  ${r.job.app} — status: ${r.status}`)
      console.log(`    Logs: https://expo.dev/accounts/madinmu01s-team/projects/${r.job.projectSlug}/builds/${r.job.buildId}`)
      console.log("")
    }
  }
  console.log(`Total wait time: ${formatDuration(Date.now() - start)}`)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
