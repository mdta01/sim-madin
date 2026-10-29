import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/pertemuan/[id]/nilai
 * Get nilai harian (type=HARIAN) for santri in this pertemuan's kelas on this date.
 *
 * PUT /api/admin/pertemuan/[id]/nilai
 * Bulk save nilai harian for this pertemuan.
 * Body: { entries: [{ santriId, score, notes? }], guruId?, assessmentDate? }
 */
export async function GET(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("nilai:read", req)
  if (guard.error) return guard.error
  try {
    const { id } = await params
    const pertemuan = await db.pertemuan.findUnique({
      where: { id },
      include: { kelas: true, mapel: true },
    })
    if (!pertemuan) return NextResponse.json({ error: "Pertemuan tidak ditemukan" }, { status: 404 })

    // Get all santri in kelas
    const santriList = await db.santri.findMany({
      where: { kelasId: pertemuan.kelasId, status: "AKTIF", deletedAt: null },
      select: { id: true, name: true, nis: true, photoUrl: true, gender: true },
      orderBy: { name: "asc" },
    })

    // Get existing HARIAN nilai for this kelas+mapel+date
    const dStart = new Date(
      pertemuan.date.getFullYear(),
      pertemuan.date.getMonth(),
      pertemuan.date.getDate(),
    )
    const dEnd = new Date(pertemuan.date.getFullYear(), pertemuan.date.getMonth(), pertemuan.date.getDate(), 23, 59, 59)

    const nilaiRecords = await db.nilai.findMany({
      where: {
        kelasId: pertemuan.kelasId,
        mapelId: pertemuan.mapelId,
        type: "HARIAN",
        tahunAjaranId: pertemuan.tahunAjaranId,
        semesterId: pertemuan.semesterId,
        assessmentDate: { gte: dStart, lte: dEnd },
      },
    })
    const nilaiMap = new Map(nilaiRecords.map((n) => [n.santriId, n]))
    const santriWithNilai = santriList.map((s) => ({
      ...s,
      nilai: nilaiMap.get(s.id) || null,
    }))

    return NextResponse.json({
      data: {
        pertemuan: {
          id: pertemuan.id,
          pertemuanKe: pertemuan.pertemuanKe,
          date: pertemuan.date,
          topic: pertemuan.topic,
        },
        mapel: { id: pertemuan.mapel.id, name: pertemuan.mapel.name, kkm: pertemuan.mapel.kkm },
        kelas: { id: pertemuan.kelas.id, name: pertemuan.kelas.name },
        santriList: santriWithNilai,
      },
    })
  } catch (error) {
    console.error("[pertemuan nilai get] error:", error)
    return NextResponse.json({ error: "Gagal memuat nilai pertemuan" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireApiPermission("nilai:create", req)
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

    if (!Array.isArray(body.entries)) {
      return NextResponse.json({ error: "entries harus array" }, { status: 400 })
    }

    const assessmentDate = body.assessmentDate ? new Date(body.assessmentDate) : pertemuan.date
    const guruId = body.guruId || pertemuan.guruId || null
    const results: any[] = []

    await db.$transaction(async (tx) => {
      for (const entry of body.entries) {
        if (!entry.santriId || entry.score === undefined || entry.score === null || entry.score === "") continue
        const score = Number(entry.score)
        if (Number.isNaN(score)) continue

        // Upsert: uniqueness is santriId+mapelId+type+semesterId+tahunAjaranId, but we filter by date too
        const existing = await tx.nilai.findFirst({
          where: {
            santriId: entry.santriId,
            mapelId: pertemuan.mapelId,
            type: "HARIAN",
            semesterId: pertemuan.semesterId,
            tahunAjaranId: pertemuan.tahunAjaranId,
            assessmentDate: {
              gte: new Date(assessmentDate.getFullYear(), assessmentDate.getMonth(), assessmentDate.getDate()),
              lte: new Date(assessmentDate.getFullYear(), assessmentDate.getMonth(), assessmentDate.getDate(), 23, 59, 59),
            },
          },
        })
        if (existing) {
          const r = await tx.nilai.update({
            where: { id: existing.id },
            data: {
              score,
              notes: entry.notes ?? existing.notes,
              guruId,
              assessmentDate,
            },
          })
          results.push(r)
        } else {
          const r = await tx.nilai.create({
            data: {
              tahunAjaranId: pertemuan.tahunAjaranId,
              semesterId: pertemuan.semesterId,
              santriId: entry.santriId,
              kelasId: pertemuan.kelasId,
              mapelId: pertemuan.mapelId,
              guruId,
              type: "HARIAN",
              score,
              notes: entry.notes || null,
              assessmentDate,
            },
          })
          results.push(r)
        }
      }
    })

    await logAudit(session, "UPDATE", "NILAI_PERTEMUAN", id, {
      pertemuanKe: pertemuan.pertemuanKe,
      mapel: pertemuan.mapel.name,
      count: results.length,
    }, req)

    return NextResponse.json({ data: results, count: results.length })
  } catch (error) {
    console.error("[pertemuan nilai save] error:", error)
    return NextResponse.json({ error: "Gagal menyimpan nilai pertemuan" }, { status: 500 })
  }
}
