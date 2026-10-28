"use client"

import { useAdminStore } from "@/stores/admin-store"
import { MENU_ITEMS, MENU_GROUPS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, BookOpen, Building2, GraduationCap } from "lucide-react"
import * as Icons from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const currentView = useAdminStore((s) => s.currentView)
  const setView = useAdminStore((s) => s.setView)

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-72 shrink-0 border-r bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">SIM MADIN</p>
              <p className="text-[11px] text-muted-foreground truncate">Super Admin Panel</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)] py-3">
          <nav className="space-y-1 px-2">
            {MENU_GROUPS.map((group) => {
              const items = MENU_ITEMS.filter((m) => m.group === group.id)
              if (items.length === 0) return null
              return (
                <div key={group.id} className="mb-3">
                  <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = (Icons as any)[item.icon] || Icons.Circle
                      const isActive = currentView === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => setView(item.id as any)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors group",
                            isActive
                              ? "bg-primary text-primary-foreground font-medium shadow-sm"
                              : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground",
                          )}
                          title={item.description}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 border-t bg-sidebar/95 backdrop-blur p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              <p className="font-medium text-sidebar-foreground/80">v1.0 MVP</p>
              <p>© 2025 SIM MADIN</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  )
}
