import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("absensi:read")
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const kelasId = searchParams.get("kelasId")
    const santriId = searchParams.get("santriId")
    const status = searchParams.get("status")
    const date = searchParams.get("date")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const taId = searchParams.get("tahunAjaranId")

    let tahunAjaranId = taId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id
    }

    const where: any = {}
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (kelasId) where.kelasId = kelasId
    if (santriId) where.santriId = santriId
    if (status) where.status = status
    if (date) {
      const d = new Date(date)
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      where.date = { gte: start, lte: end }
    } else if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(new Date(dateTo).getTime() + 86400000 - 1)
    }

    const absensi = await db.absensi.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
        kelas: { select: { id: true, name: true, code: true } },
        guru: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { santri: { name: "asc" } }],
      take: 500,
    })
    return NextResponse.json({ data: absensi, total: absensi.length })
  } catch (error) {
    console.error("[absensi list] error:", error)
    return NextResponse.json({ error: "Gagal memuat absensi" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("absensi:create")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (body.entries && Array.isArray(body.entries)) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      if (!ta) return NextResponse.json({ error: "Tidak ada tahun ajaran aktif" }, { status: 400 })

      const date = body.date ? new Date(body.date) : new Date()
      const dStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)

      const results = []
      for (const entry of body.entries) {
        const existing = await db.absensi.findFirst({
          where: { santriId: entry.santriId, date: { gte: dStart, lte: dEnd }, tahunAjaranId: ta.id },
        })
        if (existing) {
          const r = await db.absensi.update({
            where: { id: existing.id },
            data: { status: entry.status, note: entry.note || null, recordedByGuruId: body.recordedByGuruId || entry.guruId || null },
          })
          results.push(r)
        } else {
          const r = await db.absensi.create({
            data: {
              tahunAjaranId: ta.id,
              santriId: entry.santriId,
              kelasId: body.kelasId,
              date: dStart,
              status: entry.status,
              note: entry.note || null,
              recordedByGuruId: body.recordedByGuruId || entry.guruId || null,
            },
          })
          results.push(r)
        }
      }
      await logAudit(session, "CREATE", "ABSENSI", undefined, {
        count: results.length, kelasId: body.kelasId, date: dStart.toISOString(),
      }, req)
      return NextResponse.json({ data: results, count: results.length })
    }

    if (!body.santriId || !body.kelasId || !body.status) {
      return NextResponse.json({ error: "Santri, Kelas, dan Status wajib diisi" }, { status: 400 })
    }
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    if (!ta) return NextResponse.json({ error: "Tidak ada tahun ajaran aktif" }, { status: 400 })

    const date = body.date ? new Date(body.date) : new Date()
    const absensi = await db.absensi.create({
      data: {
        tahunAjaranId: ta.id,
        santriId: body.santriId,
        kelasId: body.kelasId,
        date,
        status: body.status,
        note: body.note || null,
        recordedByGuruId: body.guruId || null,
      },
      include: { santri: true, kelas: true },
    })
    await logAudit(session, "CREATE", "ABSENSI", absensi.id, {
      santri: absensi.santri.name, status: absensi.status, date,
    }, req)
    return NextResponse.json({ data: absensi })
  } catch (error) {
    console.error("[absensi create] error:", error)
    return NextResponse.json({ error: "Gagal menyimpan absensi" }, { status: 500 })
  }
}
