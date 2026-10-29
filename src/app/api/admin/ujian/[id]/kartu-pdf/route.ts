import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatDate } from "@/lib/constants"

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/ujian/[id]/kartu-pdf?santriId=xxx
 * Returns HTML printable kartu ujian for a specific santri (Ctrl+P → save as PDF).
 *
 * If no santriId, returns list of all santri in kelas as a multi-page printable.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("ujian:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const ujian = await db.ujian.findUnique({
      where: { id, deletedAt: null },
      include: {
        mapel: { select: { name: true, code: true } },
        kelas: { select: { name: true, code: true } },
      },
    })
    if (!ujian) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")

    let santriList: any[]
    if (santriId) {
      const santri = await db.santri.findUnique({
        where: { id: santriId },
        select: { id: true, name: true, nis: true, nisn: true, gender: true, photoUrl: true },
      })
      santriList = santri ? [santri] : []
    } else {
      santriList = await db.santri.findMany({
        where: { kelasId: ujian.kelasId, status: "AKTIF", deletedAt: null },
        select: { id: true, name: true, nis: true, nisn: true, gender: true, photoUrl: true },
        orderBy: { name: "asc" },
      })
    }

    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_ADDRESS"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahAddress = settingsMap.get("MADRASAH_ADDRESS") || ""

    const cards = santriList.map((s, i) => `
    <div class="kartu ${i > 0 ? "page-break" : ""}">
      <div class="kartu-header">
        <h1>${madrasahName.toUpperCase()}</h1>
        <p>${madrasahAddress}</p>
      </div>
      <div class="kartu-title">
        <h2>KARTU UJIAN</h2>
        <p>${ujian.title}</p>
      </div>
      <table class="info-table">
        <tr><td>Nama</td><td>: ${s.name}</td><td>NIS</td><td>: ${s.nis}</td></tr>
        <tr><td>NISN</td><td>: ${s.nisn || "-"}</td><td>Kelas</td><td>: ${ujian.kelas.name}</td></tr>
        <tr><td>Jenis Kelamin</td><td>: ${s.gender === "L" ? "Laki-laki" : "Perempuan"}</td><td>Mata Pelajaran</td><td>: ${ujian.mapel.name}</td></tr>
        <tr><td>Tipe Ujian</td><td>: ${ujian.type}</td><td>Max Score</td><td>: ${ujian.maxScore}</td></tr>
        <tr><td>Tanggal</td><td>: ${formatDate(ujian.startTime, true)}</td><td>Durasi</td><td>: ${ujian.durationMnt} menit</td></tr>
        <tr><td>Ruang</td><td>: ${ujian.ruang || "-"}</td><td>Pengawas</td><td>: ${ujian.pengawas || "-"}</td></tr>
      </table>
      ${ujian.description ? `<div class="catatan"><strong>Keterangan:</strong> ${ujian.description}</div>` : ""}
      <div class="qr-placeholder">
        <p class="qr-label">NIS: ${s.nis}</p>
        <div class="qr-box">[QR Code]</div>
      </div>
      <div class="kartu-footer">
        <p>Tanda tangan santri: _________________</p>
        <p class="footer-date">Dicetak: ${formatDate(new Date(), true)}</p>
      </div>
    </div>
    `).join("")

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Kartu Ujian - ${ujian.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #000; padding: 10px; }
  .kartu { width: 5cm; height: 8.5cm; border: 2px solid #000; padding: 8px; margin: 10px auto; display: inline-block; vertical-align: top; }
  .page-break { page-break-before: always; }
  .kartu-header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
  .kartu-header h1 { font-size: 10px; }
  .kartu-header p { font-size: 7px; }
  .kartu-title { text-align: center; margin: 6px 0; }
  .kartu-title h2 { font-size: 12px; text-decoration: underline; }
  .kartu-title p { font-size: 8px; margin-top: 2px; }
  .info-table { width: 100%; font-size: 7px; border-collapse: collapse; }
  .info-table td { padding: 2px 4px; }
  .info-table td:first-child, .info-table td:nth-child(3) { font-weight: bold; }
  .catatan { font-size: 6px; margin-top: 4px; padding: 2px; border: 1px dashed #ccc; }
  .qr-placeholder { text-align: center; margin-top: 6px; }
  .qr-label { font-size: 7px; }
  .qr-box { width: 40px; height: 40px; border: 1px solid #000; margin: 2px auto; display: flex; align-items: center; justify-content: center; font-size: 6px; color: #999; }
  .kartu-footer { margin-top: 4px; font-size: 6px; border-top: 1px solid #ccc; padding-top: 2px; }
  .footer-date { text-align: right; color: #999; }
  @media print {
    .no-print { display: none; }
    @page { margin: 0.5cm; size: A4; }
    .kartu { width: 8.5cm; height: 5.5cm; }
  }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>
${cards || "<p>Tidak ada santri.</p>"}
</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } })
  } catch (error) {
    console.error("[kartu ujian pdf] error:", error)
    return NextResponse.json({ error: "Gagal generate kartu ujian" }, { status: 500 })
  }
}
