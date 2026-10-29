import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatRupiah, formatDate } from "@/lib/constants"

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/pembayaran/[id]/kwitansi
 * Returns HTML printable kwitansi (Ctrl+P → save as PDF).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("pembayaran:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        santri: { select: { name: true, nis: true, kelas: { select: { name: true } } } },
        tagihan: { include: { jenisTagihan: true } },
        recordedBy: { select: { name: true } },
      },
    })
    if (!payment) return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 })

    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_ADDRESS"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahAddress = settingsMap.get("MADRASAH_ADDRESS") || ""

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Kwitansi ${payment.invoiceNo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #000; padding: 20px; max-width: 600px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; }
  .header p { font-size: 12px; margin-top: 4px; }
  .title { text-align: center; margin: 15px 0; }
  .title h3 { font-size: 16px; text-decoration: underline; }
  .kwitansi-no { text-align: right; font-size: 12px; margin-bottom: 15px; }
  table { width: 100%; font-size: 13px; }
  td { padding: 4px 8px; }
  td:first-child { font-weight: bold; width: 35%; }
  .amount-box { border: 2px solid #000; padding: 10px; text-align: center; margin: 15px 0; }
  .amount-box .amount { font-size: 24px; font-weight: bold; }
  .signature { margin-top: 40px; display: flex; justify-content: flex-end; font-size: 12px; }
  .sig-name { margin-top: 60px; font-weight: bold; text-decoration: underline; }
  @media print { .no-print { display: none; } @page { margin: 1.5cm; size: A5; } }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>
<div class="header"><h1>${madrasahName.toUpperCase()}</h1><p>${madrasahAddress}</p></div>
<div class="title"><h3>KWITANSI PEMBAYARAN</h3></div>
<div class="kwitansi-no">No: ${payment.invoiceNo}</div>
<table>
  <tr><td>Nama Santri</td><td>: ${payment.santri?.name || "-"}</td></tr>
  <tr><td>NIS</td><td>: ${payment.santri?.nis || "-"}</td></tr>
  <tr><td>Kelas</td><td>: ${payment.santri?.kelas?.name || "-"}</td></tr>
  <tr><td>Untuk Pembayaran</td><td>: ${payment.tagihan?.jenisTagihan?.name || payment.note || "Pembayaran"}</td></tr>
  <tr><td>Tanggal</td><td>: ${formatDate(payment.paymentDate)}</td></tr>
  <tr><td>Metode</td><td>: ${payment.paymentMethod}</td></tr>
  <tr><td>Status</td><td>: ${payment.status}</td></tr>
</table>
<div class="amount-box">
  <p style="font-size: 11px;">JUMLAH DIBAYARKAN</p>
  <p class="amount">${formatRupiah(payment.amount)}</p>
</div>
${payment.note ? `<p style="font-size: 12px;"><strong>Catatan:</strong> ${payment.note}</p>` : ""}
<div class="signature">
  <div style="text-align: center;">
    <p>Bandung, ${formatDate(new Date())}</p>
    <p>Bendahara Madrasah</p>
    <div class="sig-name">(${payment.recordedBy?.name || "____________"})</div>
  </div>
</div>
</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } })
  } catch (error) {
    console.error("[kwitansi] error:", error)
    return NextResponse.json({ error: "Gagal generate kwitansi" }, { status: 500 })
  }
}
