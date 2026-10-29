import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatDate } from "@/lib/constants"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/rapor/[id]/pdf
 * Returns HTML representation of rapor (printable via browser).
 * User can use Ctrl+P to save as PDF.
 *
 * For native PDF generation, would need puppeteer or similar (deferred).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("rapor:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const rapor = await db.rapor.findUnique({
      where: { id },
      include: {
        santri: {
          select: {
            id: true, name: true, nis: true, nisn: true, gender: true,
            birthPlace: true, birthDate: true, photoUrl: true,
            kelas: { select: { name: true, code: true } },
          },
        },
        kelas: { select: { name: true, code: true } },
        semester: { select: { name: true, type: true } },
        tahunAjaran: { select: { name: true, code: true } },
        raporMapel: {
          include: {
            mapel: { select: { id: true, name: true, code: true, kkm: true, category: true } },
          },
          orderBy: [{ mapel: { category: "asc" } }, { mapel: { name: "asc" } }],
        },
        raporCatatan: true,
      },
    })
    if (!rapor) return NextResponse.json({ error: "Rapor tidak ditemukan" }, { status: 404 })

    // Get madrasah settings
    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_ADDRESS", "MADRASAH_HEAD", "MADRASAH_PHONE"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahAddress = settingsMap.get("MADRASAH_ADDRESS") || ""
    const madrasahHead = settingsMap.get("MADRASAH_HEAD") || ""
    const madrasahPhone = settingsMap.get("MADRASAH_PHONE") || ""

    // Compute stats
    const avgNilai = rapor.raporMapel.length > 0
      ? Math.round((rapor.raporMapel.reduce((s, m) => s + m.nilaiAkhir, 0) / rapor.raporMapel.length) * 10) / 10
      : 0
    const tuntas = rapor.raporMapel.filter((m) => m.isTuntas).length
    const tidakTuntas = rapor.raporMapel.length - tuntas

    // Build HTML for rapor
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapor ${rapor.santri.name} - ${rapor.tahunAjaran.name} ${rapor.semester.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #000; padding: 20px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { font-size: 18px; font-weight: bold; }
  .header h2 { font-size: 14px; font-weight: normal; margin-top: 4px; }
  .header p { font-size: 11px; margin-top: 4px; }
  .title { text-align: center; margin: 20px 0; }
  .title h3 { font-size: 16px; font-weight: bold; text-decoration: underline; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  .info-table td { padding: 4px 8px; border: 1px solid #000; }
  .info-table td:first-child { width: 30%; background: #f0f0f0; font-weight: bold; }
  .nilai-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
  .nilai-table th, .nilai-table td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
  .nilai-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
  .nilai-table td.center { text-align: center; }
  .nilai-table td.bold { font-weight: bold; }
  .catatan-section { margin-top: 20px; }
  .catatan-section h4 { font-size: 13px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 4px; }
  .catatan-content { font-size: 12px; min-height: 60px; padding: 8px; border: 1px solid #ccc; background: #fafafa; }
  .stats-row { display: flex; justify-content: space-around; margin: 15px 0; font-size: 12px; }
  .stats-row div { text-align: center; }
  .stats-row .label { font-size: 10px; color: #666; }
  .stats-row .value { font-size: 16px; font-weight: bold; }
  .signature { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
  .signature .sig-block { text-align: center; }
  .signature .sig-name { margin-top: 60px; font-weight: bold; text-decoration: underline; }
  .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
    @page { margin: 1.5cm; size: A4; }
  }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
  .print-btn:hover { background: #047857; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>

<div class="header">
  <h1>${madrasahName.toUpperCase()}</h1>
  <h2>${madrasahAddress}</h2>
  ${madrasahPhone ? `<p>Telp: ${madrasahPhone}</p>` : ""}
</div>

<div class="title">
  <h3>LAPORAN HASIL BELAJAR SANTRI</h3>
  <p style="font-size: 12px; margin-top: 4px;">Tahun Ajaran ${rapor.tahunAjaran.name} — Semester ${rapor.semester.name}</p>
</div>

<table class="info-table">
  <tr><td>Nama Santri</td><td>${rapor.santri.name}</td><td>NIS</td><td>${rapor.santri.nis}</td></tr>
  <tr><td>NISN</td><td>${rapor.santri.nisn || "-"}</td><td>Kelas</td><td>${rapor.santri.kelas?.name || rapor.kelas.name}</td></tr>
  <tr><td>Tempat, Tgl Lahir</td><td>${rapor.santri.birthPlace || "-"}, ${rapor.santri.birthDate ? formatDate(rapor.santri.birthDate) : "-"}</td><td>Jenis Kelamin</td><td>${rapor.santri.gender === "L" ? "Laki-laki" : "Perempuan"}</td></tr>
</table>

<div class="stats-row">
  <div>
    <div class="label">Rata-rata Nilai</div>
    <div class="value">${avgNilai}</div>
  </div>
  <div>
    <div class="label">Mapel Tuntas</div>
    <div class="value" style="color: #059669;">${tuntas}</div>
  </div>
  <div>
    <div class="label">Mapul Belum Tuntas</div>
    <div class="value" style="color: ${tidakTuntas > 0 ? "#dc2626" : "#059669"};">${tidakTuntas}</div>
  </div>
  <div>
    <div class="label">Kehadiran</div>
    <div class="value">${rapor.absensiHadir}/${rapor.absensiHadir + rapor.absensiSakit + rapor.absensiIzin + rapor.absensiAlfa}</div>
  </div>
</div>

<table class="nilai-table">
  <thead>
    <tr>
      <th style="width: 5%;">No</th>
      <th style="width: 35%;">Mata Pelajaran</th>
      <th style="width: 10%;">KKM</th>
      <th style="width: 12%;">Nilai</th>
      <th style="width: 10%;">Predikat</th>
      <th style="width: 10%;">Ket.</th>
      <th>Deskripsi Capaian</th>
    </tr>
  </thead>
  <tbody>
    ${rapor.raporMapel.length === 0
      ? `<tr><td colspan="7" style="text-align: center; padding: 20px; font-style: italic; color: #999;">Belum ada data nilai. Generate rapor terlebih dahulu.</td></tr>`
      : rapor.raporMapel.map((m, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${m.mapel.name}</td>
        <td class="center">${m.kkm}</td>
        <td class="center bold">${m.nilaiAkhir}</td>
        <td class="center">${m.predikat || "-"}</td>
        <td class="center">${m.isTuntas ? "Tuntas" : "<span style='color: #dc2626;'>Remedial</span>"}</td>
        <td style="font-size: 10px;">${m.deskripsi || "-"}</td>
      </tr>
    `).join("")}
  </tbody>
</table>

<div class="catatan-section">
  <h4>Catatan Wali Kelas</h4>
  <div class="catatan-content">${rapor.raporCatatan?.catatanWaliKelas || "-"}</div>
</div>

${rapor.raporCatatan?.prestasi ? `
<div class="catatan-section">
  <h4>Prestasi</h4>
  <div class="catatan-content">${rapor.raporCatatan.prestasi}</div>
</div>
` : ""}

${rapor.raporCatatan?.akhlak ? `
<div class="catatan-section">
  <h4>Akhlak & Sikap</h4>
  <div class="catatan-content">${rapor.raporCatatan.akhlak}</div>
</div>
` : ""}

${rapor.raporCatatan?.kehadiran ? `
<div class="catatan-section">
  <h4>Rekap Kehadiran</h4>
  <div class="catatan-content">${rapor.raporCatatan.kehadiran}</div>
</div>
` : ""}

${rapor.raporCatatan?.saran ? `
<div class="catatan-section">
  <h4>Saran Pengembangan</h4>
  <div class="catatan-content">${rapor.raporCatatan.saran}</div>
</div>
` : ""}

<div class="signature">
  <div class="sig-block">
    <p>Orang Tua / Wali</p>
    <div class="sig-name">(${rapor.santri.name})</div>
  </div>
  <div class="sig-block">
    <p>Bandung, ${formatDate(new Date())}</p>
    <p>Wali Kelas</p>
    <div class="sig-name">(____________________)</div>
  </div>
  <div class="sig-block">
    <p>Mengetahui,</p>
    <p>Kepala Madrasah</p>
    <div class="sig-name">(${madrasahHead})</div>
  </div>
</div>

<div class="footer">
  <p>Dokumen ini diterbitkan oleh sistem SIM MADIN pada ${formatDate(new Date(), true)}</p>
  <p>Rapor ${rapor.published ? "sudah dipublikasi" : "belum dipublikasi (DRAFT)"}</p>
</div>

</body>
</html>`

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[rapor pdf] error:", error)
    return NextResponse.json({ error: "Gagal generate PDF rapor" }, { status: 500 })
  }
}
