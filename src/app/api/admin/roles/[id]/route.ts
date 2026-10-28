import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth, logAudit } from "@/lib/auth/guards"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session
  if (!session.user.roles?.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Hanya Super Admin yang bisa mengelola role" }, { status: 403 })
  }
  try {
    const { id } = await params
    const body = await req.json()
    const role = await db.role.findUnique({ where: { id } })
    if (!role) return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 404 })
    if (role.isSystem && body.code && body.code !== role.code) {
      return NextResponse.json({ error: "Kode role sistem tidak boleh diubah" }, { status: 400 })
    }

    const updated = await db.role.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    })

    if (Array.isArray(body.permissionIds)) {
      await db.rolePermission.deleteMany({ where: { roleId: id } })
      for (const pid of body.permissionIds) {
        await db.rolePermission.create({ data: { roleId: id, permissionId: pid } })
      }
    }

    const full = await db.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } }, _count: { select: { userRoles: true } } },
    })
    await logAudit(session, "UPDATE", "ROLE", id, {
      name: body.name, permissionsSynced: Array.isArray(body.permissionIds),
    }, req)
    return NextResponse.json({ data: full })
  } catch (error) {
    console.error("[roles update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate role" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session
  if (!session.user.roles?.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Hanya Super Admin yang bisa mengelola role" }, { status: 403 })
  }
  try {
    const { id } = await params
    const role = await db.role.findUnique({ where: { id } })
    if (!role) return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 404 })
    if (role.isSystem) return NextResponse.json({ error: "Role sistem tidak boleh dihapus" }, { status: 400 })

    await db.role.delete({ where: { id } })
    await logAudit(session, "DELETE", "ROLE", id, { code: role.code }, req)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[roles delete] error:", error)
    return NextResponse.json({ error: "Gagal menghapus role" }, { status: 500 })
  }
}
