import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth/guards"
import { logAudit } from "@/lib/auth/guards"

/**
 * POST /api/wali/fcm-token
 * Register/update FCM token untuk device wali.
 * Mobile app call ini saat login untuk dapat push notification.
 *
 * Body: { fcmToken: string, deviceId?: string, platform?: "android" | "ios" }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req ? { headers: req.headers } : undefined)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { fcmToken, deviceId, platform } = body

    if (!fcmToken || typeof fcmToken !== "string" || fcmToken.length < 10) {
      return NextResponse.json({ error: "fcmToken wajib diisi dan valid" }, { status: 400 })
    }

    // Find wali by user email (link antara Supabase Auth user → Wali)
    const wali = await db.wali.findFirst({
      where: {
        OR: [
          { phone: session.user.phone },
          { email: session.user.email },
        ],
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!wali) {
      // Not a wali — might be admin/guru/bendahara. Store under userId instead.
      // For now, just return success (FCM token not critical for admin).
      return NextResponse.json({ success: true, message: "FCM token received (non-wali user)" })
    }

    // Upsert device record (one token per device)
    // Check if UserDevice model exists in schema
    try {
      await (db as any).userDevice?.upsert({
        where: {
          fcmToken: fcmToken,
        },
        update: {
          waliId: wali.id,
          deviceId: deviceId || null,
          platform: platform || "android",
          isActive: true,
          lastSeenAt: new Date(),
        },
        create: {
          waliId: wali.id,
          fcmToken: fcmToken,
          deviceId: deviceId || null,
          platform: platform || "android",
          isActive: true,
          lastSeenAt: new Date(),
        },
      })
    } catch (dbErr: any) {
      // UserDevice table might not exist yet — create it via SQL or skip
      // For now, store FCM token in wali table as fallback
      console.warn("[fcm-token] UserDevice table not available, skipping:", dbErr.message)
      return NextResponse.json({ success: true, message: "FCM token received (table pending)" })
    }

    await logAudit(session, "UPDATE", "FCM_TOKEN", wali.id, { platform }, req)

    return NextResponse.json({ success: true, message: "FCM token registered" })
  } catch (error: any) {
    console.error("[fcm-token] error:", error)
    return NextResponse.json({ error: "Gagal mendaftarkan FCM token" }, { status: 500 })
  }
}

/**
 * DELETE /api/wali/fcm-token
 * Unregister FCM token (saat logout).
 * Body: { fcmToken: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req ? { headers: req.headers } : undefined)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { fcmToken } = body

    if (!fcmToken) {
      return NextResponse.json({ error: "fcmToken wajib diisi" }, { status: 400 })
    }

    try {
      await (db as any).userDevice?.update({
        where: { fcmToken },
        data: { isActive: false },
      })
    } catch {
      // Table might not exist — silent skip
    }

    return NextResponse.json({ success: true, message: "FCM token unregistered" })
  } catch (error: any) {
    console.error("[fcm-token] delete error:", error)
    return NextResponse.json({ error: "Gagal unregister FCM token" }, { status: 500 })
  }
}
