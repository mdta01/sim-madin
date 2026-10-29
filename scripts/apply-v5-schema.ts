/**
 * Apply V5 schema: create new tables (Kas, TransaksiKas, HonorGuru)
 * + add kasId column to Payment (if possible).
 *
 * Run: SUPABASE_ACCESS_TOKEN=sbp_xxx bun run scripts/apply-v5-schema.ts
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
-- V5 — Keuangan Terintegrasi Lanjutan

-- 1. Kas (kas & rekening madrasah)
CREATE TABLE IF NOT EXISTS "Kas" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accountNumber" TEXT,
  "bankName" TEXT,
  "type" TEXT NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Kas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Kas_code_key" UNIQUE ("code")
);
CREATE INDEX IF NOT EXISTS "Kas_isActive_idx" ON "Kas"("isActive");

-- 2. TransaksiKas (pemasukan & pengeluaran)
CREATE TABLE IF NOT EXISTS "TransaksiKas" (
  "id" TEXT NOT NULL,
  "kasId" TEXT NOT NULL,
  "tahunAjaranId" TEXT,
  "type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "paymentId" TEXT,
  "honorGuruId" TEXT,
  "transaksiDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TransaksiKas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TransaksiKas_kasId_transaksiDate_idx" ON "TransaksiKas"("kasId", "transaksiDate");
CREATE INDEX IF NOT EXISTS "TransaksiKas_type_category_idx" ON "TransaksiKas"("type", "category");
CREATE INDEX IF NOT EXISTS "TransaksiKas_transaksiDate_idx" ON "TransaksiKas"("transaksiDate");

-- 3. HonorGuru (honor mengajar, insentif, tunjangan, potongan, slip)
CREATE TABLE IF NOT EXISTS "HonorGuru" (
  "id" TEXT NOT NULL,
  "tahunAjaranId" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "guruId" TEXT NOT NULL,
  "periode" TEXT NOT NULL,
  "periodeLabel" TEXT NOT NULL,
  "honorMengajar" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "insentif" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tunjangan" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "potongan" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalHonor" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "paidAt" TIMESTAMP(3),
  "kasId" TEXT,
  "catatan" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HonorGuru_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HonorGuru_guruId_periode_key" UNIQUE ("guruId", "periode")
);
CREATE INDEX IF NOT EXISTS "HonorGuru_tahunAjaranId_semesterId_idx" ON "HonorGuru"("tahunAjaranId", "semesterId");
CREATE INDEX IF NOT EXISTS "HonorGuru_status_idx" ON "HonorGuru"("status");

-- Add kasId to Payment (may fail due to ownership — that's OK, Prisma handles it at app layer)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "kasId" TEXT;
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
    console.log("  ✅ V5 schema applied via Management API")
  } else {
    const text = await res.text()
    console.log(`  ❌ ${res.status}: ${text.slice(0, 300)}`)
  }
}

main().catch(console.error)
