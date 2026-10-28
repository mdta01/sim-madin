import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const userCount = await db.user.count()
    return NextResponse.json({
      step: "Prisma DB connection",
      success: true,
      userCount,
    })
  } catch (err: any) {
    return NextResponse.json({
      step: "Prisma DB connection",
      success: false,
      error: err.message,
    }, { status: 500 })
  }
}
