import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth } from "@/lib/auth/guards"

export async function GET(req: NextRequest) {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session
  try {
    const { searchParams } = new URL(req.url)
    const moduleParam = searchParams.get("module")
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")
    const limit = Math.min(Number(searchParams.get("limit") || "100"), 500)

    const where: any = {}
    if (moduleParam) where.module = moduleParam
    if (action) where.action = action
    if (userId) where.userId = userId

    const logs = await db.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({ data: logs, total: logs.length })
  } catch (error) {
    console.error("[audit-log list] error:", error)
    return NextResponse.json({ error: "Gagal memuat audit log" }, { status: 500 })
  }
}
