import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/admin/pertemuan/[id]/absensi
 * Bulk save absensi records tied to this pertemuan's kelas & date.
 *
 * Body: { entries: [{ santriId, status, note? }] }
 *
 * Strategy: Absensi (V1 model) is keyed by santriId+date+tahunAjaranId.
 * Pertemuan knows kelasId+date, so we upsert Absensi for each santri.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("pertemuan:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()

    const pertemuan = await db.pertemuan.findUnique({
      where: { id },
      include: { kelas: true, mapel: true },
    })
    if (!pertemuan) return NextResponse.json({ error: "Pertemuan tidak ditemukan" }, { status: 404 })

    // V2 security: validate GURU has teaching access to this kelas+mapel
    const accessCheck = await validateGuruAccess(session, {
      kelasId: pertemuan.kelasId,
      mapelId: pertemuan.mapelId,
      guruId: body.guruId || pertemuan.guruId,
    }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error

    if (!Array.isArray(body.entries) || body.entries.length === 0) {
      return NextResponse.json({ error: "entries harus array tidak kosong" }, { status: 400 })
    }

    const dStart = new Date(
      pertemuan.date.getFullYear(),
      pertemuan.date.getMonth(),
      pertemuan.date.getDate(),
    )
    const dEnd = new Date(pertemuan.date.getFullYear(), pertemuan.date.getMonth(), pertemuan.date.getDate(), 23, 59, 59)

    const guruId = body.guruId || pertemuan.guruId || null
    const results: any[] = []

    // Use a transaction for atomic bulk upsert
    await db.$transaction(async (tx) => {
      for (const entry of body.entries) {
        if (!entry.santriId || !entry.status) continue
        const existing = await tx.absensi.findFirst({
          where: {
            santriId: entry.santriId,
            tahunAjaranId: pertemuan.tahunAjaranId,
            date: { gte: dStart, lte: dEnd },
          },
        })
        if (existing) {
          const r = await tx.absensi.update({
            where: { id: existing.id },
            data: {
              status: entry.status,
              note: entry.note ?? existing.note,
              recordedByGuruId: guruId,
            },
          })
          results.push(r)
        } else {
          const r = await tx.absensi.create({
            data: {
              tahunAjaranId: pertemuan.tahunAjaranId,
              santriId: entry.santriId,
              kelasId: pertemuan.kelasId,
              date: dStart,
              status: entry.status,
              note: entry.note || null,
              recordedByGuruId: guruId,
            },
          })
          results.push(r)
        }
      }

      // Optionally mark pertemuan as completed
      if (body.markCompleted) {
        await tx.pertemuan.update({
          where: { id },
          data: { isCompleted: true },
        })
      }
    })

    await logAudit(session, "UPDATE", "ABSENSI_PERTEMUAN", id, {
      pertemuanKe: pertemuan.pertemuanKe,
      kelas: pertemuan.kelas?.name,
      mapel: pertemuan.mapel?.name,
      count: results.length,
    }, req)

    return NextResponse.json({
      data: results,
      count: results.length,
      stats: {
        hadir: results.filter((r) => r.status === "HADIR").length,
        sakit: results.filter((r) => r.status === "SAKIT").length,
        izin: results.filter((r) => r.status === "IZIN").length,
        alfa: results.filter((r) => r.status === "ALFA").length,
      },
    })
  } catch (error) {
    console.error("[pertemuan absensi save] error:", error)
    return NextResponse.json({ error: "Gagal menyimpan absensi pertemuan" }, { status: 500 })
  }
}
