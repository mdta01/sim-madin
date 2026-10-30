import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { validateBody } from "@/lib/validation/helpers"
import { mapelCreateSchema } from "@/lib/validation/akademik"

// mapelCreateSchema belum mencakup `category` (wajib di Prisma), `durationMnt`,
// dan `sortOrder` (punya default Prisma). Kita extend di sini agar client
// tetap bisa mengirim field-field tersebut dengan validasi Zod yang konsisten.
// TODO: pindahkan extend ini ke src/lib/validation/akademik.ts agar reusable.
const routeMapelCreateSchema = mapelCreateSchema.extend({
  code: z
    .string()
    .trim()
    .min(1, "Kode wajib diisi")
    .max(20, "Kode maksimal 20 karakter")
    .regex(/^[A-Z0-9-]+$/, "Kode hanya boleh huruf besar, angka, dan tanda hubung"),
  category: z
    .string()
    .trim()
    .min(1, "Kategori wajib diisi")
    .max(50, "Kategori maksimal 50 karakter"),
  durationMnt: z
    .number()
    .int()
    .min(1, "Durasi minimal 1 menit")
    .max(300, "Durasi maksimal 300 menit")
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("mapel:read", req)
  if (guard.error) return guard.error
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const category = searchParams.get("category")
    const where: any = { deletedAt: null, isActive: true }
    if (search) where.name = { contains: search }
    if (category) where.category = category

    const mapel = await db.mataPelajaran.findMany({
      where,
      include: { _count: { select: { jadwal: true, nilai: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
    return NextResponse.json({ data: mapel, total: mapel.length })
  } catch (error) {
    console.error("[mapel list] error:", error)
    return NextResponse.json({ error: "Gagal memuat data mata pelajaran" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireApiPermission("mapel:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await validateBody(req, routeMapelCreateSchema)
    if (!body.ok) return body.error
    const { code, name, category, description, kkm, durationMnt, sortOrder, isActive } = body.data
    const existing = await db.mataPelajaran.findFirst({ where: { code } })
    if (existing) return NextResponse.json({ error: "Kode mapel sudah terdaftar" }, { status: 400 })

    const mapel = await db.mataPelajaran.create({
      data: {
        code,
        name,
        category,
        description: description || null,
        kkm,
        durationMnt: durationMnt ?? undefined,
        sortOrder: sortOrder ?? undefined,
        isActive,
      },
    })
    await logAudit(session, "CREATE", "MAPEL", mapel.id, { code: mapel.code, name: mapel.name }, req)
    return NextResponse.json({ data: mapel })
  } catch (error) {
    console.error("[mapel create] error:", error)
    return NextResponse.json({ error: "Gagal menambah mapel" }, { status: 500 })
  }
}
