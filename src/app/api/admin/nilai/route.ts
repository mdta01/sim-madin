import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { notifikasiNilaiUpdated } from "@/lib/notifikasi/helper"
import { validateBody } from "@/lib/validation/helpers"
import { nilaiCreateSchema } from "@/lib/validation/akademik-detail"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("nilai:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    const kelasId = searchParams.get("kelasId")
    const mapelId = searchParams.get("mapelId")
    const type = searchParams.get("type")
    const taId = searchParams.get("tahunAjaranId")
    const semId = searchParams.get("semesterId")

    let tahunAjaranId = taId
    let semesterId = semId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }
    if (!semesterId) {
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      semesterId = sem?.id ?? null
    }

    const where: any = {}
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (semesterId) where.semesterId = semesterId
    if (santriId) where.santriId = santriId
    if (kelasId) where.kelasId = kelasId
    if (mapelId) where.mapelId = mapelId
    if (type) where.type = type

    const kompetensiId = searchParams.get("kompetensiId")
    if (kompetensiId) where.kompetensiId = kompetensiId

    const nilai = await db.nilai.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true } },
        kelas: { select: { id: true, name: true, code: true } },
        mapel: { select: { id: true, name: true, code: true, kkm: true } },
        guru: { select: { name: true } },
        kompetensi: { select: { id: true, code: true, name: true, category: true } },
      },
      orderBy: [{ assessmentDate: "desc" }, { santri: { name: "asc" } }],
      take: 500,
    })
    return NextResponse.json({ data: nilai, total: nilai.length })
  } catch (error) {
    console.error("[nilai list] error:", error)
    return NextResponse.json({ error: "Gagal memuat nilai" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("nilai:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    // ── Validate body with Zod ─────────────────────────────────────
    const body = await validateBody(req, nilaiCreateSchema)
    if (!body.ok) return body.error
    const {
      santriId, kelasId: bodyKelasId, mapelId, guruId: bodyGuruId,
      kompetensiId: bodyKompetensiId, type, score,
      tahunAjaranId: bodyTA, semesterId: bodySem,
      notes, assessmentDate,
    } = body.data

    let tahunAjaranId: string | null | undefined = bodyTA
    let semesterId: string | null | undefined = bodySem
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }
    if (!semesterId) {
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      semesterId = sem?.id ?? null
    }
    if (!tahunAjaranId || !semesterId) {
      return NextResponse.json({ error: "Tahun ajaran/semester aktif tidak ditemukan" }, { status: 400 })
    }

    // V2 #6: Validate kompetensiId if provided (must belong to same mapel)
    let kompetensiId: string | null = null
    if (bodyKompetensiId) {
      const komp = await db.kompetensi.findFirst({
        where: { id: bodyKompetensiId, mapelId, isActive: true },
      })
      if (!komp) {
        return NextResponse.json({
          error: "Kompetensi tidak ditemukan atau bukan dari mapel ini",
        }, { status: 400 })
      }
      kompetensiId = komp.id
    }

    const existing = await db.nilai.findFirst({
      where: { santriId, mapelId, type, semesterId, tahunAjaranId },
    })
    let nilai
    if (existing) {
      nilai = await db.nilai.update({
        where: { id: existing.id },
        data: {
          score,
          notes: notes || null,
          guruId: bodyGuruId || existing.guruId,
          kompetensiId, // V2 #6: update kompetensi link
          assessmentDate: assessmentDate ?? new Date(),
        },
        include: { santri: true, mapel: true, kompetensi: { select: { code: true, name: true } } },
      })
      await logAudit(session, "UPDATE", "NILAI", nilai.id, {
        santri: nilai.santri.name, mapel: nilai.mapel.name, type, score,
      }, req)
    } else {
      // Fetch kelasId from santri record if not provided
      const kelasId = bodyKelasId
      if (!kelasId) {
        return NextResponse.json({ error: "Kelas wajib diisi untuk nilai baru" }, { status: 400 })
      }
      nilai = await db.nilai.create({
        data: {
          tahunAjaranId,
          semesterId,
          santriId,
          kelasId,
          mapelId,
          guruId: bodyGuruId || null,
          kompetensiId, // V2 #6: link to kompetensi
          type,
          score,
          notes: notes || null,
          assessmentDate: assessmentDate ?? new Date(),
        },
        include: { santri: true, mapel: true, kompetensi: { select: { code: true, name: true } } },
      })
      await logAudit(session, "CREATE", "NILAI", nilai.id, {
        santri: nilai.santri.name, mapel: nilai.mapel.name, type, score,
      }, req)
    }
    // V6: Auto-notify wali about nilai update
    await notifikasiNilaiUpdated(santriId, nilai.mapel?.name || "", score, nilai.id)

    return NextResponse.json({ data: nilai })
  } catch (error) {
    console.error("[nilai create] error:", error)
    return NextResponse.json({ error: "Gagal menyimpan nilai" }, { status: 500 })
  }
}
