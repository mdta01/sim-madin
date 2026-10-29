import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("honor_guru:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const guruId = searchParams.get("guruId")
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
    if (guruId) where.guruId = guruId
    if (status) where.status = status

    const data = await db.honorGuru.findMany({
      where,
      include: {
        guru: { select: { id: true, name: true, nip: true, phone: true } },
        kas: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ periode: "desc" }, { guru: { name: "asc" } }],
      take: 500,
    })

    return NextResponse.json({ data, total: data.length })
  } catch (error) {
    console.error("[honor list] error:", error)
    return NextResponse.json({ error: "Gagal memuat honor guru" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("honor_guru:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.guruId || !body.periode || !body.periodeLabel) {
      return NextResponse.json({ error: "Guru, Periode, dan Label Periode wajib diisi" }, { status: 400 })
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

    // Compute total: mengajar + insentif + tunjangan - potongan
    const honorMengajar = Number(body.honorMengajar) || 0
    const insentif = Number(body.insentif) || 0
    const tunjangan = Number(body.tunjangan) || 0
    const potongan = Number(body.potongan) || 0
    const totalHonor = honorMengajar + insentif + tunjangan - potongan

    const honor = await db.honorGuru.create({
      data: {
        tahunAjaranId,
        semesterId,
        guruId: body.guruId,
        periode: body.periode,
        periodeLabel: body.periodeLabel,
        honorMengajar,
        insentif,
        tunjangan,
        potongan,
        totalHonor,
        status: body.status || "DRAFT",
        catatan: body.catatan || null,
      },
      include: { guru: { select: { name: true } } },
    })
    await logAudit(session, "CREATE", "HONOR_GURU", honor.id, {
      guru: honor.guru?.name, periode: honor.periode, totalHonor,
    }, req)
    return NextResponse.json({ data: honor })
  } catch (error) {
    console.error("[honor create] error:", error)
    return NextResponse.json({ error: "Gagal membuat honor guru" }, { status: 500 })
  }
}
