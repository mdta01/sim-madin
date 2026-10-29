import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatDate } from "@/lib/constants"

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/surat/[id]/pdf
 * Returns HTML printable surat (Ctrl+P → save as PDF).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("surat:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const surat = await db.surat.findUnique({
      where: { id },
      include: {
        santri: { select: { name: true, nis: true, nisn: true, gender: true, birthPlace: true, birthDate: true, address: true, kelas: { select: { name: true } } } },
        guru: { select: { name: true, nip: true } },
      },
    })
    if (!surat) return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 })

    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_ADDRESS", "MADRASAH_HEAD"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahAddress = settingsMap.get("MADRASAH_ADDRESS") || ""
    const madrasahHead = settingsMap.get("MADRASAH_HEAD") || ""

    // Convert content to HTML paragraphs
    const contentHtml = surat.content.split("\n").map((line) => line.trim() ? `<p>${line}</p>` : "<br/>").join("")

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>${surat.nomorSurat} - ${surat.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #000; padding: 30px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 30px; }
  .header-left { text-align: left; }
  .header-right { text-align: right; }
  .header h1 { font-size: 16px; font-weight: bold; }
  .header p { font-size: 11px; margin-top: 2px; }
  .title { text-align: center; margin: 20px 0; }
  .title h2 { font-size: 14px; text-decoration: underline; font-weight: bold; }
  .title .nomor { font-size: 12px; margin-top: 8px; }
  .content { font-size: 12px; line-height: 1.8; text-align: justify; }
  .content p { margin-bottom: 8px; }
  .signature { margin-top: 50px; display: flex; justify-content: flex-end; }
  .sig-block { text-align: center; font-size: 12px; }
  .sig-name { margin-top: 70px; font-weight: bold; text-decoration: underline; }
  .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ccc; padding-top: 8px; }
  @media print { .no-print { display: none; } @page { margin: 2cm; size: A4; } }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>

<div class="header">
  <div class="header-left">
    <h1>${madrasahName.toUpperCase()}</h1>
    <p>${madrasahAddress}</p>
  </div>
  <div class="header-right">
    <h1>KOP SURAT</h1>
    <p>Nomor: ${surat.nomorSurat}</p>
  </div>
</div>

<div class="title">
  <h2>${surat.title.toUpperCase()}</h2>
  <p class="nomor">Nomor: ${surat.nomorSurat}</p>
</div>

<div class="content">
  ${contentHtml}
</div>

${surat.periodeMulai || surat.periodeSelesai ? `
<div class="content" style="margin-top: 15px;">
  ${surat.periodeMulai ? `<p>Periode mulai: ${formatDate(surat.periodeMulai)}</p>` : ""}
  ${surat.periodeSelesai ? `<p>Periode selesai: ${formatDate(surat.periodeSelesai)}</p>` : ""}
</div>` : ""}

<div class="signature">
  <div class="sig-block">
    <p>${surat.tempat || "Bandung"}, ${formatDate(surat.tanggalSurat)}</p>
    <p>Kepala Madrasah</p>
    <div class="sig-name">(${surat.signedBy || madrasahHead})</div>
  </div>
</div>

<div class="footer">
  <p>Dokumen ini diterbitkan oleh SIM MADIN | Status: ${surat.status}</p>
</div>

</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } })
  } catch (error) {
    console.error("[surat pdf] error:", error)
    return NextResponse.json({ error: "Gagal generate surat PDF" }, { status: 500 })
  }
}
