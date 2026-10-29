import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatDate } from "@/lib/constants"

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/alumni/[id]/sertifikat
 * Returns HTML printable Sertifikat Kelulusan (Ctrl+P → save as PDF).
 * Landscape A4, decorative border.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("alumni:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const alumni = await db.alumni.findUnique({
      where: { id },
      include: { santri: { select: { name: true, nis: true, kelas: { select: { name: true } } } } },
    })
    if (!alumni) return NextResponse.json({ error: "Alumni tidak ditemukan" }, { status: 404 })

    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_HEAD"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahHead = settingsMap.get("MADRASAH_HEAD") || ""

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Sertifikat - ${alumni.santri.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #000; padding: 20px; display: flex; justify-content: center; }
  .sertifikat {
    width: 27cm; min-height: 18cm; padding: 50px 60px;
    border: 8px double #059669; border-radius: 15px;
    background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f0fdf4 100%);
    text-align: center; position: relative;
  }
  .sertifikat::before {
    content: ''; position: absolute; top: 15px; left: 15px; right: 15px; bottom: 15px;
    border: 2px solid #059669; border-radius: 10px; pointer-events: none;
  }
  .header h1 { font-size: 28px; color: #059669; margin-bottom: 5px; }
  .header p { font-size: 12px; color: #666; }
  .title { margin: 30px 0; }
  .title h2 { font-size: 32px; color: #059669; font-weight: bold; letter-spacing: 3px; }
  .subtitle { font-size: 14px; color: #666; margin-bottom: 25px; }
  .nama { font-size: 36px; font-weight: bold; color: #059669; margin: 20px 0; font-family: 'Georgia', serif; }
  .deskripsi { font-size: 16px; line-height: 1.8; max-width: 500px; margin: 0 auto 20px; }
  .info { font-size: 14px; margin: 15px 0; color: #333; }
  .info span { font-weight: bold; }
  .signature { margin-top: 50px; }
  .signature p { font-size: 14px; }
  .signature .name { margin-top: 60px; font-size: 18px; font-weight: bold; text-decoration: underline; }
  @media print { .no-print { display: none; } @page { margin: 0; size: A4 landscape; } }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; z-index: 100; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>

<div class="sertifikat">
  <div class="header">
    <h1>${madrasahName.toUpperCase()}</h1>
    <p>SERTIFIKAT KELULUSAN</p>
  </div>

  <div class="title">
    <h2>SERTIFIKAT</h2>
    <div class="subtitle">Diberikan kepada</div>
  </div>

  <div class="nama">${alumni.santri.name}</div>

  <div class="deskripsi">
    Atas capaiannya dalam menyelesaikan pendidikan dengan predikat
    <strong>${alumni.predikatAkhir || "MEMUASKAN"}</strong>
    dan nilai akhir <strong>${alumni.nilaiAkhir || "-"}</strong>
  </div>

  <div class="info">
    NIS: <span>${alumni.santri.nis}</span> &nbsp;|&nbsp;
    Kelas: <span>${alumni.santri.kelas?.name || "-"}</span> &nbsp;|&nbsp;
    Tahun Lulus: <span>${alumni.tahunLulus}</span>
  </div>

  <div class="signature">
    <p>Bandung, ${formatDate(alumni.tanggalLulus || new Date())}</p>
    <p>Kepala Madrasah</p>
    <div class="name">${madrasahHead}</div>
  </div>
</div>

</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } })
  } catch (error) {
    console.error("[sertifikat] error:", error)
    return NextResponse.json({ error: "Gagal generate sertifikat" }, { status: 500 })
  }
}
