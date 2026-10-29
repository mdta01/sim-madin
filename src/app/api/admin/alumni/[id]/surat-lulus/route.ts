import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatDate } from "@/lib/constants"

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/alumni/[id]/surat-lulus
 * Returns HTML printable Surat Keterangan Lulus (Ctrl+P → save as PDF).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("alumni:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const alumni = await db.alumni.findUnique({
      where: { id },
      include: { santri: { select: { name: true, nis: true, nisn: true, gender: true, birthPlace: true, birthDate: true, kelas: { select: { name: true } } } } },
    })
    if (!alumni) return NextResponse.json({ error: "Alumni tidak ditemukan" }, { status: 404 })

    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_ADDRESS", "MADRASAH_HEAD"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahAddress = settingsMap.get("MADRASAH_ADDRESS") || ""
    const madrasahHead = settingsMap.get("MADRASAH_HEAD") || ""

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Surat Keterangan Lulus - ${alumni.santri.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #000; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 30px; }
  .header h1 { font-size: 18px; }
  .header p { font-size: 12px; margin-top: 4px; }
  .title { text-align: center; margin: 25px 0; }
  .title h2 { font-size: 16px; text-decoration: underline; font-weight: bold; }
  .content { font-size: 13px; line-height: 2; text-align: justify; }
  .content p { margin-bottom: 10px; }
  .info-table { width: 100%; font-size: 13px; margin: 15px 0; }
  .info-table td { padding: 3px 8px; }
  .info-table td:first-child { font-weight: bold; width: 30%; }
  .signature { margin-top: 60px; display: flex; justify-content: flex-end; font-size: 13px; }
  .sig-name { margin-top: 70px; font-weight: bold; text-decoration: underline; }
  @media print { .no-print { display: none; } @page { margin: 2.5cm; size: A4; } }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>

<div class="header">
  <h1>${madrasahName.toUpperCase()}</h1>
  <p>${madrasahAddress}</p>
</div>

<div class="title">
  <h2>SURAT KETERANGAN LULUS</h2>
  <p>Nomor: ${alumni.id.slice(-6).toUpperCase()}/SKL/${alumni.tahunLulus}</p>
</div>

<div class="content">
  <p>Yang bertanda tangan di bawah ini, Kepala ${madrasahName}, menerangkan dengan sesungguhnya bahwa:</p>
</div>

<table class="info-table">
  <tr><td>Nama</td><td>: ${alumni.santri.name}</td></tr>
  <tr><td>NIS</td><td>: ${alumni.santri.nis}</td></tr>
  <tr><td>NISN</td><td>: ${alumni.santri.nisn || "-"}</td></tr>
  <tr><td>Jenis Kelamin</td><td>: ${alumni.santri.gender === "L" ? "Laki-laki" : "Perempuan"}</td></tr>
  <tr><td>Tempat, Tgl Lahir</td><td>: ${alumni.santri.birthPlace || "-"}, ${alumni.santri.birthDate ? formatDate(alumni.santri.birthDate) : "-"}</td></tr>
  <tr><td>Kelas</td><td>: ${alumni.santri.kelas?.name || "-"}</td></tr>
  <tr><td>Tahun Lulus</td><td>: ${alumni.tahunLulus}</td></tr>
  <tr><td>Nilai Akhir</td><td>: ${alumni.nilaiAkhir || "-"}</td></tr>
  <tr><td>Predikat</td><td>: ${alumni.predikatAkhir || "-"}</td></tr>
</table>

<div class="content">
  <p>Adalah benar telah menyelesaikan pendidikan di ${madrasahName} dan dinyatakan <strong>LULUS</strong> pada tahun ajaran ${alumni.tahunLulus}.</p>
  <p>Surat keterangan ini dibuat untuk keperluan pendaftaran pendidikan lanjutan atau keperluan lain yang sah.</p>
  <p>Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
</div>

<div class="signature">
  <div style="text-align: center;">
    <p>Bandung, ${formatDate(alumni.tanggalLulus || new Date())}</p>
    <p>Kepala Madrasah</p>
    <div class="sig-name">(${madrasahHead})</div>
  </div>
</div>

</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } })
  } catch (error) {
    console.error("[surat lulus] error:", error)
    return NextResponse.json({ error: "Gagal generate surat lulus" }, { status: 500 })
  }
}
