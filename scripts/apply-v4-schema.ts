/**
 * Apply V4 schema: create new tables (PerkembanganQuran, HafalanKitab,
 * AkhlakPenilaian, Pembinaan, CatatanWaliKelas) via Supabase Management API.
 *
 * Run: SUPABASE_ACCESS_TOKEN=sbp_xxx bun run scripts/apply-v4-schema.ts
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
-- V4 — Perkembangan Santri & Pembinaan (5 new tables)

-- 1. PerkembanganQuran (tahsin, tilawah, hafalan Al-Qur'an)
CREATE TABLE IF NOT EXISTS "PerkembanganQuran" (
  "id" TEXT NOT NULL,
  "tahunAjaranId" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "santriId" TEXT NOT NULL,
  "guruId" TEXT,
  "type" TEXT NOT NULL,
  "surah" TEXT,
  "juz" INTEGER,
  "ayatFrom" INTEGER,
  "ayatTo" INTEGER,
  "score" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'PROGRESS',
  "target" TEXT,
  "catatan" TEXT,
  "pertemuanDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PerkembanganQuran_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PerkembanganQuran_santriId_type_idx" ON "PerkembanganQuran"("santriId", "type");
CREATE INDEX IF NOT EXISTS "PerkembanganQuran_tahunAjaranId_semesterId_idx" ON "PerkembanganQuran"("tahunAjaranId", "semesterId");
CREATE INDEX IF NOT EXISTS "PerkembanganQuran_status_idx" ON "PerkembanganQuran"("status");

-- 2. HafalanKitab (hafalan, kelancaran, pemahaman)
CREATE TABLE IF NOT EXISTS "HafalanKitab" (
  "id" TEXT NOT NULL,
  "tahunAjaranId" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "santriId" TEXT NOT NULL,
  "guruId" TEXT,
  "type" TEXT NOT NULL,
  "kitabName" TEXT NOT NULL,
  "halaman" TEXT,
  "score" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'PROGRESS',
  "target" TEXT,
  "catatan" TEXT,
  "pertemuanDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HafalanKitab_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HafalanKitab_santriId_type_idx" ON "HafalanKitab"("santriId", "type");
CREATE INDEX IF NOT EXISTS "HafalanKitab_tahunAjaranId_semesterId_idx" ON "HafalanKitab"("tahunAjaranId", "semesterId");

-- 3. AkhlakPenilaian (6 aspek akhlak per roadmap.pdf V4)
CREATE TABLE IF NOT EXISTS "AkhlakPenilaian" (
  "id" TEXT NOT NULL,
  "tahunAjaranId" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "santriId" TEXT NOT NULL,
  "guruId" TEXT,
  "adabGuru" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "adabOrangTua" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "adabTeman" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "kedisiplinan" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "kebersihan" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tanggungJawab" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rataRata" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "predikat" TEXT,
  "catatan" TEXT,
  "periode" TEXT,
  "periodeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AkhlakPenilaian_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AkhlakPenilaian_santriId_periodeDate_idx" ON "AkhlakPenilaian"("santriId", "periodeDate");
CREATE INDEX IF NOT EXISTS "AkhlakPenilaian_tahunAjaranId_semesterId_idx" ON "AkhlakPenilaian"("tahunAjaranId", "semesterId");

-- 4. Pembinaan (catatan guru, pelanggaran, tindakan, riwayat)
CREATE TABLE IF NOT EXISTS "Pembinaan" (
  "id" TEXT NOT NULL,
  "tahunAjaranId" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "santriId" TEXT NOT NULL,
  "guruId" TEXT,
  "type" TEXT NOT NULL,
  "category" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'RINGAN',
  "tindakan" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Pembinaan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Pembinaan_santriId_type_idx" ON "Pembinaan"("santriId", "type");
CREATE INDEX IF NOT EXISTS "Pembinaan_tahunAjaranId_semesterId_idx" ON "Pembinaan"("tahunAjaranId", "semesterId");
CREATE INDEX IF NOT EXISTS "Pembinaan_status_idx" ON "Pembinaan"("status");
CREATE INDEX IF NOT EXISTS "Pembinaan_severity_idx" ON "Pembinaan"("severity");

-- 5. CatatanWaliKelas (periodik, terpisah dari RaporCatatan)
CREATE TABLE IF NOT EXISTS "CatatanWaliKelas" (
  "id" TEXT NOT NULL,
  "tahunAjaranId" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "santriId" TEXT NOT NULL,
  "waliKelasId" TEXT,
  "periode" TEXT NOT NULL,
  "periodeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "catatan" TEXT NOT NULL,
  "rekomendasi" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CatatanWaliKelas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CatatanWaliKelas_santriId_periodeDate_idx" ON "CatatanWaliKelas"("santriId", "periodeDate");
CREATE INDEX IF NOT EXISTS "CatatanWaliKelas_tahunAjaranId_semesterId_idx" ON "CatatanWaliKelas"("tahunAjaranId", "semesterId");
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
    console.log("  ✅ V4 schema applied via Management API")
  } else {
    const text = await res.text()
    console.log(`  ❌ ${res.status}: ${text.slice(0, 300)}`)
  }
}

main().catch(console.error)
