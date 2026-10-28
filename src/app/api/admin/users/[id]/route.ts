import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import bcrypt from "bcryptjs"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("user:read")
  if (guard.error) return guard.error
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
  const guard = await requireApiPermission("user:update")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: any = {}
    if (body.email !== undefined) updateData.email = body.email
    if (body.username !== undefined) updateData.username = body.username
    if (body.name !== undefined) updateData.name = body.name
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl

    // Jika password diberikan, hash ulang
    if (body.passwordHash || body.password) {
      const pwd = body.passwordHash || body.password
      updateData.passwordHash = bcrypt.hashSync(pwd, 10)
    }

    const updated = await db.user.update({ where: { id }, data: updateData })

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
    await logAudit(session, "UPDATE", "USER", id, {
      changes: Object.keys(updateData), rolesSynced: Array.isArray(body.roleIds),
    }, req)
    return NextResponse.json({ data: fullUser })
  } catch (error) {
    console.error("[users update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate user" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiPermission("user:delete")
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { id } = await params
    if (id === session.user.id) {
      return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 })
    }
    await db.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    await logAudit(session, "DELETE", "USER", id, {}, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[users delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus user" }, { status: 500 })
  }
}
