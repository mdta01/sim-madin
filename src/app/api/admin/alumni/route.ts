import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * GET /api/admin/alumni
 * Query: tahunLulus, statusKelulusan, search
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("alumni:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const tahunLulus = searchParams.get("tahunLulus")
    const statusKelulusan = searchParams.get("statusKelulusan")
    const search = searchParams.get("search") || ""

    const where: any = {}
    if (tahunLulus) where.tahunLulus = Number(tahunLulus)
    if (statusKelulusan) where.statusKelulusan = statusKelulusan
    if (search) {
      where.santri = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { nis: { contains: search, mode: "insensitive" } },
        ],
      }
    }

    const data = await db.alumni.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true, nisn: true, gender: true, birthPlace: true, birthDate: true, photoUrl: true, kelas: { select: { name: true } } } },
      },
      orderBy: [{ tahunLulus: "desc" }, { santri: { name: "asc" } }],
      take: 500,
    })

    // Stats
    const totalAlumni = await db.alumni.count()
    const totalLulus = await db.alumni.count({ where: { statusKelulusan: "LULUS" } })
    const currentYear = new Date().getFullYear()
    const lulusTahunIni = await db.alumni.count({ where: { tahunLulus: currentYear } })

    return NextResponse.json({
      data,
      total: data.length,
      stats: { totalAlumni, totalLulus, lulusTahunIni },
    })
  } catch (error) {
    console.error("[alumni list] error:", error)
    return NextResponse.json({ error: "Gagal memuat alumni" }, { status: 500 })
  }
}

/**
 * POST /api/admin/alumni
 * Create alumni record + auto-convert santri status to LULUS.
 *
 * Body: {
 *   santriId, tahunLulus, statusKelulusan?, nilaiAkhir?, predikatAkhir?,
 *   syaratNilaiLengkap?, syaratAbsensiCukup?, syaratTagihanLunas?, syaratUjianAkhir?,
 *   suratKeteranganLulus?, sertifikat?, piagam?, tanggalLulus?, catatan?,
 *   pendidikanLanjutan?, pekerjaan?, telepon?, email?, domisiliKota?, domisiliAlamat?, aktivitasAlumni?
 * }
 *
 * Side effect: update Santri.status to "LULUS" (data tetap tersimpan).
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("alumni:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.santriId || !body.tahunLulus) {
      return NextResponse.json({ error: "Santri dan Tahun Lulus wajib diisi" }, { status: 400 })
    }

    // Check if alumni record already exists for this santri
    const existing = await db.alumni.findUnique({ where: { santriId: body.santriId } })
    if (existing) {
      return NextResponse.json({ error: "Santri ini sudah menjadi alumni", data: existing }, { status: 400 })
    }

    // Get active TA for tahunAjaranLulusId
    let tahunAjaranLulusId = body.tahunAjaranLulusId
    if (!tahunAjaranLulusId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranLulusId = ta?.id ?? null
    }

    // Create alumni record
    const alumni = await db.alumni.create({
      data: {
        santriId: body.santriId,
        tahunLulus: Number(body.tahunLulus),
        tahunAjaranLulusId,
        statusKelulusan: body.statusKelulusan || "LULUS",
        nilaiAkhir: body.nilaiAkhir ? Number(body.nilaiAkhir) : null,
        predikatAkhir: body.predikatAkhir || null,
        syaratNilaiLengkap: body.syaratNilaiLengkap || false,
        syaratAbsensiCukup: body.syaratAbsensiCukup || false,
        syaratTagihanLunas: body.syaratTagihanLunas || false,
        syaratUjianAkhir: body.syaratUjianAkhir || false,
        syaratLainnya: body.syaratLainnya || null,
        suratKeteranganLulus: body.suratKeteranganLulus || false,
        sertifikat: body.sertifikat || false,
        piagam: body.piagam || false,
        beritaAcaraId: body.beritaAcaraId || null,
        pendidikanLanjutan: body.pendidikanLanjutan || null,
        pekerjaan: body.pekerjaan || null,
        telepon: body.telepon || null,
        email: body.email || null,
        domisiliKota: body.domisiliKota || null,
        domisiliAlamat: body.domisiliAlamat || null,
        aktivitasAlumni: body.aktivitasAlumni || null,
        catatan: body.catatan || null,
        tanggalLulus: body.tanggalLulus ? new Date(body.tanggalLulus) : null,
        createdById: session.user.id,
      },
      include: { santri: { select: { name: true, nis: true } } },
    })

    // Auto-convert: update Santri.status to "LULUS" (data tetap tersimpan, tidak dihapus)
    await db.santri.update({
      where: { id: body.santriId },
      data: { status: "LULUS" },
    })

    await logAudit(session, "CREATE", "ALUMNI", alumni.id, {
      santri: alumni.santri?.name, tahunLulus: body.tahunLulus, statusKelulusan: alumni.statusKelulusan,
    }, req)

    return NextResponse.json({
      data: alumni,
      message: `${alumni.santri?.name} berhasil diubah menjadi alumni (Status: LULUS). Data santri tetap tersimpan.`,
    })
  } catch (error) {
    console.error("[alumni create] error:", error)
    return NextResponse.json({ error: "Gagal membuat alumni" }, { status: 500 })
  }
}
