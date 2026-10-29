/**
 * Apply V3 clarification: drop isOnline column from Ujian table.
 * Ujian is always offline (manual input). Online exam = future V3.5.
 *
 * Run: SUPABASE_ACCESS_TOKEN=sbp_xxx bun run scripts/apply-v3-clarify.ts
 */
import "dotenv/config"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ""

if (!SUPABASE_URL || !ACCESS_TOKEN) {
  console.error("❌ Missing env")
  process.exit(1)
}

const PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0]
console.log(`Project: ${PROJECT_REF}\n`)

const SQL = `
ALTER TABLE "Ujian" DROP COLUMN IF EXISTS "isOnline";
`

async function main() {
  const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`
  const res = await fetch(mgmtUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: SQL }),
  })

  if (res.ok) {
    console.log("  ✅ Dropped isOnline column from Ujian")
  } else {
    const text = await res.text()
    console.log(`  ❌ ${res.status}: ${text.slice(0, 200)}`)
  }
}

main().catch(console.error)
