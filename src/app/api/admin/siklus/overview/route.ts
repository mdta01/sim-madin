import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"

/**
 * GET /api/admin/siklus/overview
 *
 * V12 — Sistem Terintegrasi Penuh: Overview workflow status.
 *
 * Returns 3 siklus (santri, keuangan, guru) dengan status per step:
 *
 * Siklus Santri: PPDB → Data → Kelas → Jadwal → Pembelajaran → Absensi → Nilai → Perkembangan → Ujian → Rapor → Kenaikan → Kelulusan → Alumni
 * Siklus Keuangan: Santri → Jenis Tagihan → Tagihan → Pembayaran → Verifikasi → Kas → Pemasukan/Pengeluaran → Laporan → Monitoring
 * Siklus Guru: Data → Penugasan → Jadwal → Mengajar → Absensi Santri → Nilai → Catatan → Honor
 */
export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("dashboard:read", req)
  if (guard.error) return guard.error
  try {
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })

    // ========================================================================
    // SIKLUS SANTRI
    // ========================================================================
    const [totalSantri, santriKelas, totalJadwal, totalMateri, totalAbsensi, totalNilai, totalPerkembangan, totalUjian, totalRapor, totalAlumni] = await Promise.all([
      db.santri.count({ where: { deletedAt: null, status: "AKTIF" } }),
      db.santri.count({ where: { deletedAt: null, status: "AKTIF", kelasId: { not: null } } }),
      ta && sem ? db.jadwal.count({ where: { tahunAjaranId: ta.id, semesterId: sem.id } }) : Promise.resolve(0),
      db.materi.count({ where: { deletedAt: null, isPublished: true } }),
      ta ? db.absensi.count({ where: { tahunAjaranId: ta.id } }) : Promise.resolve(0),
      ta && sem ? db.nilai.count({ where: { tahunAjaranId: ta.id, semesterId: sem.id } }) : Promise.resolve(0),
      // V4 perkembangan: sum of 4 tables
      Promise.all([
        db.perkembanganQuran.count(),
        db.hafalanKitab.count(),
        db.akhlakPenilaian.count(),
        db.pembinaan.count(),
      ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
      db.ujian.count({ where: { deletedAt: null } }),
      ta && sem ? db.rapor.count({ where: { tahunAjaranId: ta.id, semesterId: sem.id } }) : Promise.resolve(0),
      db.alumni.count(),
    ])

    const siklusSantri = [
      { step: "Data Santri", count: totalSantri, status: totalSantri > 0 ? "OK" : "KOSONG" },
      { step: "Kelas", count: santriKelas, status: santriKelas > 0 ? "OK" : "KOSONG" },
      { step: "Jadwal", count: totalJadwal, status: totalJadwal > 0 ? "OK" : "KOSONG" },
      { step: "Pembelajaran (Materi)", count: totalMateri, status: totalMateri > 0 ? "OK" : "KOSONG" },
      { step: "Absensi", count: totalAbsensi, status: totalAbsensi > 0 ? "OK" : "KOSONG" },
      { step: "Nilai", count: totalNilai, status: totalNilai > 0 ? "OK" : "KOSONG" },
      { step: "Perkembangan", count: totalPerkembangan, status: totalPerkembangan > 0 ? "OK" : "KOSONG" },
      { step: "Ujian", count: totalUjian, status: totalUjian > 0 ? "OK" : "KOSONG" },
      { step: "Rapor", count: totalRapor, status: totalRapor > 0 ? "OK" : "KOSONG" },
      { step: "Kenaikan Kelas", count: 0, status: "MANUAL" },
      { step: "Kelulusan & Alumni", count: totalAlumni, status: totalAlumni > 0 ? "OK" : "KOSONG" },
    ]

    // ========================================================================
    // SIKLUS KEUANGAN
    // ========================================================================
    const [totalTagihan, totalPembayaran, totalVerifiedPayments, totalPendingPayments, totalKas, totalTransaksiKas, totalHonorGuru] = await Promise.all([
      ta ? db.tagihan.count({ where: { tahunAjaranId: ta.id } }) : Promise.resolve(0),
      db.payment.count(),
      db.payment.count({ where: { status: "VERIFIED" } }),
      db.payment.count({ where: { status: "PENDING" } }),
      db.kas.count({ where: { isActive: true } }),
      db.transaksiKas.count(),
      db.honorGuru.count(),
    ])

    const siklusKeuangan = [
      { step: "Jenis Tagihan", count: await db.jenisTagihan.count(), status: "OK" },
      { step: "Tagihan", count: totalTagihan, status: totalTagihan > 0 ? "OK" : "KOSONG" },
      { step: "Pembayaran", count: totalPembayaran, status: totalPembayaran > 0 ? "OK" : "KOSONG" },
      { step: "Verifikasi", count: totalVerifiedPayments, pending: totalPendingPayments, status: totalPendingPayments > 0 ? "PENDING" : (totalVerifiedPayments > 0 ? "OK" : "KOSONG") },
      { step: "Kas", count: totalKas, status: totalKas > 0 ? "OK" : "KOSONG" },
      { step: "Transaksi Kas", count: totalTransaksiKas, status: totalTransaksiKas > 0 ? "OK" : "KOSONG" },
      { step: "Honor Guru", count: totalHonorGuru, status: totalHonorGuru > 0 ? "OK" : "KOSONG" },
      { step: "Laporan", count: 0, status: "AVAILABLE" },
      { step: "Monitoring", count: 0, status: "AVAILABLE" },
    ]

    // ========================================================================
    // SIKLUS GURU
    // ========================================================================
    const [totalGuru, guruAktif, totalJadwalGuru, totalAbsensiByGuru, totalNilaiByGuru, totalHonorPaid] = await Promise.all([
      db.guru.count({ where: { deletedAt: null } }),
      db.guru.count({ where: { deletedAt: null, status: "AKTIF" } }),
      ta && sem ? db.jadwal.count({ where: { tahunAjaranId: ta.id, semesterId: sem.id } }) : Promise.resolve(0),
      db.absensi.count({ where: { recordedByGuruId: { not: null } } }),
      db.nilai.count({ where: { guruId: { not: null } } }),
      db.honorGuru.count({ where: { status: "DIBAYARKAN" } }),
    ])

    const siklusGuru = [
      { step: "Data Guru", count: totalGuru, status: totalGuru > 0 ? "OK" : "KOSONG" },
      { step: "Penugasan (Jadwal)", count: totalJadwalGuru, status: totalJadwalGuru > 0 ? "OK" : "KOSONG" },
      { step: "Absensi Santri (input guru)", count: totalAbsensiByGuru, status: totalAbsensiByGuru > 0 ? "OK" : "KOSONG" },
      { step: "Nilai (input guru)", count: totalNilaiByGuru, status: totalNilaiByGuru > 0 ? "OK" : "KOSONG" },
      { step: "Honor (dibayar)", count: totalHonorPaid, status: totalHonorPaid > 0 ? "OK" : "KOSONG" },
    ]

    // ========================================================================
    // INTEGRATION STATUS
    // ========================================================================
    const integrations = {
      paymentToKas: {
        description: "Pembayaran → Verifikasi → Kas (auto TransaksiKas)",
        endpoint: "/api/admin/siklus/payment-verify/[id]",
        status: "ACTIVE",
      },
      honorToKas: {
        description: "Honor Guru → Dibayar → Kas (auto TransaksiKas PENGELUARAN)",
        endpoint: "/api/admin/honor-guru/[id] (PUT status=DIBAYARKAN)",
        status: "ACTIVE",
      },
      kenaikanKelas: {
        description: "Kenaikan Kelas → Update kelas / Alumni (LULUS)",
        endpoint: "/api/admin/siklus/kenaikan-kelas",
        status: "ACTIVE",
      },
      autoTagihan: {
        description: "Auto-generate Tagihan untuk semua santri",
        endpoint: "/api/admin/siklus/auto-tagihan",
        status: "ACTIVE",
      },
      notifikasiTriggers: {
        description: "Auto-notifikasi: Absensi ALFA, Nilai updated, Rapor published, Tugas baru, Pengumuman",
        endpoint: "/lib/notifikasi/helper.ts (7 trigger functions)",
        status: "ACTIVE",
      },
    }

    return NextResponse.json({
      data: {
        siklusSantri,
        siklusKeuangan,
        siklusGuru,
        integrations,
        activePeriod: ta ? { tahunAjaran: ta.name, semester: sem?.name } : null,
      },
    })
  } catch (error) {
    console.error("[siklus overview] error:", error)
    return NextResponse.json({ error: "Gagal memuat siklus overview" }, { status: 500 })
  }
}
