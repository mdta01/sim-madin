import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatRupiah, formatDate } from "@/lib/constants"

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/honor-guru/[id]/slip
 * Returns HTML printable slip honor guru (Ctrl+P → save as PDF).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("honor_guru:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const honor = await db.honorGuru.findUnique({
      where: { id },
      include: { guru: true, kas: true },
    })
    if (!honor) return NextResponse.json({ error: "Honor tidak ditemukan" }, { status: 404 })

    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_ADDRESS", "MADRASAH_HEAD"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahAddress = settingsMap.get("MADRASAH_ADDRESS") || ""

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Slip Honor - ${honor.guru.name} - ${honor.periodeLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #000; padding: 20px; max-width: 700px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { font-size: 18px; }
  .header p { font-size: 12px; margin-top: 4px; }
  .title { text-align: center; margin: 15px 0; }
  .title h3 { font-size: 14px; text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px; }
  td { padding: 5px 8px; }
  .info td:first-child { font-weight: bold; width: 30%; }
  .slip-table th, .slip-table td { border: 1px solid #000; padding: 6px 10px; }
  .slip-table th { background: #f0f0f0; text-align: left; }
  .slip-table td.right { text-align: right; }
  .total-row { font-weight: bold; background: #f8f8f8; }
  .signature { margin-top: 40px; display: flex; justify-content: flex-end; font-size: 12px; }
  .sig-name { margin-top: 60px; font-weight: bold; text-decoration: underline; }
  @media print { .no-print { display: none; } @page { margin: 1.5cm; size: A4; } }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>
<div class="header"><h1>${madrasahName.toUpperCase()}</h1><p>${madrasahAddress}</p></div>
<div class="title"><h3>SLIP HONOR GURU</h3><p>${honor.periodeLabel}</p></div>
<table class="info">
  <tr><td>Nama Guru</td><td>: ${honor.guru.name}</td></tr>
  <tr><td>NIP</td><td>: ${honor.guru.nip || "-"}</td></tr>
  <tr><td>Periode</td><td>: ${honor.periodeLabel}</td></tr>
  <tr><td>Status</td><td>: ${honor.status}</td></tr>
  ${honor.paidAt ? `<tr><td>Tanggal Dibayar</td><td>: ${formatDate(honor.paidAt)}</td></tr>` : ""}
  ${honor.kas ? `<tr><td>Dibayar via</td><td>: ${honor.kas.name}</td></tr>` : ""}
</table>
<table class="slip-table">
  <thead><tr><th>Komponen</th><th class="right">Nominal</th></tr></thead>
  <tbody>
    <tr><td>Honor Mengajar</td><td class="right">${formatRupiah(honor.honorMengajar)}</td></tr>
    <tr><td>Insentif</td><td class="right">${formatRupiah(honor.insentif)}</td></tr>
    <tr><td>Tunjangan</td><td class="right">${formatRupiah(honor.tunjangan)}</td></tr>
    <tr><td>Potongan</td><td class="right">(-) ${formatRupiah(honor.potongan)}</td></tr>
    <tr class="total-row"><td>TOTAL HONOR DITERIMA</td><td class="right">${formatRupiah(honor.totalHonor)}</td></tr>
  </tbody>
</table>
${honor.catatan ? `<p style="font-size: 12px; margin-top: 10px;"><strong>Catatan:</strong> ${honor.catatan}</p>` : ""}
<div class="signature">
  <div style="text-align: center;">
    <p>Bandung, ${formatDate(new Date())}</p>
    <p>Bendahara Madrasah</p>
    <div class="sig-name">(____________________)</div>
  </div>
</div>
</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } })
  } catch (error) {
    console.error("[slip honor] error:", error)
    return NextResponse.json({ error: "Gagal generate slip honor" }, { status: 500 })
  }
}
