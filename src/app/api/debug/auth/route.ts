import { NextRequest, NextResponse } from "next/server"
export async function GET(req: NextRequest) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    region: process.env.VERCEL_REGION || process.env.NOW_REGION || "unknown",
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 80) + "..." : "(not set)",
    },
  }
  return NextResponse.json(debug, { status: 200 })
}
export async function POST(req: NextRequest) {
  try {
    const { db } = await import("@/lib/db")
    const userCount = await db.user.count()
    return NextResponse.json({ dbConnection: "OK", userCount })
  } catch (e: any) {
    return NextResponse.json({ dbConnection: "FAILED", error: e.message }, { status: 500 })
  }
}
