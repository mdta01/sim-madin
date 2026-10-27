import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const audience = searchParams.get("audience")
    const priority = searchParams.get("priority")
    const where: any = { isPublished: true }
    if (audience) where.audience = audience
    if (priority) where.priority = priority

    const announcements = await db.announcement.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ publishedAt: "desc" }],
      take: 100,
    })
    return NextResponse.json({ data: announcements, total: announcements.length })
  } catch (error) {
    console.error("[pengumuman list] error:", error)
    return NextResponse.json({ error: "Gagal memuat pengumuman" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.title || !body.content || !body.audience) {
      return NextResponse.json({ error: "Judul, Konten, dan Target wajib diisi" }, { status: 400 })
    }

    // Get first admin user as createdBy fallback
    let createdById = body.createdById
    if (!createdById) {
      const adminUser = await db.user.findFirst({
        where: { userRoles: { some: { role: { code: "SUPER_ADMIN" }, isActive: true } } },
      })
      createdById = adminUser?.id
    }

    const ann = await db.announcement.create({
      data: {
        title: body.title,
        content: body.content,
        audience: body.audience,
        kelasId: body.kelasId || null,
        priority: body.priority || "NORMAL",
        isPublished: body.isPublished !== false,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        createdById,
      },
    })
    return NextResponse.json({ data: ann })
  } catch (error) {
    console.error("[pengumuman create] error:", error)
    return NextResponse.json({ error: "Gagal menambah pengumuman" }, { status: 500 })
  }
}
