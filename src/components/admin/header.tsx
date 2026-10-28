"use client"

import { useSupabaseSession } from "@/hooks/use-supabase-session"
import { useAdminStore } from "@/stores/admin-store"
import { MENU_ITEMS, ROLE_LABELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bell, Menu, Search, LogOut, User as UserIcon, ShieldCheck, ChevronDown } from "lucide-react"
import * as Icons from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "./theme-toggle"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const currentView = useAdminStore((s) => s.currentView)
  const setView = useAdminStore((s) => s.setView)
  const menuItem = MENU_ITEMS.find((m) => m.id === currentView)
  const Icon = (Icons as any)[menuItem?.icon || "LayoutDashboard"] || Icons.Circle
  const { user, signOut } = useSupabaseSession()
  const primaryRole = user?.user_metadata?.role as string || user?.email

  const handleLogout = async () => {
    await signOut()
    window.location.reload()
  }

  const handleProfile = () => {
    setView("profile" as any)
  }

  // Override title & icon for views not in menu
  const viewOverrides: Record<string, { label: string; description: string; icon: string }> = {
    "profile": { label: "Profil Saya", description: "Kelola akun & keamanan", icon: "User" },
    "audit-log": { label: "Audit Log", description: "Riwayat aktivitas sistem", icon: "Activity" },
  }
  const override = viewOverrides[currentView]
  const title = override?.label || menuItem?.label || "Dashboard"
  const description = override?.description || menuItem?.description || ""
  const OverrideIcon = override ? (Icons as any)[override.icon] || Icons.Circle : null

  // Get user name from Supabase user_metadata or email
  const userName = (user?.user_metadata?.name as string) || user?.email?.split("@")[0] || "User"
  const userInitial = userName[0]?.toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {OverrideIcon ? <OverrideIcon className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-sm sm:text-base truncate">{title}</h2>
          <p className="text-[11px] text-muted-foreground hidden sm:block truncate">{description}</p>
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

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 pl-2 border-l hover:bg-muted/40 px-2 py-1.5 rounded-md transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block min-w-0 text-left">
              <p className="text-xs font-medium truncate max-w-[120px]">{userName}</p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user?.email}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleProfile} className="cursor-pointer">
            <UserIcon className="h-4 w-4 mr-2" /> Profil Saya
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setView("audit-log" as any)} className="cursor-pointer">
            <ShieldCheck className="h-4 w-4 mr-2" /> Audit Log
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
