import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        santri: true, guru: true, wali: true,
      },
    })
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ data: user })
  } catch (error) {
    console.error("[users get] error:", error)
    return NextResponse.json({ error: "Gagal memuat detail user" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // Update user basic info
    const updated = await db.user.update({
      where: { id },
      data: {
        ...(body.email && { email: body.email }),
        ...(body.username && { username: body.username }),
        ...(body.name && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.passwordHash && { passwordHash: body.passwordHash }),
      },
    })

    // Sync roles: if roleIds provided, replace all
    if (Array.isArray(body.roleIds)) {
      await db.userRole.deleteMany({ where: { userId: id } })
      for (const roleId of body.roleIds) {
        await db.userRole.upsert({
          where: { userId_roleId: { userId: id, roleId } },
          update: { isActive: true },
          create: { userId: id, roleId },
        })
      }
    }

    const fullUser = await db.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    })
    return NextResponse.json({ data: fullUser })
  } catch (error) {
    console.error("[users update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate user" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[users delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus user" }, { status: 500 })
  }
}
