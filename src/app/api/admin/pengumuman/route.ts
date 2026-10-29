import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiPermission, logAudit } from "@/lib/auth/guards"
import { notifikasiBroadcast } from "@/lib/notifikasi/helper"

export async function GET(req: NextRequest) {
  const guard = await requireApiPermission("pengumuman:read", req)
  if (guard.error) return guard.error
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
  const guard = await requireApiPermission("pengumuman:create", req)
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const body = await req.json()
    if (!body.title || !body.content || !body.audience) {
      return NextResponse.json({ error: "Judul, Konten, dan Target wajib diisi" }, { status: 400 })
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
        createdById: session.user.id,
      },
    })
    await logAudit(session, "CREATE", "PENGUMUMAN", ann.id, { title: ann.title, audience: ann.audience }, req)
    // V6: Auto-notify all wali about new pengumuman
    if (ann.isPublished) {
      await notifikasiBroadcast(ann.title, ann.content.slice(0, 200), ann.id)
    }

    return NextResponse.json({ data: ann })
  } catch (error) {
    console.error("[pengumuman create] error:", error)
    return NextResponse.json({ error: "Gagal menambah pengumuman" }, { status: 500 })
  }
}
