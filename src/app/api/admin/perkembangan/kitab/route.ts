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

    const data = await db.hafalanKitab.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true, photoUrl: true } },
        guru: { select: { id: true, name: true } },
      },
      orderBy: [{ pertemuanDate: "desc" }, { santri: { name: "asc" } }],
      take: 500,
    })
    return NextResponse.json({ data, total: data.length })
  } catch (error) {
    console.error("[kitab list] error:", error)
    return NextResponse.json({ error: "Gagal memuat hafalan kitab" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("perkembangan:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.santriId || !body.type || !body.kitabName) {
      return NextResponse.json({ error: "Santri, Tipe, dan Nama Kitab wajib diisi" }, { status: 400 })
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

    const data = await db.hafalanKitab.create({
      data: {
        tahunAjaranId,
        semesterId,
        santriId: body.santriId,
        guruId,
        type: body.type,
        kitabName: body.kitabName,
        halaman: body.halaman || null,
        score: body.score || null,
        status: body.status || "PROGRESS",
        target: body.target || null,
        catatan: body.catatan || null,
        pertemuanDate: body.pertemuanDate ? new Date(body.pertemuanDate) : new Date(),
      },
      include: { santri: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "HAFALAN_KITAB", data.id, {
      santri: data.santri?.name, type: data.type, kitabName: data.kitabName,
    }, req)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[kitab create] error:", error)
    return NextResponse.json({ error: "Gagal menambah hafalan kitab" }, { status: 500 })
  }
}
