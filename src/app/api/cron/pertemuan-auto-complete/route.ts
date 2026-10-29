import { NextRequest, NextResponse } from "next/server"
import { markOverduePertemuanCompleted } from "@/lib/pertemuan/auto-complete"

/**
 * GET /api/cron/pertemuan-auto-complete?key=xxx
 *
 * Cron-friendly endpoint to auto-mark overdue pertemuan as completed.
 * Can be scheduled via Vercel Cron, EasyCron, or any external scheduler.
 *
 * Security: requires CRON_SECRET env var to match `key` query param.
 * If CRON_SECRET is not set, falls back to deny-by-default.
 *
 * Vercel cron config (vercel.json):
 *   {
 *     "crons": [
 *       { "path": "/api/cron/pertemuan-auto-complete", "schedule": "0 * * * *" }
 *     ]
 *   }
 */
export async function GET(req: NextRequest) {
  // Verify secret
  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")
  const expectedKey = process.env.CRON_SECRET

  if (!expectedKey) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 503 },
    )
  }
  if (key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await markOverduePertemuanCompleted({
      olderThanHours: 24,
      limit: 500,
    })

    return NextResponse.json({
      success: true,
      processedAt: new Date().toISOString(),
      ...result,
    })
  } catch (error: any) {
    console.error("[cron pertemuan-auto-complete] error:", error)
    return NextResponse.json(
      { error: "Cron job failed", message: error.message },
      { status: 500 },
    )
  }
}
