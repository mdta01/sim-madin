import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * POST /api/admin/siklus/auto-tagihan
 *
 * Auto-generate tagihan for all active santri (Siklus Keuangan: Santri → Jenis Tagihan → Tagihan → ...)
 *
 * Body: {
 *   jenisTagihanId: string,    // jenis tagihan (e.g., syahriyah)
 *   bulan?: number,            // bulan (1-12), default: current month
 *   tahun?: number,            // tahun, default: current year
 *   kelasId?: string,          // optional: hanya kelas tertentu
 *   amount?: number,           // override default amount
 *   dueDate?: string,          // ISO date
 *   description?: string,      // custom description
 *   dryRun?: boolean,          // preview tanpa execute
 * }
 *
 * Logic:
 * - Get all active santri (optionally filtered by kelas)
 * - Check if tagihan already exists for this santri + jenis + bulan + tahun (skip if exists)
 * - Create tagihan for each santri
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("tagihan:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.jenisTagihanId) {
      return NextResponse.json({ error: "jenisTagihanId wajib diisi" }, { status: 400 })
    }

    const jenisTagihan = await db.jenisTagihan.findUnique({
      where: { id: body.jenisTagihanId, isActive: true },
    })
    if (!jenisTagihan) return NextResponse.json({ error: "Jenis tagihan tidak ditemukan" }, { status: 404 })

    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    if (!ta) return NextResponse.json({ error: "Tahun ajaran aktif tidak ditemukan" }, { status: 400 })

    const now = new Date()
    const bulan = body.bulan || (now.getMonth() + 1)
    const tahun = body.tahun || now.getFullYear()
    const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

    // Get all active santri
    const where: any = { status: "AKTIF", deletedAt: null }
    if (body.kelasId) where.kelasId = body.kelasId
    const santriList = await db.santri.findMany({
      where,
      select: { id: true, name: true, nis: true, kelasId: true, kelas: { select: { name: true } } },
      orderBy: { name: "asc" },
    })

    const amount = body.amount || jenisTagihan.defaultAmount
    const description = body.description || `${jenisTagihan.name} ${monthNames[bulan - 1]} ${tahun}`
    const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(tahun, bulan, 25) // default: tanggal 25

    const dryRun = body.dryRun === true
    const created: any[] = []
    const skipped: any[] = []

    for (const santri of santriList) {
      // Check if tagihan already exists for this santri + jenis + description
      const existing = await db.tagihan.findFirst({
        where: {
          santriId: santri.id,
          jenisTagihanId: body.jenisTagihanId,
          tahunAjaranId: ta.id,
          description,
        },
      })

      if (existing) {
        skipped.push({ santriId: santri.id, name: santri.name, reason: "Tagihan sudah ada" })
        continue
      }

      if (dryRun) {
        created.push({ santriId: santri.id, name: santri.name, amount, description })
        continue
      }

      const tagihan = await db.tagihan.create({
        data: {
          tahunAjaranId: ta.id,
          santriId: santri.id,
          kelasId: santri.kelasId,
          jenisTagihanId: body.jenisTagihanId,
          amount,
          description,
          dueDate,
          status: "BELUM_BAYAR",
        },
      })
      created.push({ tagihanId: tagihan.id, santriId: santri.id, name: santri.name, amount })
    }

    await logAudit(session, "BULK_CREATE", "TAGIHAN", undefined, {
      jenisTagihan: jenisTagihan.name,
      bulan: monthNames[bulan - 1],
      tahun,
      created: created.length,
      skipped: skipped.length,
      dryRun,
    }, req)

    return NextResponse.json({
      success: !dryRun,
      preview: dryRun,
      jenisTagihan: jenisTagihan.name,
      periode: `${monthNames[bulan - 1]} ${tahun}`,
      amount,
      totalSantri: santriList.length,
      created: created.length,
      skipped: skipped.length,
      createdData: created.slice(0, 10), // first 10 for preview
      skippedData: skipped.slice(0, 5),
    })
  } catch (error) {
    console.error("[auto tagihan] error:", error)
    return NextResponse.json({ error: "Gagal generate tagihan" }, { status: 500 })
  }
}
