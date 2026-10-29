import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateGuruAccess } from "@/lib/auth/guru-access"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("perkembangan:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const severity = searchParams.get("severity")
    let tahunAjaranId = searchParams.get("tahunAjaranId")
    let semesterId = searchParams.get("semesterId")

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
    if (type) where.type = type
    if (status) where.status = status
    if (severity) where.severity = severity

    const data = await db.pembinaan.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
        guru: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { santri: { name: "asc" } }],
      take: 500,
    })
    return NextResponse.json({ data, total: data.length })
  } catch (error) {
    console.error("[pembinaan list] error:", error)
    return NextResponse.json({ error: "Gagal memuat pembinaan" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("perkembangan:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.santriId || !body.type || !body.title || !body.description) {
      return NextResponse.json({ error: "Santri, Tipe, Judul, dan Deskripsi wajib diisi" }, { status: 400 })
    }

    let tahunAjaranId = body.tahunAjaranId
    let semesterId = body.semesterId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id ?? null
    }
    if (!semesterId) {
      const sem = await db.semester.findFirst({ where: { isActive: true } })
      semesterId = sem?.id ?? null
    }

    const accessCheck = await validateGuruAccess(session, { guruId: body.guruId }, req)
    if (!accessCheck.allowed && accessCheck.error) return accessCheck.error
    let guruId = body.guruId
    if (!guruId && accessCheck.guru) guruId = accessCheck.guru.id

    const data = await db.pembinaan.create({
      data: {
        tahunAjaranId,
        semesterId,
        santriId: body.santriId,
        guruId,
        type: body.type,
        category: body.category || null,
        title: body.title,
        description: body.description,
        severity: body.severity || "RINGAN",
        tindakan: body.tindakan || null,
        status: body.status || "OPEN",
      },
      include: { santri: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "PEMBINAAN", data.id, {
      santri: data.santri?.name, type: data.type, title: data.title, severity: data.severity,
    }, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[pembinaan create] error:", error)
    return NextResponse.json({ error: "Gagal menambah pembinaan" }, { status: 500 })
  }
}
