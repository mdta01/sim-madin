import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth, logAudit } from "@/lib/auth/guards"
import bcrypt from "bcryptjs"

/**
 * GET /api/admin/me — ambil profil user yang sedang login (lengkap dengan roles, permissions)
 */
export async function GET() {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    })

    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })

    // Collect all permissions
    const permissions = new Set<string>()
    for (const ur of user.userRoles) {
      for (const rp of ur.role.permissions) {
        permissions.add(rp.permission.code)
      }
    }

    return NextResponse.json({
      data: {
        ...user,
        roles: user.userRoles.map(ur => ur.role.code),
        roleDetails: user.userRoles.map(ur => ({
          code: ur.role.code,
          name: ur.role.name,
          description: ur.role.description,
        })),
        permissions: Array.from(permissions),
      },
    })
  } catch (error) {
    console.error("[me get] error:", error)
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 })
  }
}

/**
 * PUT /api/admin/me — update profil sendiri (name, phone, avatar)
 * Bukan untuk password (lihat endpoint khusus di bawah)
 */
export async function PUT(req: NextRequest) {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const body = await req.json()
    const updateData: any = {}

    if (typeof body.name === "string" && body.name.trim()) updateData.name = body.name.trim()
    if (typeof body.phone === "string") updateData.phone = body.phone || null
    if (typeof body.avatarUrl === "string") updateData.avatarUrl = body.avatarUrl || null

    // Email & username change requires password verification (skip for MVP, just allow if not changed)
    if (body.email && body.email !== session.user.email) {
      // Require current password to change email
      if (!body.currentPassword) {
        return NextResponse.json({ error: "Verifikasi password diperlukan untuk mengubah email" }, { status: 400 })
      }
      const currentUser = await db.user.findUnique({ where: { id: session.user.id } })
      const valid = await bcrypt.compare(body.currentPassword, currentUser?.passwordHash || "")
      if (!valid) {
        return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 })
      }
      const existingEmail = await db.user.findUnique({ where: { email: body.email } })
      if (existingEmail) return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 })
      updateData.email = body.email
    }

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true, email: true, username: true, name: true,
        phone: true, avatarUrl: true, isActive: true,
      },
    })

    await logAudit(session, "UPDATE", "PROFILE", session.user.id, { changes: Object.keys(updateData) }, req)
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[me update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate profil" }, { status: 500 })
  }
}

/**
 * POST /api/admin/me/password — ubah password sendiri
 * Body: { currentPassword, newPassword }
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session

  try {
    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Password saat ini & baru wajib diisi" }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 })
    }

    const newHash = bcrypt.hashSync(newPassword, 10)
    await db.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    })

    await logAudit(session, "UPDATE", "PASSWORD", session.user.id, {}, req)
    return NextResponse.json({ success: true, message: "Password berhasil diubah" })
  } catch (error) {
    console.error("[me password] error:", error)
    return NextResponse.json({ error: "Gagal mengubah password" }, { status: 500 })
  }
}
