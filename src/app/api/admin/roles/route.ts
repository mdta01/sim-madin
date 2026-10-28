import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth, logAudit } from "@/lib/auth/guards"

export async function GET() {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  try {
    const roles = await db.role.findMany({
      include: {
        _count: { select: { userRoles: true, permissions: true } },
        permissions: { include: { permission: true } },
      },
      orderBy: { sortOrder: "asc" },
    })
    return NextResponse.json({ data: roles })
  } catch (error) {
    console.error("[roles list] error:", error)
    return NextResponse.json({ error: "Gagal memuat roles" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Hanya super admin yang bisa kelola role
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session
  if (!session.user.roles?.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Hanya Super Admin yang bisa mengelola role" }, { status: 403 })
  }
  try {
    const body = await req.json()
    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Kode dan Nama wajib diisi" }, { status: 400 })
    }
    const existing = await db.role.findUnique({ where: { code: body.code } })
    if (existing) return NextResponse.json({ error: "Kode role sudah ada" }, { status: 400 })

    const role = await db.role.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description || null,
        sortOrder: body.sortOrder || 99,
        isSystem: false,
      },
    })

    if (body.permissionIds && Array.isArray(body.permissionIds)) {
      for (const pid of body.permissionIds) {
        await db.rolePermission.create({ data: { roleId: role.id, permissionId: pid } })
      }
    }

    const full = await db.role.findUnique({ where: { id: role.id }, include: { permissions: { include: { permission: true } } } })
    await logAudit(session, "CREATE", "ROLE", role.id, { code: role.code, name: role.name }, req)
    return NextResponse.json({ data: full })
  } catch (error) {
    console.error("[roles create] error:", error)
    return NextResponse.json({ error: "Gagal menambah role" }, { status: 500 })
  }
}
