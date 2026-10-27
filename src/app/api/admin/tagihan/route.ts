import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    const kelasId = searchParams.get("kelasId")
    const status = searchParams.get("status")
    const taId = searchParams.get("tahunAjaranId")

    let tahunAjaranId = taId
    if (!tahunAjaranId) {
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      tahunAjaranId = ta?.id
    }

    const where: any = {}
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (santriId) where.santriId = santriId
    if (kelasId) where.kelasId = kelasId
    if (status) where.status = status

    const tagihan = await db.tagihan.findMany({
      where,
      include: {
        santri: { select: { id: true, name: true, nis: true } },
        kelas: { select: { id: true, name: true, code: true } },
        jenisTagihan: true,
        _count: { select: { payments: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { santri: { name: "asc" } }],
      take: 500,
    })
    return NextResponse.json({ data: tagihan, total: tagihan.length })
  } catch (error) {
    console.error("[tagihan list] error:", error)
    return NextResponse.json({ error: "Gagal memuat tagihan" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Bulk generate: { kelasId, jenisTagihanId, amount, description, dueDate, santriIds? }
    if (body.bulk) {
      const { kelasId, jenisTagihanId, amount, description, dueDate, santriIds } = body
      if (!jenisTagihanId || !amount) {
        return NextResponse.json({ error: "Jenis tagihan dan nominal wajib diisi" }, { status: 400 })
      }
      const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
      if (!ta) return NextResponse.json({ error: "Tidak ada tahun ajaran aktif" }, { status: 400 })

      const santriList = santriIds && santriIds.length > 0
        ? await db.santri.findMany({ where: { id: { in: santriIds }, deletedAt: null, status: "AKTIF" } })
        : await db.santri.findMany({ where: { kelasId, deletedAt: null, status: "AKTIF" } })

      const created = []
      for (const santri of santriList) {
        const t = await db.tagihan.create({
          data: {
            tahunAjaranId: ta.id,
            santriId: santri.id,
            kelasId: santri.kelasId,
            jenisTagihanId,
            amount: Number(amount),
            description: description || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: "BELUM_BAYAR",
          },
        })
        created.push(t)
      }
      return NextResponse.json({ data: created, count: created.length })
    }

    // Single create
    if (!body.santriId || !body.jenisTagihanId || !body.amount) {
      return NextResponse.json({ error: "Santri, Jenis Tagihan, dan Nominal wajib diisi" }, { status: 400 })
    }
    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    if (!ta) return NextResponse.json({ error: "Tidak ada tahun ajaran aktif" }, { status: 400 })

    const tagihan = await db.tagihan.create({
      data: {
        tahunAjaranId: ta.id,
        santriId: body.santriId,
        kelasId: body.kelasId || null,
        jenisTagihanId: body.jenisTagihanId,
        amount: Number(body.amount),
        description: body.description || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: body.status || "BELUM_BAYAR",
      },
      include: { santri: true, jenisTagihan: true },
    })
    return NextResponse.json({ data: tagihan })
  } catch (error) {
    console.error("[tagihan create] error:", error)
    return NextResponse.json({ error: "Gagal membuat tagihan" }, { status: 500 })
  }
}
