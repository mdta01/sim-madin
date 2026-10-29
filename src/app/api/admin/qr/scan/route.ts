import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

/**
 * POST /api/admin/qr/scan
 * Process QR scan: parse content, auto-create absensi if santri QR.
 *
 * Body: {
 *   qrContent: string, // "MADIN:SANTRI:{santriId}:{nis}" or "MADIN:GURU:{guruId}:{nip}"
 *   scanType?: string, // "ABSENSI" (default) | "IDENTITAS" | "PERPUSTAKAAN" | "KEGIATAN"
 *   deviceInfo?: string,
 *   location?: string,
 * }
 *
 * Returns: { result, message, santri/guru data }
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("qr:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    const { qrContent, scanType = "ABSENSI", deviceInfo, location } = body

    if (!qrContent) return NextResponse.json({ error: "qrContent wajib diisi" }, { status: 400 })

    // Parse QR content: "MADIN:SANTRI:{id}:{nis}" or "MADIN:GURU:{id}:{nip}"
    const parts = qrContent.split(":")
    if (parts.length < 4 || parts[0] !== "MADIN") {
      return NextResponse.json({ error: "Format QR tidak valid" }, { status: 400 })
    }

    const qrType = parts[1] // "SANTRI" or "GURU"
    const entityId = parts[2]
    const identifier = parts[3]

    // Verify entity exists
    if (qrType === "SANTRI") {
      const santri = await db.santri.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, nis: true, kelasId: true, status: true, kelas: { select: { name: true } } },
      })
      if (!santri || santri.status !== "AKTIF") {
        await db.qRScan.create({
          data: {
            qrType, entityId, scanType, scannedById: session.user.id, deviceInfo, location,
            result: "NOT_FOUND", message: "Santri tidak ditemukan atau tidak aktif",
          },
        })
        return NextResponse.json({ result: "NOT_FOUND", message: "Santri tidak ditemukan atau tidak aktif" }, { status: 404 })
      }

      // Check if already scanned today for absensi
      if (scanType === "ABSENSI") {
        const today = new Date()
        const dStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const dEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

        const existingAbsensi = await db.absensi.findFirst({
          where: { santriId: santri.id, date: { gte: dStart, lte: dEnd } },
        })

        if (existingAbsensi) {
          await db.qRScan.create({
            data: {
              qrType, entityId, scanType, scannedById: session.user.id, deviceInfo, location,
              result: "ALREADY_SCANNED", message: `${santri.name} sudah absen hari ini`,
            },
          })
          return NextResponse.json({
            result: "ALREADY_SCANNED",
            message: `${santri.name} sudah absen hari ini (status: ${existingAbsensi.status})`,
            santri: { name: santri.name, nis: santri.nis, kelas: santri.kelas?.name },
          })
        }

        // Create absensi HADIR
        const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
        if (!ta) return NextResponse.json({ error: "Tahun ajaran aktif tidak ditemukan" }, { status: 400 })

        const absensi = await db.absensi.create({
          data: {
            tahunAjaranId: ta.id,
            santriId: santri.id,
            kelasId: santri.kelasId!,
            date: dStart,
            status: "HADIR",
            note: "Absensi via QR scan",
          },
        })

        await db.qRScan.create({
          data: {
            qrType, entityId, scanType, scannedById: session.user.id, deviceInfo, location,
            result: "SUCCESS", message: `${santri.name} berhasil absen via QR`,
          },
        })

        await logAudit(session, "CREATE", "ABSENSI_QR", absensi.id, {
          santri: santri.name, method: "QR_SCAN",
        }, req)

        return NextResponse.json({
          result: "SUCCESS",
          message: `${santri.name} berhasil absen via QR scan`,
          santri: { name: santri.name, nis: santri.nis, kelas: santri.kelas?.name },
          absensi,
        })
      }

      // Non-absensi scan (IDENTITAS, PERPUSTAKAAN, KEGIATAN) — just log
      await db.qRScan.create({
        data: {
          qrType, entityId, scanType, scannedById: session.user.id, deviceInfo, location,
          result: "SUCCESS", message: `${santri.name} scan untuk ${scanType}`,
        },
      })
      return NextResponse.json({
        result: "SUCCESS",
        message: `${santri.name} — QR scan ${scanType} berhasil`,
        santri: { name: santri.name, nis: santri.nis, kelas: santri.kelas?.name },
      })

    } else if (qrType === "GURU") {
      const guru = await db.guru.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, nip: true, status: true },
      })
      if (!guru || guru.status !== "AKTIF") {
        await db.qRScan.create({
          data: {
            qrType, entityId, scanType, scannedById: session.user.id, deviceInfo, location,
            result: "NOT_FOUND", message: "Guru tidak ditemukan atau tidak aktif",
          },
        })
        return NextResponse.json({ result: "NOT_FOUND", message: "Guru tidak ditemukan" }, { status: 404 })
      }

      // Log guru scan (absensi guru = future enhancement, for now just log)
      await db.qRScan.create({
        data: {
          qrType, entityId, scanType, scannedById: session.user.id, deviceInfo, location,
          result: "SUCCESS", message: `${guru.name} scan untuk ${scanType}`,
        },
      })
      return NextResponse.json({
        result: "SUCCESS",
        message: `${guru.name} — QR scan ${scanType} berhasil`,
        guru: { name: guru.name, nip: guru.nip },
      })
    }

    return NextResponse.json({ error: "Tipe QR tidak dikenal" }, { status: 400 })
  } catch (error) {
    console.error("[qr scan] error:", error)
    return NextResponse.json({ error: "Gagal memproses QR scan" }, { status: 500 })
  }
}
