import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const permissions = await db.permission.findMany({ orderBy: [{ module: "asc" }, { name: "asc" }] })
    return NextResponse.json({ data: permissions })
  } catch (error) {
    console.error("[permissions list] error:", error)
    return NextResponse.json({ error: "Gagal memuat permissions" }, { status: 500 })
  }
}
