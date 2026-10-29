import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission } from "@/lib/auth/guards"
import { formatDate } from "@/lib/constants"
import QRCode from "qrcode"

interface Params { params: Promise<{ guruId: string }> }

/**
 * GET /api/admin/dokumen/kartu-guru/[guruId]
 * Returns HTML printable kartu guru (digital ID card) with QR code.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("surat:read", req)
  if (guard.error) return guard.error
  try {
    const { guruId } = await params
    const guru = await db.guru.findUnique({
      where: { id: guruId },
      select: { id: true, name: true, nip: true, nuptk: true, gender: true, phone: true, email: true, photoUrl: true, specialization: true, status: true },
    })
    if (!guru) return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 })

    const settings = await db.systemSetting.findMany({
      where: { key: { in: ["MADRASAH_NAME", "MADRASAH_ADDRESS"] } },
    })
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
    const madrasahName = settingsMap.get("MADRASAH_NAME") || "Madrasah Diniyah"
    const madrasahAddress = settingsMap.get("MADRASAH_ADDRESS") || ""

    // Generate QR
    const qrContent = `MADIN:GURU:${guru.id}:${guru.nip || guru.id}`
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 100, margin: 1,
      color: { dark: "#7c3aed", light: "#ffffff" },
    })

    const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<title>Kartu Guru - ${guru.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #000; padding: 20px; display: flex; justify-content: center; }
  .card { width: 8.5cm; height: 5.5cm; border: 2px solid #7c3aed; border-radius: 10px; overflow: hidden; display: flex; }
  .card-left { width: 35%; background: #7c3aed; color: white; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .card-left .logo { width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; font-size: 24px; }
  .card-left .school-name { font-size: 9px; text-align: center; font-weight: bold; }
  .card-right { flex: 1; padding: 10px; }
  .card-right h3 { font-size: 11px; color: #7c3aed; margin-bottom: 6px; }
  .info { font-size: 8px; }
  .info .row { display: flex; margin-bottom: 2px; }
  .info .label { width: 50px; font-weight: bold; }
  .info .value { flex: 1; }
  .qr-img { width: 50px; height: 50px; margin-top: 5px; }
  @media print { .no-print { display: none; } @page { margin: 0; size: landscape; } }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #7c3aed; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Save PDF</button>

<div class="card">
  <div class="card-left">
    <div class="logo">🏫</div>
    <div class="school-name">${madrasahName.toUpperCase()}</div>
    <div style="font-size: 7px; margin-top: 4px; text-align: center;">${madrasahAddress}</div>
  </div>
  <div class="card-right">
    <h3>KARTU GURU</h3>
    <div class="info">
      <div class="row"><span class="label">Nama</span><span class="value">: ${guru.name}</span></div>
      <div class="row"><span class="label">NIP</span><span class="value">: ${guru.nip || "-"}</span></div>
      <div class="row"><span class="label">NUPTK</span><span class="value">: ${guru.nuptk || "-"}</span></div>
      <div class="row"><span class="label">Gender</span><span class="value">: ${guru.gender === "L" ? "Laki-laki" : "Perempuan"}</span></div>
      <div class="row"><span class="label">Bidang</span><span class="value">: ${guru.specialization || "-"}</span></div>
      <div class="row"><span class="label">Telp</span><span class="value">: ${guru.phone || "-"}</span></div>
    </div>
    <img src="${qrDataUrl}" class="qr-img" alt="QR Code" />
  </div>
</div>

</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } })
  } catch (error) {
    console.error("[kartu guru pdf] error:", error)
    return NextResponse.json({ error: "Gagal generate kartu guru" }, { status: 500 })
  }
}
