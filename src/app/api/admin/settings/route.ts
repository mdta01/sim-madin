import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth, logAudit } from "@/lib/auth/guards"

export async function GET() {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  try {
    const settings = await db.systemSetting.findMany()
    const obj: Record<string, string> = {}
    for (const s of settings) obj[s.key] = s.value
    return NextResponse.json({ data: obj })
  } catch (error) {
    console.error("[settings get] error:", error)
    return NextResponse.json({ error: "Gagal memuat settings" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  const session = guard.session
  if (!session.user.roles?.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Hanya Super Admin yang bisa mengubah settings" }, { status: 403 })
  }
  try {
    const body = await req.json()
    if (!body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ error: "Format settings tidak valid" }, { status: 400 })
    }
    for (const [key, value] of Object.entries(body.settings)) {
      const existing = await db.systemSetting.findUnique({ where: { key } })
      if (existing) {
        await db.systemSetting.update({ where: { key }, data: { value: String(value), updatedBy: session.user.id } })
      } else {
        await db.systemSetting.create({ data: { key, value: String(value), type: "STRING", updatedBy: session.user.id } })
      }
    }
    const all = await db.systemSetting.findMany()
    const obj: Record<string, string> = {}
    for (const s of all) obj[s.key] = s.value
    await logAudit(session, "UPDATE", "PENGATURAN", undefined, { keys: Object.keys(body.settings) }, req)
    return NextResponse.json({ data: obj })
  } catch (error) {
    console.error("[settings update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate settings" }, { status: 500 })
  }
}
