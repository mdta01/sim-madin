/**
 * Apply V3 schema: create new tables (Ujian, BankSoal, UjianSoal, UjianPeserta,
 * UjianNilai, RaporMapel, RaporCatatan) via Supabase Management API.
 *
 * Skip FK constraints that reference existing tables owned by postgres (Nilai, etc.)
 * — referential integrity will be enforced at app layer (Prisma).
 *
 * Run: SUPABASE_ACCESS_TOKEN=sbp_xxx bun run scripts/apply-v3-schema.ts
 */
import "dotenv/config"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ""

if (!SUPABASE_URL || !ACCESS_TOKEN) {
  console.error("❌ Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ACCESS_TOKEN required")
  process.exit(1)
}

const PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0]
console.log(`Project: ${PROJECT_REF}\n`)

const SQL = `
-- ============================================================================
-- V3 — Ujian & Rapor Terintegrasi (new tables only)
-- ============================================================================

-- 1. Ujian (jadwal ujian)
CREATE TABLE IF NOT EXISTS "Ujian" (
  "id" TEXT NOT NULL,
  "tahunAjaranId" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "mapelId" TEXT NOT NULL,
  "kelasId" TEXT NOT NULL,
  "guruId" TEXT,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "durationMnt" INTEGER NOT NULL DEFAULT 90,
  "ruang" TEXT,
  "pengawas" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "passingScore" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Ujian_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Ujian_tahunAjaranId_semesterId_idx" ON "Ujian"("tahunAjaranId", "semesterId");
CREATE INDEX IF NOT EXISTS "Ujian_kelasId_mapelId_idx" ON "Ujian"("kelasId", "mapelId");
CREATE INDEX IF NOT EXISTS "Ujian_type_startTime_idx" ON "Ujian"("type", "startTime");
CREATE INDEX IF NOT EXISTS "Ujian_deletedAt_idx" ON "Ujian"("deletedAt");

-- 2. BankSoal
CREATE TABLE IF NOT EXISTS "BankSoal" (
  "id" TEXT NOT NULL,
  "mapelId" TEXT NOT NULL,
  "tahunAjaranId" TEXT NOT NULL,
  "guruId" TEXT,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "options" TEXT,
  "correctAnswer" TEXT,
  "answerKey" TEXT,
  "bobot" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "difficulty" TEXT NOT NULL DEFAULT 'SEDANG',
  "kompetensiId" TEXT,
  "tags" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankSoal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BankSoal_code_key" UNIQUE ("code")
);
CREATE INDEX IF NOT EXISTS "BankSoal_mapelId_type_idx" ON "BankSoal"("mapelId", "type");
CREATE INDEX IF NOT EXISTS "BankSoal_difficulty_idx" ON "BankSoal"("difficulty");
CREATE INDEX IF NOT EXISTS "BankSoal_kompetensiId_idx" ON "BankSoal"("kompetensiId");

-- 3. UjianSoal (pivot ujian ↔ bank soal)
CREATE TABLE IF NOT EXISTS "UjianSoal" (
  "id" TEXT NOT NULL,
  "ujianId" TEXT NOT NULL,
  "bankSoalId" TEXT NOT NULL,
  "urutan" INTEGER NOT NULL,
  "bobot" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UjianSoal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UjianSoal_ujianId_bankSoalId_key" UNIQUE ("ujianId", "bankSoalId")
);
CREATE INDEX IF NOT EXISTS "UjianSoal_ujianId_urutan_idx" ON "UjianSoal"("ujianId", "urutan");

-- 4. UjianPeserta
CREATE TABLE IF NOT EXISTS "UjianPeserta" (
  "id" TEXT NOT NULL,
  "ujianId" TEXT NOT NULL,
  "santriId" TEXT NOT NULL,
  "ruang" TEXT,
  "pengawas" TEXT,
  "isHadir" BOOLEAN NOT NULL DEFAULT true,
  "catatan" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UjianPeserta_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UjianPeserta_ujianId_santriId_key" UNIQUE ("ujianId", "santriId")
);
CREATE INDEX IF NOT EXISTS "UjianPeserta_santriId_idx" ON "UjianPeserta"("santriId");

-- 5. UjianNilai
CREATE TABLE IF NOT EXISTS "UjianNilai" (
  "id" TEXT NOT NULL,
  "ujianId" TEXT NOT NULL,
  "santriId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "scoreUts" DOUBLE PRECISION,
  "scoreUas" DOUBLE PRECISION,
  "scorePraktik" DOUBLE PRECISION,
  "notes" TEXT,
  "gradedById" TEXT,
  "gradedAt" TIMESTAMP(3),
  "isAutoCorrect" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UjianNilai_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UjianNilai_ujianId_santriId_key" UNIQUE ("ujianId", "santriId")
);
CREATE INDEX IF NOT EXISTS "UjianNilai_santriId_idx" ON "UjianNilai"("santriId");

-- 6. RaporMapel (detail nilai per mapel di rapor)
CREATE TABLE IF NOT EXISTS "RaporMapel" (
  "id" TEXT NOT NULL,
  "raporId" TEXT NOT NULL,
  "mapelId" TEXT NOT NULL,
  "nilaiAkhir" DOUBLE PRECISION NOT NULL,
  "predikat" TEXT,
  "deskripsi" TEXT,
  "kkm" DOUBLE PRECISION NOT NULL DEFAULT 70,
  "isTuntas" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RaporMapel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RaporMapel_raporId_mapelId_key" UNIQUE ("raporId", "mapelId")
);
CREATE INDEX IF NOT EXISTS "RaporMapel_mapelId_idx" ON "RaporMapel"("mapelId");

-- 7. RaporCatatan (catatan wali kelas + prestasi + akhlak)
CREATE TABLE IF NOT EXISTS "RaporCatatan" (
  "id" TEXT NOT NULL,
  "raporId" TEXT NOT NULL,
  "catatanWaliKelas" TEXT,
  "prestasi" TEXT,
  "akhlak" TEXT,
  "kehadiran" TEXT,
  "saran" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RaporCatatan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RaporCatatan_raporId_key" UNIQUE ("raporId")
);
`

async function main() {
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
    console.log("  ✅ V3 schema applied via Management API")
    const text = await mgmtRes.text()
    console.log("  Response:", text.slice(0, 200) || "(empty)")
  } else {
    console.log(`  ❌ Management API: ${mgmtRes.status} ${mgmtRes.statusText}`)
    const errText = await mgmtRes.text()
    console.log("  Body:", errText.slice(0, 500))
  }
}

main().catch((e) => {
  console.error("❌ Failed:", e)
  process.exit(1)
})
