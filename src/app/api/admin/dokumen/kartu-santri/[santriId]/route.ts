import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatDate } from "@/lib/constants"

interface Params { params: Promise<{ santriId: string }> }

/**
 * GET /api/admin/dokumen/kartu-santri/[santriId]
 * Returns HTML printable kartu santri (digital ID card).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("surat:read", req)
  if (guard.error) return guard.error
  try {
    const { santriId } = await params
    const santri = await db.santri.findUnique({
      where: { id: santriId },
      include: { kelas: true, tahunAjaran: true },
    })
    if (!santri) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 })

    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_ADDRESS"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahAddress = settingsMap.get("MADRASAH_ADDRESS") || ""

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Kartu Santri - ${santri.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #000; padding: 20px; display: flex; justify-content: center; }
  .card { width: 8.5cm; height: 5.5cm; border: 2px solid #059669; border-radius: 10px; overflow: hidden; display: flex; }
  .card-left { width: 35%; background: #059669; color: white; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .card-left .logo { width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; font-size: 24px; }
  .card-left .school-name { font-size: 9px; text-align: center; font-weight: bold; }
  .card-right { flex: 1; padding: 10px; }
  .card-right h3 { font-size: 11px; color: #059669; margin-bottom: 6px; }
  .info { font-size: 8px; }
  .info .row { display: flex; margin-bottom: 2px; }
  .info .label { width: 50px; font-weight: bold; }
  .info .value { flex: 1; }
  .qr-box { width: 50px; height: 50px; border: 1px solid #059669; margin-top: 5px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; }
  @media print { .no-print { display: none; } @page { margin: 0; size: landscape; } }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>

<div class="card">
  <div class="card-left">
    <div class="logo">🏫</div>
    <div class="school-name">${madrasahName.toUpperCase()}</div>
    <div style="font-size: 7px; margin-top: 4px; text-align: center;">${madrasahAddress}</div>
  </div>
  <div class="card-right">
    <h3>KARTU SANTRI</h3>
    <div class="info">
      <div class="row"><span class="label">Nama</span><span class="value">: ${santri.name}</span></div>
      <div class="row"><span class="label">NIS</span><span class="value">: ${santri.nis}</span></div>
      <div class="row"><span class="label">NISN</span><span class="value">: ${santri.nisn || "-"}</span></div>
      <div class="row"><span class="label">Kelas</span><span class="value">: ${santri.kelas?.name || "-"}</span></div>
      <div class="row"><span class="label">Gender</span><span class="value">: ${santri.gender === "L" ? "Laki-laki" : "Perempuan"}</span></div>
      <div class="row"><span class="label">Lahir</span><span class="value">: ${santri.birthPlace || "-"}, ${santri.birthDate ? formatDate(santri.birthDate) : "-"}</span></div>
    </div>
    <div class="qr-box">QR: ${santri.nis}</div>
  </div>
</div>

</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } })
  } catch (error) {
    console.error("[kartu santri pdf] error:", error)
    return NextResponse.json({ error: "Gagal generate kartu santri" }, { status: 500 })
  }
}
