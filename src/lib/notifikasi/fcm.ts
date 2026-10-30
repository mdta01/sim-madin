/**
 * ============================================================================
 * FCM PUSH NOTIFICATION — Server-side sender untuk mobile apps
 * ============================================================================
 *
 * Mengirim push notification ke device wali/guru/bendahara/kepala
 * saat ada event penting (absensi ALFA, nilai baru, tagihan jatuh tempo, dll).
 *
 * Flow:
 *   1. Mobile app register FCM token saat login (POST /api/wali/fcm-token)
 *   2. Token disimpan di tabel UserDevice.fcmToken
 *   3. Saat notifikasi dibuat, helper ini kirim push ke semua device user
 *
 * Setup:
 *   - Firebase project dengan Cloud Messaging enabled
 *   - Server key di env: FCM_SERVER_KEY (legacy) atau service account JSON
 *
 * Catatan: Jika FCM belum dikonfigurasi, notifikasi tetap disimpan di DB
 * (Notifikasi table) — wali bisa lihat saat refresh. Push notification
 * adalah bonus layer untuk instant delivery.
 * ============================================================================
 */

interface FCMMessage {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

interface FCMSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Cek apakah FCM dikonfigurasi (FCM_SERVER_KEY di env)
 */
export function isFCMConfigured(): boolean {
  return !!process.env.FCM_SERVER_KEY
}

/**
 * Kirim push notification ke satu device via FCM HTTP v1 API.
 *
 * Uses Firebase Cloud Messaging REST API dengan server key.
 * Fallback: jika FCM tidak dikonfigurasi, return success=false (silent fail).
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<FCMSendResult> {
  if (!isFCMConfigured()) {
    // FCM not configured — silent skip (notifikasi tetap ada di DB)
    return { success: false, error: "FCM not configured" }
  }

  const serverKey = process.env.FCM_SERVER_KEY!

  try {
    const message: FCMMessage = {
      token,
      title,
      body,
      data: data || {},
    }

    // FCM Legacy HTTP API (simple, works with server key)
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: message.title,
          body: message.body,
          sound: "default",
          priority: "high",
        },
        data: {
          ...message.data,
          title: message.title,
          body: message.body,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        priority: "high",
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("[FCM] Send failed:", response.status, errText)
      return { success: false, error: `FCM HTTP ${response.status}: ${errText}` }
    }

    const result = await response.json()
    if (result.failure > 0) {
      const error = result.results?.[0]?.error || "Unknown FCM error"
      console.warn(`[FCM] Delivery failed for token ${token.slice(0, 20)}...: ${error}`)
      return { success: false, error }
    }

    return { success: true, messageId: result.message_id }
  } catch (err: any) {
    console.error("[FCM] Error:", err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Kirim push notification ke MULTIPLE devices (batch).
 * Lebih efisien daripada loop sendPushNotification per device.
 */
export async function sendPushBatch(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ sent: number; failed: number }> {
  if (!isFCMConfigured() || tokens.length === 0) {
    return { sent: 0, failed: 0 }
  }

  // FCM allows max 1000 registration_ids per request
  const batchSize = 1000
  let sent = 0
  let failed = 0

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize)
    const result = await sendPushBatchInternal(batch, title, body, data)
    sent += result.sent
    failed += result.failed
  }

  return { sent, failed }
}

async function sendPushBatchInternal(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ sent: number; failed: number }> {
  const serverKey = process.env.FCM_SERVER_KEY!

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: {
          title,
          body,
          sound: "default",
          priority: "high",
        },
        data: {
          ...data,
          title,
          body,
        },
        priority: "high",
      }),
    })

    if (!response.ok) {
      console.error("[FCM] Batch send failed:", response.status)
      return { sent: 0, failed: tokens.length }
    }

    const result = await response.json()
    const success = result.success || 0
    const failure = result.failure || 0
    return { sent: success, failed: failure }
  } catch (err: any) {
    console.error("[FCM] Batch error:", err.message)
    return { sent: 0, failed: tokens.length }
  }
}

/**
 * Kirim push notifikasi ke semua device milik satu wali.
 * Query tabel UserDevice untuk dapat semua FCM token wali.
 */
export async function sendPushToWali(
  waliId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ sent: number; failed: number }> {
  try {
    const { db } = await import("@/lib/db")

    // Get all active FCM tokens for this wali
    // UserDevice table stores fcmToken per device per user
    const devices = await (db as any).userDevice?.findMany({
      where: {
        waliId: waliId,
        isActive: true,
        fcmToken: { not: null },
      },
      select: { fcmToken: true },
    }) || []

    if (devices.length === 0) {
      // No registered devices — notifikasi tetap disimpan di DB, wali lihat saat refresh
      return { sent: 0, failed: 0 }
    }

    const tokens = devices.map((d: any) => d.fcmToken).filter(Boolean)
    return await sendPushBatch(tokens, title, body, data)
  } catch (err: any) {
    console.error("[FCM] sendPushToWali error:", err.message)
    return { sent: 0, failed: 0 }
  }
}
