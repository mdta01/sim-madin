"use client"

import { STATUS_STYLES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: string
  className?: string
}

/**
 * Badge status dengan warna sesuai konvensi aplikasi.
 * Menerima kode status apa pun; jika tidak dikenali, fallback ke default.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_STYLES[status]
  if (!config) {
    return <Badge variant="outline" className={className}>{status}</Badge>
  }
  // Map custom variants to closest shadcn variants
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    default: "default",
    secondary: "secondary",
    destructive: "destructive",
    outline: "outline",
    success: "default", // hijau via className
    warning: "secondary", // kuning via className
  }
  const colorClass: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
    warning: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200",
  }
  return (
    <Badge
      variant={variantMap[config.variant] || "outline"}
      className={cn(colorClass[config.variant], className)}
    >
      {config.label}
    </Badge>
  )
}
