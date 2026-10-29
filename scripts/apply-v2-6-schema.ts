/**
 * Apply V2 #6 schema change: add kompetensiId column to Nilai table.
 * Run: bun run scripts/apply-v2-6-schema.ts
 *
 * This is needed because prisma_user doesn't have ALTER TABLE permission.
 * Workaround: execute raw SQL via Prisma's executeRaw.
 * If that fails too, we'll need to apply via Supabase dashboard SQL editor.
 */
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("🔧 Applying V2 #6 schema: add kompetensiId to Nilai...\n")

  // Try 1: direct ALTER TABLE
  try {
    await db.$executeRaw`ALTER TABLE "Nilai" ADD COLUMN IF NOT EXISTS "kompetensiId" TEXT`
    console.log("  ✅ Column kompetensiId added to Nilai")
  } catch (e: any) {
    console.log(`  ❌ ALTER TABLE failed: ${e.message.split("\n")[0]}`)
    console.log("\n  💡 Manual workaround:")
    console.log("  1. Open Supabase Dashboard → SQL Editor")
    console.log('  2. Run: ALTER TABLE "Nilai" ADD COLUMN "kompetensiId" TEXT;')
    console.log('         CREATE INDEX "Nilai_kompetensiId_idx" ON "Nilai"("kompetensiId");')
    console.log('         ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_kompetensiId_fkey" ')
    console.log('           FOREIGN KEY ("kompetensiId") REFERENCES "Kompetensi"("id") ON DELETE SET NULL;')
    process.exit(1)
  }

  // Try 2: add FK constraint
  try {
    await db.$executeRaw`ALTER TABLE "Nilai" ADD CONSTRAINT IF NOT EXISTS "Nilai_kompetensiId_fkey" FOREIGN KEY ("kompetensiId") REFERENCES "Kompetensi"("id") ON DELETE SET NULL`
    console.log("  ✅ FK constraint added")
  } catch (e: any) {
    console.log(`  ⚠️  FK constraint failed (non-fatal): ${e.message.split("\n")[0]}`)
  }

  // Try 3: add index
  try {
    await db.$executeRaw`CREATE INDEX IF NOT EXISTS "Nilai_kompetensiId_idx" ON "Nilai"("kompetensiId")`
    console.log("  ✅ Index created")
  } catch (e: any) {
    console.log(`  ⚠️  Index failed (non-fatal): ${e.message.split("\n")[0]}`)
  }

  // Verify
  const columns: any[] = await db.$queryRaw`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'Nilai' AND column_name = 'kompetensiId'
  `
  if (columns.length > 0) {
    console.log(`  ✅ Verified: kompetensiId column exists (${columns[0].data_type})`)
  } else {
    console.log("  ❌ Column kompetensiId NOT found after ALTER — schema change FAILED")
  }

  console.log("\nDone. Now run: npx prisma generate")
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
