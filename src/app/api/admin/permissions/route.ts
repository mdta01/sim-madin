import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireApiAuth } from "@/lib/auth/guards"

export async function GET() {
  const guard = await requireApiAuth()
  if (guard.error) return guard.error
  try {
    const permissions = await db.permission.findMany({ orderBy: [{ module: "asc" }, { name: "asc" }] })
    return NextResponse.json({ data: permissions })
  } catch (error) {
    console.error("[permissions list] error:", error)
    return NextResponse.json({ error: "Gagal memuat permissions" }, { status: 500 })
  }
}
