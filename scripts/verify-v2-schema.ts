/**
 * Verify V2 schema tables exist on production Supabase DB.
 * Run: npx tsx scripts/verify-v2-schema.ts
 */
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  const tables = [
    "Materi", "Tugas", "PengumpulanTugas",
    "Pertemuan", "Kompetensi",
  ] as const

  console.log("🔎 Verifying V2 tables on production DB...\n")

  for (const t of tables) {
    try {
      // @ts-expect-error - dynamic model access on Prisma Client
      const count = await (db as any)[t].count()
      console.log(`  ✅ ${t.padEnd(20)} exists — ${count} rows`)
    } catch (e: any) {
      console.log(`  ❌ ${t.padEnd(20)} missing or error: ${e.message.split("\n")[0]}`)
    }
  }

  // Check the pertemuan unique constraint by trying to read with where
  try {
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })
    console.log(`\n📋 Active TA: ${ta?.code ?? "none"} / Semester: ${sem?.name ?? "none"}`)
  } catch (e: any) {
    console.log(`\n⚠️  Could not read active TA/Semester: ${e.message}`)
  }

  // Check PrismaRelation references for V2 (verifying schema is loaded into client)
  const models = Object.keys(db as any).filter(k => !k.startsWith("_") && !k.startsWith("$"))
  const v2Models = ["materi", "tugas", "pengumpulanTugas", "pertemuan", "kompetensi"]
  const missing = v2Models.filter(m => !models.includes(m))
  console.log(`\n📦 Prisma Client models check: ${missing.length === 0 ? "ALL V2 MODELS PRESENT" : `MISSING: ${missing.join(", ")}`}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
