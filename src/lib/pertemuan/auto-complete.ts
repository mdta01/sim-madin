import { db } from "@/lib/db"

/**
 * ============================================================================
 * AUTO-MARK PERTEMUAN COMPLETED — V2 Data Hygiene
 * ============================================================================
 * Strategy: compute-on-read (no cron job needed for low-traffic apps).
 *
 * When `isCompleted=false` but pertemuan date is more than 24 hours past,
 * auto-mark as completed on next read.
 *
 * This is called from:
 * - GET /api/admin/pertemuan (list endpoint)
 * - GET /api/admin/pertemuan/[id] (detail endpoint)
 *
 * For high-traffic, can be moved to a Vercel Cron route that runs hourly:
 *   GET /api/cron/pertemuan-auto-complete?key=xxx
 *
 * Returns: count of pertemuan that were auto-completed in this pass.
 * ============================================================================
 */

export async function markOverduePertemuanCompleted(opts?: {
  olderThanHours?: number
  limit?: number
}): Promise<{ count: number; ids: string[] }> {
  const olderThanHours = opts?.olderThanHours ?? 24
  const limit = opts?.limit ?? 200

  const cutoff = new Date(Date.now() - olderThanHours * 3600000)

  // Find pertemuan that:
  // - isCompleted = false
  // - date is older than cutoff (24h ago)
  // - still within active TA (don't touch archived periods)
  const ta = await db.tahunAjaran.findFirst({ where: { isActive: true } })
  if (!ta) return { count: 0, ids: [] }

  const overdue = await db.pertemuan.findMany({
    where: {
      isCompleted: false,
      date: { lt: cutoff },
      tahunAjaranId: ta.id,
    },
    select: { id: true, pertemuanKe: true, kelasId: true, mapelId: true },
    take: limit,
  })

  if (overdue.length === 0) return { count: 0, ids: [] }

  // Bulk update to isCompleted = true
  const ids = overdue.map((p) => p.id)
  await db.pertemuan.updateMany({
    where: { id: { in: ids } },
    data: { isCompleted: true },
  })

  // Optional: log untuk audit (low-cost, batched)
  console.log(`[auto-complete] Marked ${ids.length} pertemuan as completed (date < ${cutoff.toISOString()})`)

  return { count: ids.length, ids }
}

/**
 * Background-safe version: catches errors silently.
 * Use this in GET handlers so failures don't break user-facing requests.
 */
export async function markOverduePertemuanCompletedSafe(): Promise<void> {
  try {
    await markOverduePertemuanCompleted()
  } catch (e) {
    console.warn("[auto-complete] failed silently:", e)
  }
}
