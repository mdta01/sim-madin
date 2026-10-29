"use client"

import { useAdminStore } from "@/stores/admin-store"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { DashboardView } from "./views/dashboard-view"
import { TahunAjaranView } from "./views/tahun-ajaran-view"
import { WaliView } from "./views/wali-view"
import { SantriView } from "./views/santri-view"
import { GuruView } from "./views/guru-view"
import { KelasView } from "./views/kelas-view"
import { MapelView } from "./views/mapel-view"
import { JadwalView } from "./views/jadwal-view"
import { AbsensiView } from "./views/absensi-view"
import { NilaiView } from "./views/nilai-view"
import { RaporView } from "./views/rapor-view"
import { TagihanView } from "./views/tagihan-view"
import { PembayaranView } from "./views/pembayaran-view"
import { PengumumanView } from "./views/pengumuman-view"
import { UsersView } from "./views/users-view"
import { PengaturanView } from "./views/pengaturan-view"
import { ProfileView } from "./views/profile-view"
import { AuditLogView } from "./views/audit-log-view"
// V2 — Akademik & Pembelajaran
import { MateriView } from "./views/materi-view"
import { TugasView } from "./views/tugas-view"
import { PertemuanView } from "./views/pertemuan-view"
import { KompetensiView } from "./views/kompetensi-view"
// V3 — Ujian & Rapor
import { BankSoalView } from "./views/bank-soal-view"
import { UjianView } from "./views/ujian-view"
// V4 — Perkembangan Santri
import { PerkembanganView } from "./views/perkembangan-view"
// V5 — Keuangan Lanjutan
import { KasView } from "./views/kas-view"
import { HonorGuruView } from "./views/honor-guru-view"
// V6 — Komunikasi & Notifikasi
import { NotifikasiView } from "./views/notifikasi-view"
import { ChatView } from "./views/chat-view"
// V7 — Administrasi & Dokumen
import { SuratView } from "./views/surat-view"
// V8 — QR Code & Digitalisasi
import { QrView } from "./views/qr-view"

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
          {renderView()}
        </main>
        <footer className="border-t mt-auto py-4 px-6 text-center text-xs text-muted-foreground">
          <p>© 2025 SIM MADIN — Sistem Informasi Madrasah Diniyah Terpadu • MVP V1</p>
        </footer>
      </div>
    </div>
  )
}
