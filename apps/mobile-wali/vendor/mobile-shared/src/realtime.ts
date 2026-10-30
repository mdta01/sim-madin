/**
 * ============================================================================
 * REALTIME HELPER — Supabase Realtime subscriptions untuk mobile apps
 * ============================================================================
 *
 * Subscribe ke DB table changes via Supabase Realtime WebSocket.
 * Auto-trigger callback saat INSERT/UPDATE/DELETE terjadi di tabel target.
 *
 * Usage:
 *   import { subscribeToTable, subscribeToNotifikasi } from "@/lib/realtime"
 *
 *   useEffect(() => {
 *     const unsub = subscribeToNotifikasi(waliId, (payload) => {
 *       console.log("New notifikasi:", payload.new)
 *       setNotifikasi(prev => [payload.new, ...prev])
 *     })
 *     return () => unsub()
 *   }, [waliId])
 * ============================================================================
 */

import type { SupabaseClient } from "@supabase/supabase-js"

type RealtimeCallback<T = any> = (payload: {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new: T
  old: T | null
  errors: string[] | null
}) => void

/**
 * Get the Supabase client from mobile-shared (singleton).
 * Returns null if not configured.
 */
async function getSupabase(): Promise<SupabaseClient | null> {
  const { getMobileSupabase } = await import("./index")
  return getMobileSupabase()
}

/**
 * Subscribe to a specific table with optional filter.
 *
 * @param table    Prisma table name (e.g. "Notifikasi", "Nilai", "Absensi")
 * @param callback Called on every INSERT/UPDATE/DELETE
 * @param filter   Optional Postgres filter (e.g. "wali_id=eq.xxx")
 * @returns        Unsubscribe function
 *
 * @example
 *   const unsub = subscribeToTable("Notifikasi", (payload) => {
 *     if (payload.eventType === "INSERT") {
 *       showPushNotification(payload.new)
 *     }
 *   }, `wali_id=eq.${waliId}`)
 */
export async function subscribeToTable<T = any>(
  table: string,
  callback: RealtimeCallback<T>,
  filter?: string,
): Promise<() => void> {
  const supabase = await getSupabase()
  if (!supabase) {
    console.warn("[realtime] Supabase not configured, skipping subscription")
    return () => {}
  }

  const channelName = `realtime:${table}:${filter || "all"}`
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: table,
        ...(filter ? { filter } : {}),
      },
      (payload: any) => {
        callback({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          errors: payload.errors,
        })
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to Notifikasi table for a specific wali.
 * Triggers callback when new notifikasi is created for this wali.
 *
 * @param waliId   Wali ID
 * @param callback Called on INSERT (new notifikasi)
 * @returns        Unsubscribe function
 */
export async function subscribeToNotifikasi(
  waliId: string,
  callback: (notifikasi: any) => void,
): Promise<() => void> {
  return subscribeToTable(
    "Notifikasi",
    (payload) => {
      if (payload.eventType === "INSERT") {
        callback(payload.new)
      }
    },
    `wali_id=eq.${waliId}`,
  )
}

/**
 * Subscribe to Nilai table for a specific santri.
 * Triggers callback when new nilai is added or updated.
 *
 * @param santriId Santri ID
 * @param callback Called on INSERT/UPDATE
 */
export async function subscribeToNilai(
  santriId: string,
  callback: (nilai: any) => void,
): Promise<() => void> {
  return subscribeToTable(
    "Nilai",
    (payload) => {
      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
        callback(payload.new)
      }
    },
    `santri_id=eq.${santriId}`,
  )
}

/**
 * Subscribe to Absensi table for a specific santri.
 * Triggers callback when absensi is recorded (especially ALFA).
 */
export async function subscribeToAbsensi(
  santriId: string,
  callback: (absensi: any) => void,
): Promise<() => void> {
  return subscribeToTable(
    "Absensi",
    (payload) => {
      if (payload.eventType === "INSERT") {
        callback(payload.new)
      }
    },
    `santri_id=eq.${santriId}`,
  )
}

/**
 * Subscribe to ChatMessage table for a specific chat room.
 * Triggers callback when new message is posted in the room.
 *
 * @param roomId   Chat room ID
 * @param callback Called on INSERT (new message)
 */
export async function subscribeToChatMessages(
  roomId: string,
  callback: (message: any) => void,
): Promise<() => void> {
  return subscribeToTable(
    "ChatMessage",
    (payload) => {
      if (payload.eventType === "INSERT") {
        callback(payload.new)
      }
    },
    `room_id=eq.${roomId}`,
  )
}

/**
 * Subscribe to Tagihan table for a specific santri.
 * Triggers callback when tagihan status changes (BELUM_BAYAR → LUNAS).
 */
export async function subscribeToTagihan(
  santriId: string,
  callback: (tagihan: any) => void,
): Promise<() => void> {
  return subscribeToTable(
    "Tagihan",
    (payload) => {
      if (payload.eventType === "UPDATE") {
        callback(payload.new)
      }
    },
    `santri_id=eq.${santriId}`,
  )
}
