import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatDate } from "@/lib/constants"

interface Params { params: Promise<{ ujianId: string }> }

/**
 * GET /api/admin/dokumen/berita-acara/[ujianId]
 * Returns HTML printable berita acara ujian (Ctrl+P → save as PDF).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("surat:read", req)
  if (guard.error) return guard.error
  try {
    const { ujianId } = await params
    const ujian = await db.ujian.findUnique({
      where: { id: ujianId },
      include: {
        mapel: true,
        kelas: true,
        guru: { select: { name: true } },
        peserta: { include: { santri: { select: { name: true, nis: true } } }, orderBy: { santri: { name: "asc" } } },
      },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_ADDRESS", "MADRASAH_HEAD"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahAddress = settingsMap.get("MADRASAH_ADDRESS") || ""
    const madrasahHead = settingsMap.get("MADRASAH_HEAD") || ""

    const hadir = ujian.peserta.filter((p) => p.isHadir).length
    const tidakHadir = ujian.peserta.filter((p) => !p.isHadir).length

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Berita Acara - ${ujian.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #000; padding: 30px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 25px; }
  .header h1 { font-size: 18px; }
  .header p { font-size: 12px; margin-top: 4px; }
  .title { text-align: center; margin: 20px 0; }
  .title h2 { font-size: 16px; text-decoration: underline; font-weight: bold; }
  .content { font-size: 12px; line-height: 1.8; text-align: justify; }
  .content p { margin-bottom: 10px; }
  .info-table { width: 100%; font-size: 12px; margin: 15px 0; }
  .info-table td { padding: 3px 8px; }
  .info-table td:first-child { font-weight: bold; width: 30%; }
  .peserta-table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 15px 0; }
  .peserta-table th, .peserta-table td { border: 1px solid #000; padding: 4px 8px; text-align: left; }
  .peserta-table th { background: #f0f0f0; }
  .peserta-table td.center { text-align: center; }
  .signature { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; }
  .sig-block { text-align: center; }
  .sig-name { margin-top: 60px; font-weight: bold; text-decoration: underline; }
  @media print { .no-print { display: none; } @page { margin: 2cm; size: A4; } }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>

<div class="header">
  <h1>${madrasahName.toUpperCase()}</h1>
  <p>${madrasahAddress}</p>
</div>

<div class="title"><h2>BERITA ACARA PELAKSANAAN UJIAN</h2></div>

<div class="content">
  <p>Pada hari ini, ${formatDate(ujian.startTime)}, telah dilaksanakan ujian sebagai berikut:</p>
</div>

<table class="info-table">
  <tr><td>Judul Ujian</td><td>: ${ujian.title}</td></tr>
  <tr><td>Tipe Ujian</td><td>: ${ujian.type}</td></tr>
  <tr><td>Mata Pelajaran</td><td>: ${ujian.mapel.name}</td></tr>
  <tr><td>Kelas</td><td>: ${ujian.kelas.name}</td></tr>
  <tr><td>Guru Pengampu</td><td>: ${ujian.guru?.name || "-"}</td></tr>
  <tr><td>Tanggal</td><td>: ${formatDate(ujian.startTime, true)}</td></tr>
  <tr><td>Durasi</td><td>: ${ujian.durationMnt} menit</td></tr>
  <tr><td>Ruang</td><td>: ${ujian.ruang || "-"}</td></tr>
  <tr><td>Pengawas</td><td>: ${ujian.pengawas || "-"}</td></tr>
</table>

<div class="content">
  <p><strong>Rekap Kehadiran:</strong> Hadir: ${hadir} santri, Tidak Hadir: ${tidakHadir} santri, Total: ${ujian.peserta.length} santri</p>
</div>

<table class="peserta-table">
  <thead>
    <tr><th>No</th><th>Nama</th><th>NIS</th><th>Kehadiran</th><th>Tanda Tangan</th></tr>
  </thead>
  <tbody>
    ${ujian.peserta.map((p, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${p.santri.name}</td>
        <td>${p.santri.nis}</td>
        <td class="center">${p.isHadir ? "Hadir" : "Tidak Hadir"}</td>
        <td>______________</td>
      </tr>
    `).join("")}
  </tbody>
</table>

${ujian.description ? `<div class="content"><p><strong>Catatan:</strong> ${ujian.description}</p></div>` : ""}

<div class="signature">
  <div class="sig-block">
    <p>Pengawas 1</p>
    <div class="sig-name">(______________)</div>
  </div>
  <div class="sig-block">
    <p>Pengawas 2</p>
    <div class="sig-name">(______________)</div>
  </div>
  <div class="sig-block">
    <p>Kepala Madrasah</p>
    <div class="sig-name">(${madrasahHead})</div>
  </div>
</div>

</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } })
  } catch (error) {
    console.error("[berita acara pdf] error:", error)
    return NextResponse.json({ error: "Gagal generate berita acara" }, { status: 500 })
  }
}
