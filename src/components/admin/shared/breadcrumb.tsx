"use client"

import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center text-sm text-muted-foreground mb-4 flex-wrap", className)}>
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center">
          {item.onClick ? (
            <button onClick={item.onClick} className="hover:text-foreground transition-colors">
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
          {idx < items.length - 1 && <ChevronRight className="h-3 w-3 mx-1.5" />}
        </span>
      ))}
    </nav>
  )
}
