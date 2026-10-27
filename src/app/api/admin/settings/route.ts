import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
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
  try {
    const body = await req.json() // { settings: { KEY: value, ... } }
    if (!body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ error: "Format settings tidak valid" }, { status: 400 })
    }
    for (const [key, value] of Object.entries(body.settings)) {
      const existing = await db.systemSetting.findUnique({ where: { key } })
      if (existing) {
        await db.systemSetting.update({ where: { key }, data: { value: String(value) } })
      } else {
        await db.systemSetting.create({ data: { key, value: String(value), type: "STRING" } })
      }
    }
    const all = await db.systemSetting.findMany()
    const obj: Record<string, string> = {}
    for (const s of all) obj[s.key] = s.value
    return NextResponse.json({ data: obj })
  } catch (error) {
    console.error("[settings update] error:", error)
    return NextResponse.json({ error: "Gagal mengupdate settings" }, { status: 500 })
  }
}
