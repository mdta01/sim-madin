import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken, verifyWaliSantriAccess } from "@/lib/wali/auth"
import { formatRupiah, formatDate } from "@/lib/constants"

/**
 * GET /api/wali/santri/[id]
 * Detail santri untuk wali yang sedang login.
 * Wajib verify: wali harus punya akses ke santri ini.
 *
 * Header: Authorization: Bearer <token>
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })
    }

    const { id: santriId } = await params

    // VERIFY ACCESS — wajib cek relasi wali-santri
    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) {
      return NextResponse.json({
        error: "Forbidden",
        message: access.reason || "Anda tidak memiliki akses ke santri ini",
      }, { status: 403 })
    }

    // Get santri detail
    const santri = await db.santri.findUnique({
      where: { id: santriId },
      include: {
        kelas: true,
        waliLinks: {
          include: { wali: { select: { id: true, name: true, phone: true, relationship: true } } },
        },
      },
    })

    if (!santri) {
      return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 })
    }

    // Get active TA & Semester
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })

    // Get santri's data (limited to what wali can see)
    const [absensi, nilai, tagihan, payments, rapor, jadwal, announcements] = await Promise.all([
      db.absensi.findMany({
        where: { santriId, tahunAjaranId: ta?.id },
        orderBy: { date: "desc" },
        take: 30,
      }),
      db.nilai.findMany({
        where: { santriId, semesterId: sem?.id, tahunAjaranId: ta?.id },
        include: { mapel: true, guru: { select: { name: true } } },
        orderBy: { assessmentDate: "desc" },
      }),
      db.tagihan.findMany({
        where: { santriId, tahunAjaranId: ta?.id },
        include: { jenisTagihan: true },
        orderBy: { createdAt: "desc" },
      }),
      db.payment.findMany({
        where: { santriId },
        include: { tagihan: { include: { jenisTagihan: true } } },
        orderBy: { paymentDate: "desc" },
        take: 20,
      }),
      db.rapor.findFirst({
        where: { santriId, semesterId: sem?.id, tahunAjaranId: ta?.id },
        include: { semester: true, tahunAjaran: true, kelas: true },
      }),
      santri.kelasId
        ? db.jadwal.findMany({
            where: { kelasId: santri.kelasId, tahunAjaranId: ta?.id, semesterId: sem?.id },
            include: { mapel: true, guru: { select: { name: true } } },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          })
        : Promise.resolve([]),
      db.announcement.findMany({
        where: {
          isPublished: true,
          OR: [
            { audience: "ALL" },
            { audience: "WALI" },
            ...(santri.kelasId ? [{ audience: "KELAS", kelasId: santri.kelasId }] : []),
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 10,
      }),
    ])

    // Summary
    const tagihanSummary = {
      total: tagihan.length,
      lunas: tagihan.filter(t => t.status === "LUNAS").length,
      cicil: tagihan.filter(t => t.status === "CICIL").length,
      belumBayar: tagihan.filter(t => t.status === "BELUM_BAYAR").length,
      totalOutstanding: tagihan.reduce((sum, t) => sum + (t.amount - t.paidAmount), 0),
    }

    const absensiSummary = {
      hadir: absensi.filter(a => a.status === "HADIR").length,
      sakit: absensi.filter(a => a.status === "SAKIT").length,
      izin: absensi.filter(a => a.status === "IZIN").length,
      alfa: absensi.filter(a => a.status === "ALFA").length,
    }

    return NextResponse.json({
      data: {
        santri: {
          id: santri.id, nis: santri.nis, name: santri.name,
          gender: santri.gender, photoUrl: santri.photoUrl,
          birthPlace: santri.birthPlace, birthDate: santri.birthDate,
          address: santri.address, kelas: santri.kelas,
          wali: santri.waliLinks.map(wl => ({
            name: wl.wali.name, relationship: wl.relationship, isPrimary: wl.isPrimary,
          })),
        },
        activePeriod: ta ? { tahunAjaran: ta.name, semester: sem?.name } : null,
        absensi,
        absensiSummary,
        nilai,
        tagihan,
        tagihanSummary,
        payments,
        rapor,
        jadwal,
        announcements,
      },
    })
  } catch (error) {
    console.error("[wali santri detail] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail santri" }, { status: 500 })
  }
}
