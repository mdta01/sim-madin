/**
 * ============================================================================
 * V6 — NOTIFIKASI AUTO-GENERATE HELPER
 * ============================================================================
 * Sesuai roadmap.pdf V6, sistem otomatis mengirim notifikasi ke wali saat:
 * - Absensi ALFA: "Ananda Ahmad tidak hadir hari ini."
 * - Tagihan jatuh tempo: "Tagihan Syahriyah belum dibayar."
 * - Ujian besok: "Besok terdapat ujian Fikih."
 * - Nilai diperbarui: "Nilai Fikih telah diperbarui."
 * - Rapor tersedia: "Rapor semester telah tersedia."
 * - Tugas baru: "Tugas baru telah diberikan."
 * ============================================================================
 */

import { db } from "@/lib/db"

interface CreateNotifikasiParams {
  waliId?: string | null
  santriId?: string | null
  type: string
  title: string
  message: string
  priority?: string
  entityType?: string
  entityId?: string
}

/**
 * Create a notification for a wali. Best-effort — failures don't break the caller.
 */
export async function createNotifikasi(params: CreateNotifikasiParams): Promise<void> {
  try {
    if (!params.waliId) return // skip if no target wali
    await db.notifikasi.create({
      data: {
        waliId: params.waliId,
        santriId: params.santriId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || "NORMAL",
        entityType: params.entityType || null,
        entityId: params.entityId || null,
      },
    })
  } catch (e) {
    console.warn("[notifikasi] create failed:", e)
  }
}

/**
 * Get waliId from santriId (primary wali).
 */
export async function getWaliIdFromSantri(santriId: string): Promise<string | null> {
  const link = await db.santriWali.findFirst({
    where: { santriId, canAccess: true, isPrimary: true },
    select: { waliId: true },
  })
  if (link) return link.waliId
  // fallback: any wali with access
  const fallback = await db.santriWali.findFirst({
    where: { santriId, canAccess: true },
    select: { waliId: true },
  })
  return fallback?.waliId || null
}

/**
 * V6 Trigger: Absensi ALFA
 * Call when absensi is recorded with status "ALFA".
 * Sends notification to santri's primary wali.
 */
export async function notifikasiAbsensiAlfa(santriId: string, date: Date): Promise<void> {
  const waliId = await getWaliIdFromSantri(santriId)
  if (!waliId) return

  const santri = await db.santri.findUnique({ where: { id: santriId }, select: { name: true } })
  if (!santri) return

  await createNotifikasi({
    waliId,
    santriId,
    type: "ABSENSI_ALFA",
    title: "Santri Tidak Hadir",
    message: `Ananda ${santri.name} tidak hadir hari ini (${date.toLocaleDateString("id-ID")}).`,
    priority: "URGENT",
    entityType: "ABSENSI",
    entityId: santriId,
  })
}

/**
 * V6 Trigger: Tagihan Jatuh Tempo
 * Call when tagihan due date is approaching (within 3 days).
 */
export async function notifikasiTagihanDue(santriId: string, jenisTagihanName: string, dueDate: Date, tagihanId: string): Promise<void> {
  const waliId = await getWaliIdFromSantri(santriId)
  if (!waliId) return

  const santri = await db.santri.findUnique({ where: { id: santriId }, select: { name: true } })
  if (!santri) return

  await createNotifikasi({
    waliId,
    santriId,
    type: "TAGIHAN_DUE",
    title: "Tagihan Jatuh Tempo",
    message: `Tagihan ${jenisTagihanName} ananda ${santri.name} jatuh tempo ${dueDate.toLocaleDateString("id-ID")}. Mohon segera dibayar.`,
    priority: "PENTING",
    entityType: "TAGIHAN",
    entityId: tagihanId,
  })
}

/**
 * V6 Trigger: Ujian Besok
 * Call when ujian is scheduled for tomorrow.
 */
export async function notifikasiUjianTomorrow(santriId: string, ujianTitle: string, mapelName: string, ujianId: string): Promise<void> {
  const waliId = await getWaliIdFromSantri(santriId)
  if (!waliId) return

  const santri = await db.santri.findUnique({ where: { id: santriId }, select: { name: true } })
  if (!santri) return

  await createNotifikasi({
    waliId,
    santriId,
    type: "UJIAN_TOMORROW",
    title: "Ujian Besok",
    message: `Besok terdapat ujian ${mapelName} ananda ${santri.name}. Persiapkan diri dengan baik.`,
    priority: "PENTING",
    entityType: "UJIAN",
    entityId: ujianId,
  })
}

/**
 * V6 Trigger: Nilai Diperbarui
 * Call when nilai is created/updated.
 */
export async function notifikasiNilaiUpdated(santriId: string, mapelName: string, score: number, nilaiId: string): Promise<void> {
  const waliId = await getWaliIdFromSantri(santriId)
  if (!waliId) return

  const santri = await db.santri.findUnique({ where: { id: santriId }, select: { name: true } })
  if (!santri) return

  await createNotifikasi({
    waliId,
    santriId,
    type: "NILAI_UPDATED",
    title: "Nilai Diperbarui",
    message: `Nilai ${mapelName} ananda ${santri.name} telah diperbarui: ${score}.`,
    priority: "NORMAL",
    entityType: "NILAI",
    entityId: nilaiId,
  })
}

/**
 * V6 Trigger: Rapor Tersedia
 * Call when rapor is published.
 */
export async function notifikasiRaporPublished(santriId: string, semesterName: string, raporId: string): Promise<void> {
  const waliId = await getWaliIdFromSantri(santriId)
  if (!waliId) return

  const santri = await db.santri.findUnique({ where: { id: santriId }, select: { name: true } })
  if (!santri) return

  await createNotifikasi({
    waliId,
    santriId,
    type: "RAPOR_PUBLISHED",
    title: "Rapor Tersedia",
    message: `Rapor semester ${semesterName} ananda ${santri.name} telah tersedia. Silakan lihat detail.`,
    priority: "PENTING",
    entityType: "RAPOR",
    entityId: raporId,
  })
}

/**
 * V6 Trigger: Tugas Baru
 * Call when tugas is created & published.
 */
export async function notifikasiTugasBaru(santriId: string, tugasTitle: string, mapelName: string, tugasId: string): Promise<void> {
  const waliId = await getWaliIdFromSantri(santriId)
  if (!waliId) return

  const santri = await db.santri.findUnique({ where: { id: santriId }, select: { name: true } })
  if (!santri) return

  await createNotifikasi({
    waliId,
    santriId,
    type: "TUGAS_BARU",
    title: "Tugas Baru",
    message: `Tugas ${mapelName} "${tugasTitle}" untuk ananda ${santri.name} telah diberikan.`,
    priority: "NORMAL",
    entityType: "TUGAS",
    entityId: tugasId,
  })
}

/**
 * V6 Trigger: Broadcast to all wali (for pengumuman)
 */
export async function notifikasiBroadcast(title: string, message: string, pengumumanId?: string): Promise<void> {
  const allWali = await db.wali.findMany({
    where: { deletedAt: null, activationStatus: "ACTIVE" },
    select: { id: true },
  })

  for (const wali of allWali) {
    await createNotifikasi({
      waliId: wali.id,
      type: "PENGUMUMAN",
      title,
      message,
      priority: "NORMAL",
      entityType: "PENGUMUMAN",
      entityId: pengumumanId,
    })
  }
}
