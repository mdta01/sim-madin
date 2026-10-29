import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"
import { markOverduePertemuanCompletedSafe } from "@/lib/pertemuan/auto-complete"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("pertemuan:read", req)
  if (guard.error) return guard.error
  try {
    // V2 #5: Auto-mark overdue pertemuan (compute-on-read, silent)
    await markOverduePertemuanCompletedSafe()

    const { id } = await params
    const pertemuan = await db.pertemuan.findUnique({
      where: { id },
      include: {
        mapel: true,
        kelas: true,
        guru: { select: { id: true, name: true } },
      },
    })
    if (!pertemuan) return NextResponse.json({ error: "Pertemuan tidak ditemukan" }, { status: 404 })

    // V2 #8: fetch related materi for this kelas+mapel+pertemuan number
    // (materi where kelasId = this kelas OR kelasId = null (all kelas),
    //  mapelId = this mapel, pertemuan = this pertemuanKe OR pertemuan = null)
    const relatedMateri = await db.materi.findMany({
      where: {
        AND: [
          { mapelId: pertemuan.mapelId },
          { tahunAjaranId: pertemuan.tahunAjaranId },
          { semesterId: pertemuan.semesterId },
          { deletedAt: null },
          { isPublished: true },
          {
            OR: [
              { kelasId: pertemuan.kelasId },
              { kelasId: null },
            ],
          },
          {
            OR: [
              { pertemuan: pertemuan.pertemuanKe },
              { pertemuan: null },
            ],
          },
        ],
      },
      include: {
        guru: { select: { id: true, name: true } },
      },
      orderBy: [{ pertemuan: "asc" }, { sortOrder: "asc" }, { publishedAt: "desc" }],
      take: 30,
    })

    // Get santri in kelas + their absensi on this date for this kelas
    const dStart = new Date(
      pertemuan.date.getFullYear(),
      pertemuan.date.getMonth(),
      pertemuan.date.getDate(),
    )
    const dEnd = new Date(pertemuan.date.getFullYear(), pertemuan.date.getMonth(), pertemuan.date.getDate(), 23, 59, 59)

    const [santriList, absensiRecords] = await Promise.all([
      db.santri.findMany({
        where: { kelasId: pertemuan.kelasId, status: "AKTIF", deletedAt: null },
        select: { id: true, name: true, nis: true, photoUrl: true, gender: true },
        orderBy: { name: "asc" },
      }),
      db.absensi.findMany({
        where: {
          kelasId: pertemuan.kelasId,
          tahunAjaranId: pertemuan.tahunAjaranId,
          date: { gte: dStart, lte: dEnd },
        },
      }),
    ])

    const absensiMap = new Map(absensiRecords.map((a) => [a.santriId, a]))
    const santriWithAbsensi = santriList.map((s) => ({
      ...s,
      absensi: absensiMap.get(s.id) || null,
    }))

    return NextResponse.json({
      data: {
        ...pertemuan,
        santriList: santriWithAbsensi,
        absensiStats: {
          hadir: absensiRecords.filter((a) => a.status === "HADIR").length,
          sakit: absensiRecords.filter((a) => a.status === "SAKIT").length,
          izin: absensiRecords.filter((a) => a.status === "IZIN").length,
          alfa: absensiRecords.filter((a) => a.status === "ALFA").length,
          belum: santriList.length - absensiRecords.length,
        },
        relatedMateri, // V2 #8: materi yang relevan untuk pertemuan ini
      },
    })
  } catch (error) {
    console.error("[pertemuan detail] error:", error)
    return NextResponse.json({ error: "Gagal memuat pertemuan" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("pertemuan:update", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.pertemuan.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Pertemuan tidak ditemukan" }, { status: 404 })

    const pertemuan = await db.pertemuan.update({
      where: { id },
      data: {
        topic: body.topic ?? existing.topic,
        description: body.description ?? existing.description,
        isCompleted: body.isCompleted ?? existing.isCompleted,
        date: body.date ? new Date(body.date) : existing.date,
        guruId: body.guruId !== undefined ? body.guruId : existing.guruId,
      },
      include: { mapel: { select: { name: true } }, kelas: { select: { name: true } } },
    })
    await logAudit(session, "UPDATE", "PERTEMUAN", pertemuan.id, {
      topic: pertemuan.topic, isCompleted: pertemuan.isCompleted,
    }, req)
    return NextResponse.json({ data: pertemuan })
  } catch (error) {
    console.error("[pertemuan update] error:", error)
    return NextResponse.json({ error: "Gagal memperbarui pertemuan" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("pertemuan:delete", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const existing = await db.pertemuan.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Pertemuan tidak ditemukan" }, { status: 404 })

    await db.pertemuan.delete({ where: { id } })
    await logAudit(session, "DELETE", "PERTEMUAN", id, {
      pertemuanKe: existing.pertemuanKe,
    }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[pertemuan delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus pertemuan" }, { status: 500 })
  }
}
