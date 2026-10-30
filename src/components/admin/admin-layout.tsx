"use client"

import { lazy, Suspense } from "react"
import { useAdminStore } from "@/stores/admin-store"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { PageSkeleton } from "./shared/skeletons"

/**
 * ============================================================================
 * ADMIN LAYOUT — Code-split view loading for performance
 * ============================================================================
 *
 * Why React.lazy + Suspense?
 *   - Before: all 34 admin views were eagerly imported, meaning the initial
 *     JS bundle included EVERY view's code (charts, forms, tables, dialogs).
 *   - After: only the active view's chunk is loaded on-demand. Initial page
 *     paint drops significantly, and navigation between views is fast (lazy
 *     chunks are typically <10 KB each, cached after first load).
 *
 * Suspense fallback uses PageSkeleton (not just a spinner) so the user sees
 * a matching layout skeleton — better perceived loading.
 *
 * Note: dashboard view stays eager-loaded because it's the default landing
 * view and we want zero-latency on first paint.
 * ============================================================================
 */

// Dashboard — eager-loaded (default landing view, zero-latency expected)
import { DashboardView } from "./views/dashboard-view"

// All other views — lazy-loaded on demand
const TahunAjaranView = lazy(() => import("./views/tahun-ajaran-view").then(m => ({ default: m.TahunAjaranView })))
const WaliView = lazy(() => import("./views/wali-view").then(m => ({ default: m.WaliView })))
const SantriView = lazy(() => import("./views/santri-view").then(m => ({ default: m.SantriView })))
const GuruView = lazy(() => import("./views/guru-view").then(m => ({ default: m.GuruView })))
const KelasView = lazy(() => import("./views/kelas-view").then(m => ({ default: m.KelasView })))
const MapelView = lazy(() => import("./views/mapel-view").then(m => ({ default: m.MapelView })))
const JadwalView = lazy(() => import("./views/jadwal-view").then(m => ({ default: m.JadwalView })))
const AbsensiView = lazy(() => import("./views/absensi-view").then(m => ({ default: m.AbsensiView })))
const NilaiView = lazy(() => import("./views/nilai-view").then(m => ({ default: m.NilaiView })))
const RaporView = lazy(() => import("./views/rapor-view").then(m => ({ default: m.RaporView })))
const TagihanView = lazy(() => import("./views/tagihan-view").then(m => ({ default: m.TagihanView })))
const PembayaranView = lazy(() => import("./views/pembayaran-view").then(m => ({ default: m.PembayaranView })))
const PengumumanView = lazy(() => import("./views/pengumuman-view").then(m => ({ default: m.PengumumanView })))
const UsersView = lazy(() => import("./views/users-view").then(m => ({ default: m.UsersView })))
const PengaturanView = lazy(() => import("./views/pengaturan-view").then(m => ({ default: m.PengaturanView })))
const ProfileView = lazy(() => import("./views/profile-view").then(m => ({ default: m.ProfileView })))
const AuditLogView = lazy(() => import("./views/audit-log-view").then(m => ({ default: m.AuditLogView })))
// V2 — Akademik & Pembelajaran
const MateriView = lazy(() => import("./views/materi-view").then(m => ({ default: m.MateriView })))
const TugasView = lazy(() => import("./views/tugas-view").then(m => ({ default: m.TugasView })))
const PertemuanView = lazy(() => import("./views/pertemuan-view").then(m => ({ default: m.PertemuanView })))
const KompetensiView = lazy(() => import("./views/kompetensi-view").then(m => ({ default: m.KompetensiView })))
// V3 — Ujian & Rapor
const BankSoalView = lazy(() => import("./views/bank-soal-view").then(m => ({ default: m.BankSoalView })))
const UjianView = lazy(() => import("./views/ujian-view").then(m => ({ default: m.UjianView })))
// V4 — Perkembangan Santri
const PerkembanganView = lazy(() => import("./views/perkembangan-view").then(m => ({ default: m.PerkembanganView })))
// V5 — Keuangan Lanjutan
const KasView = lazy(() => import("./views/kas-view").then(m => ({ default: m.KasView })))
const HonorGuruView = lazy(() => import("./views/honor-guru-view").then(m => ({ default: m.HonorGuruView })))
// V6 — Komunikasi & Notifikasi
const NotifikasiView = lazy(() => import("./views/notifikasi-view").then(m => ({ default: m.NotifikasiView })))
const ChatView = lazy(() => import("./views/chat-view").then(m => ({ default: m.ChatView })))
// V7 — Administrasi & Dokumen
const SuratView = lazy(() => import("./views/surat-view").then(m => ({ default: m.SuratView })))
// V8 — QR Code & Digitalisasi
const QrView = lazy(() => import("./views/qr-view").then(m => ({ default: m.QrView })))
// V10 — Kelulusan & Alumni
const AlumniView = lazy(() => import("./views/alumni-view").then(m => ({ default: m.AlumniView })))
// V11 — Dashboard & Analitik
const DashboardKepalaView = lazy(() => import("./views/dashboard-kepala-view").then(m => ({ default: m.DashboardKepalaView })))
// V12 — Sistem Terintegrasi Penuh
const SiklusView = lazy(() => import("./views/siklus-view").then(m => ({ default: m.SiklusView })))

