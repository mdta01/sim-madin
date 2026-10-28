import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth, requireApiPermission, logAudit, type AppSession } from "@/lib/auth/guards"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("santri:read")
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const kelasId = searchParams.get("kelasId")
    const status = searchParams.get("status")
    const gender = searchParams.get("gender")

    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nis: { contains: search } },
        { nisn: { contains: search } },
      ]
    }
    if (kelasId) where.kelasId = kelasId
    if (status) where.status = status
    if (gender) where.gender = gender

    const santri = await db.santri.findMany({
      where,
      include: {
        kelas: { select: { id: true, name: true, code: true } },
        wali: { select: { id: true, name: true, phone: true, relationship: true } },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: santri, total: santri.length })
  } catch (error) {
    console.error("[santri list] error:", error)
    return NextResponse.json({ error: "Gagal memuat data santri" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("santri:create")
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const body = await req.json()
    const {
      nis, nisn, name, gender, birthPlace, birthDate, address, phone,
      waliId, kelasId, tahunAjaranId, entryDate, status, photoUrl,
    } = body

    if (!nis || !name || !gender) {
      return NextResponse.json({ error: "NIS, Nama, dan Jenis Kelamin wajib diisi" }, { status: 400 })
    }

    const existing = await db.santri.findFirst({
      where: { OR: [{ nis }, ...(nisn ? [{ nisn }] : [])] },
    })
    if (existing) {
      return NextResponse.json({ error: "NIS atau NISN sudah terdaftar" }, { status: 400 })
    }

    const santri = await db.santri.create({
      data: {
        nis, nisn: nisn || null,
        name, gender,
        birthPlace: birthPlace || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        address: address || null,
        phone: phone || null,
        photoUrl: photoUrl || null,
        waliId: waliId || null,
        kelasId: kelasId || null,
        tahunAjaranId: tahunAjaranId || null,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        status: status || "AKTIF",
      },
      include: { kelas: true, wali: true },
    })

    // Audit log
    await logAudit(session, "CREATE", "SANTRI", santri.id, { name: santri.name, nis: santri.nis }, req)

    return NextResponse.json({ data: santri })
  } catch (error) {
    console.error("[santri create] error:", error)
    return NextResponse.json({ error: "Gagal menambah santri" }, { status: 500 })
  }
}
