import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/debug/auth — temporary debug endpoint to diagnose auth issues
 * Will be deleted after fix.
 */
export async function GET(req: NextRequest) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    headers: {
      authorization: req.headers.get("authorization")?.slice(0, 30) + "...",
    },
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "(not set)",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "(set, length: " + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ")" : "(not set)",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "(set, length: " + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ")" : "(not set)",
      DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 80) + "..." : "(not set)",
      DIRECT_URL: process.env.DIRECT_URL ? process.env.DIRECT_URL.slice(0, 80) + "..." : "(not set)",
    },
    supabaseConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  // Check if env vars look like encrypted blobs (Vercel encryption artifact)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (serviceRoleKey) {
    debug.serviceRoleAnalysis = {
      length: serviceRoleKey.length,
      startsWith: serviceRoleKey.slice(0, 10),
      looksLikeJWT: serviceRoleKey.startsWith("eyJ"),
      looksLikeEncrypted: serviceRoleKey.startsWith("eyJ2IjoidjIi"),
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  if (supabaseUrl) {
    debug.supabaseUrlAnalysis = {
      value: supabaseUrl,
      looksLikeUrl: supabaseUrl.startsWith("https://"),
      looksLikeEncrypted: supabaseUrl.startsWith("eyJ2IjoidjIi"),
    }
  }

  return NextResponse.json(debug, { status: 200 })
}


// Add DB connection test
export async function POST(req: NextRequest) {
  try {
    const { db } = await import("@/lib/db")
    const userCount = await db.user.count()
    return NextResponse.json({
      dbConnection: "OK",
      userCount,
      databaseUrlPrefix: process.env.DATABASE_URL?.slice(0, 40),
    })
  } catch (e: any) {
    return NextResponse.json({
      dbConnection: "FAILED",
      error: e.message,
      errorCode: e.code,
    }, { status: 500 })
  }
}