export function AdminLayout() {
  const currentView = useAdminStore((s) => s.currentView)
  const sidebarOpen = useAdminStore((s) => s.sidebarOpen)
  const toggleSidebar = useAdminStore((s) => s.toggleSidebar)
  const setSidebar = useAdminStore((s) => s.setSidebar)

  const renderView = () => {
    switch (currentView) {
      case "dashboard": return <DashboardView />
      case "tahun-ajaran": return <TahunAjaranView />
      case "wali": return <WaliView />
      case "santri": return <SantriView />
      case "guru": return <GuruView />
      case "kelas": return <KelasView />
      case "mapel": return <MapelView />
      case "jadwal": return <JadwalView />
      // V2 — Akademik & Pembelajaran
      case "materi": return <MateriView />
      case "tugas": return <TugasView />
      case "pertemuan": return <PertemuanView />
      case "kompetensi": return <KompetensiView />
      // V3 — Ujian & Rapor
      case "bank-soal": return <BankSoalView />
      case "ujian": return <UjianView />
      // V4 — Perkembangan Santri
      case "perkembangan": return <PerkembanganView />
      // End V4
      case "absensi": return <AbsensiView />
      case "nilai": return <NilaiView />
      case "rapor": return <RaporView />
      case "tagihan": return <TagihanView />
      case "pembayaran": return <PembayaranView />
      // V5 — Keuangan Lanjutan
      case "kas": return <KasView />
      case "honor-guru": return <HonorGuruView />
      // End V5
      case "pengumuman": return <PengumumanView />
      // V6 — Komunikasi & Notifikasi
      case "notifikasi": return <NotifikasiView />
      case "chat": return <ChatView />
      // End V6
      // V7 — Administrasi & Dokumen
      case "surat": return <SuratView />
      // End V7
      // V8 — QR Code & Digitalisasi
      case "qr": return <QrView />
      // End V8
      // V10 — Kelulusan & Alumni
      case "alumni": return <AlumniView />
      // End V10
      // V11 — Dashboard & Analitik
      case "dashboard-kepala": return <DashboardKepalaView />
      // End V11
      // V12 — Sistem Terintegrasi Penuh
      case "siklus": return <SiklusView />
      // End V12
      case "users": return <UsersView />
      case "pengaturan": return <PengaturanView />
      case "profile": return <ProfileView />
      case "audit-log": return <AuditLogView />
      default: return <DashboardView />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebar(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={toggleSidebar} />
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          <Suspense fallback={<PageSkeleton />}>
            {renderView()}
          </Suspense>
        </main>
        <footer className="border-t mt-auto py-4 px-6 text-center text-xs text-muted-foreground">
          <p>© 2025 SIM MADIN — Sistem Informasi Madrasah Diniyah Terpadu • MVP V1</p>
        </footer>
      </div>
    </div>
  )
}
