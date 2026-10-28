/**
 * Navigation store — Single Page App state untuk Super Admin
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AdminView =
  | "dashboard"
  | "tahun-ajaran"
  | "wali"
  | "santri"
  | "guru"
  | "kelas"
  | "mapel"
  | "jadwal"
  | "absensi"
  | "nilai"
  | "rapor"
  | "tagihan"
  | "pembayaran"
  | "pengumuman"
  | "users"
  | "pengaturan"
  | "profile"
  | "audit-log"

interface AdminState {
  currentView: AdminView
  selectedEntityId: string | null
  selectedEntityTab?: string
  filters: Record<string, Record<string, unknown>>
  sidebarOpen: boolean

  setView: (view: AdminView) => void
  selectEntity: (id: string | null, tab?: string) => void
  setFilter: (view: AdminView, key: string, value: unknown) => void
  clearFilters: (view: AdminView) => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      currentView: "dashboard",
      selectedEntityId: null,
      selectedEntityTab: undefined,
      filters: {},
      sidebarOpen: false,

      setView: (view) =>
        set({ currentView: view, selectedEntityId: null, selectedEntityTab: undefined, sidebarOpen: false }),
      selectEntity: (id, tab) =>
        set({ selectedEntityId: id, selectedEntityTab: tab }),
      setFilter: (view, key, value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [view]: { ...(state.filters[view] || {}), [key]: value },
          },
        })),
      clearFilters: (view) =>
        set((state) => {
          const newFilters = { ...state.filters }
          delete newFilters[view]
          return { filters: newFilters }
        }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebar: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "madin-admin-nav",
      partialize: (state) => ({
        currentView: state.currentView,
        selectedEntityId: state.selectedEntityId,
        selectedEntityTab: state.selectedEntityTab,
        filters: state.filters,
      }),
    },
  ),
)
