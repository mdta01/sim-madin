import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const isActive = searchParams.get("isActive")

    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { username: { contains: search } }]
    }
    if (isActive !== null && isActive !== undefined && isActive !== "") where.isActive = isActive === "true"

    const users = await db.user.findMany({
      where,
      include: {
        userRoles: { include: { role: true } },
        santri: { select: { id: true, name: true } },
        guru: { select: { id: true, name: true } },
        wali: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ data: users, total: users.length })
  } catch (error) {
    console.error("[users list] error:", error)
    return NextResponse.json({ error: "Gagal memuat user" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.email || !body.username || !body.name) {
      return NextResponse.json({ error: "Email, Username, dan Nama wajib diisi" }, { status: 400 })
    }
    const existingEmail = await db.user.findUnique({ where: { email: body.email } })
    if (existingEmail) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 })
    const existingUsername = await db.user.findUnique({ where: { username: body.username } })
    if (existingUsername) return NextResponse.json({ error: "Username sudah terdaftar" }, { status: 400 })

    const user = await db.user.create({
      data: {
        email: body.email,
        username: body.username,
        name: body.name,
        phone: body.phone || null,
        passwordHash: body.passwordHash || "$2a$10$placeholder_hash_will_be_replaced",
        isActive: body.isActive !== false,
      },
    })

    // Assign roles
    if (body.roleIds && Array.isArray(body.roleIds) && body.roleIds.length > 0) {
      for (const roleId of body.roleIds) {
        await db.userRole.create({ data: { userId: user.id, roleId } })
      }
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      include: { userRoles: { include: { role: true } } },
    })
    return NextResponse.json({ data: fullUser })
  } catch (error) {
    console.error("[users create] error:", error)
    return NextResponse.json({ error: "Gagal menambah user" }, { status: 500 })
  }
}
