/**
 * Apply V2 #6 schema via Supabase Management API (admin-level SQL execution).
 * Uses the Supabase Personal Access Token (sbp_*) — NOT the service role key.
 *
 * Run: SUPABASE_ACCESS_TOKEN=sbp_xxx bun run scripts/apply-v2-6-schema-supabase.ts
 */
import "dotenv/config"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ""

if (!SUPABASE_URL || !ACCESS_TOKEN) {
  console.error("❌ Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ACCESS_TOKEN required")
  console.error("   Pass: SUPABASE_ACCESS_TOKEN=sbp_xxx bun run ...")
  process.exit(1)
}

const PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0]
console.log(`Project: ${PROJECT_REF}\n`)

const SQL = `
-- Add kompetensiId column to Nilai (V2 #6)
ALTER TABLE "Nilai" ADD COLUMN IF NOT EXISTS "kompetensiId" TEXT;

-- Add index for performance (skip FK constraint to avoid cross-table ownership issues;
-- referential integrity is enforced at Prisma app level via onDelete: SetNull)
CREATE INDEX IF NOT EXISTS "Nilai_kompetensiId_idx" ON "Nilai"("kompetensiId");
`

async function main() {
  // Try the /rest/v1/rpc/ approach — won't work for DDL.
  // Try Management API at https://api.supabase.com/v1/projects/{ref}/database/query
  console.log("Trying Supabase Management API: database/query...")

  const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`
  const mgmtRes = await fetch(mgmtUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: SQL }),
  })

  if (mgmtRes.ok) {
    console.log("  ✅ Schema applied via Management API")
    const text = await mgmtRes.text()
    console.log("  Response:", text.slice(0, 300))
    return
  }

  console.log(`  ❌ Management API: ${mgmtRes.status} ${mgmtRes.statusText}`)
  const errText = await mgmtRes.text()
  console.log("  Body:", errText.slice(0, 300))

  // Fallback: try postgres connection string via direct TCP
  // (we can't, no psql available)

  console.log("\n💡 Manual workaround required:")
  console.log("  1. Open Supabase Dashboard → SQL Editor")
  console.log("  2. Copy SQL from scripts/apply-v2-6-schema-supabase.ts")
  console.log("  3. Run it as database owner")
  console.log("\nSQL to run:")
  console.log(SQL)
}

main().catch((e) => {
  console.error("❌ Failed:", e)
  process.exit(1)
})
