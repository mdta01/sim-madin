"use client"

import { useAdminStore } from "@/stores/admin-store"
import { MENU_ITEMS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bell, Menu, Search } from "lucide-react"
import * as Icons from "lucide-react"
import { Input } from "@/components/ui/input"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const currentView = useAdminStore((s) => s.currentView)
  const menuItem = MENU_ITEMS.find((m) => m.id === currentView)
  const Icon = (Icons as any)[menuItem?.icon || "LayoutDashboard"] || Icons.Circle

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-sm sm:text-base truncate">
            {menuItem?.label || "Dashboard"}
          </h2>
          <p className="text-[11px] text-muted-foreground hidden sm:block truncate">
            {menuItem?.description || ""}
          </p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="hidden md:block relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari cepat..." className="pl-9 h-9 bg-muted/40" />
      </div>

      <Button variant="ghost" size="icon" className="h-9 w-9 relative">
        <Bell className="h-4 w-4" />
        <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] p-0 flex items-center justify-center">3</Badge>
      </Button>

      <div className="flex items-center gap-2 pl-2 border-l">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">SA</AvatarFallback>
        </Avatar>
        <div className="hidden sm:block min-w-0">
          <p className="text-xs font-medium truncate">Administrator</p>
          <p className="text-[10px] text-muted-foreground truncate">Super Admin</p>
        </div>
      </div>
    </header>
  )
}
