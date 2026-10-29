import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyWaliToken, verifyWaliSantriAccess } from "@/lib/wali/auth"

/**
 * GET /api/wali/ujian?santriId=xxx
 * List published ujian for santri's kelas in active TA/Semester.
 * Also returns sesi status if santri has started/submitted.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const session = verifyWaliToken(token)
    if (!session) return NextResponse.json({ error: "Token tidak valid" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const santriId = searchParams.get("santriId")
    if (!santriId) return NextResponse.json({ error: "santriId wajib diisi" }, { status: 400 })

    const access = await verifyWaliSantriAccess(session.waliId, santriId)
    if (!access.allowed) {
      return NextResponse.json({ error: "Forbidden", message: access.reason }, { status: 403 })
    }

    const santri = await db.santri.findUnique({
      where: { id: santriId, deletedAt: null, status: "AKTIF" },
      select: { id: true, name: true, kelasId: true },
    })
    if (!santri?.kelasId) return NextResponse.json({ data: [], total: 0 })

    const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
    const sem = await db.semester.findFirst({ where: { isActive: true } })
    if (!ta || !sem) return NextResponse.json({ data: [], total: 0 })

    const ujianList = await db.ujian.findMany({
      where: {
        kelasId: santri.kelasId,
        tahunAjaranId: ta.id,
        semesterId: sem.id,
        deletedAt: null,
        isPublished: true,
      },
      include: {
        mapel: { select: { id: true, name: true, code: true } },
        _count: { select: { soalLinks: true } },
        sesi: { where: { santriId }, select: { id: true, status: true, score: true, startTime: true, endTime: true } },
      },
      orderBy: { startTime: "desc" },
      take: 50,
    })

    const now = new Date()
    const enriched = ujianList.map((u) => {
      const sesi = ujianList.length > 0 ? u.sesi[0] : null
      const isUpcoming = new Date(u.startTime) > now
      const isOngoing = new Date(u.startTime) <= now && new Date(u.endTime) >= now
      const isCompleted = new Date(u.endTime) < now
      return {
        id: u.id,
        title: u.title,
        type: u.type,
        mapel: u.mapel,
        startTime: u.startTime,
        endTime: u.endTime,
        durationMnt: u.durationMnt,
        maxScore: u.maxScore,
        soalCount: u._count.soalLinks,
        status: isUpcoming ? "UPCOMING" : isOngoing ? "ONGOING" : "COMPLETED",
        sesi: sesi || null,
        canStart: isOngoing && !sesi,
        canResume: isOngoing && sesi?.status === "IN_PROGRESS",
        hasSubmitted: sesi?.status === "SUBMITTED" || sesi?.status === "GRADED",
      }
    })

    return NextResponse.json({ data: enriched, total: enriched.length })
  } catch (error) {
    console.error("[wali ujian list] error:", error)
    return NextResponse.json({ error: "Gagal memuat ujian" }, { status: 500 })
  }
}
