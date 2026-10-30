"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * ============================================================================
 * SKELETON LOADERS — Match the layout of common view patterns
 * ============================================================================
 * Why use skeleton instead of spinner?
 *   - Skeletons reduce perceived loading time (CLP metric) by showing
 *     structure before content arrives.
 *   - Spinner + blank page feels slower; skeleton matches final layout
 *     so users know what to expect.
 *
 * Usage:
 *   if (loading) return <TableSkeleton rows={8} cols={5} />
 *   if (loading) return <StatCardSkeleton count={4} />
 *   if (loading) return <PageSkeleton />  // generic header + table
 * ============================================================================
 */

interface TableSkeletonProps {
  rows?: number
  cols?: number
  className?: string
}

export function TableSkeleton({ rows = 8, cols = 5, className }: TableSkeletonProps) {
  return (
    <div className={className}>
      <div className="rounded-md border">
        {/* Header row */}
        <div className="border-b bg-muted/40 px-4 py-3">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
        {/* Body rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="border-b last:border-0 px-4 py-3 hover:bg-transparent"
          >
            <div className="grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <Skeleton
                  key={colIdx}
                  className="h-4"
                  style={{ width: `${30 + Math.random() * 50}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface StatCardSkeletonProps {
  count?: number
  className?: string
}

export function StatCardSkeleton({ count = 4, className }: StatCardSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className || ""}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-2 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface PageSkeletonProps {
  /** Show stats row above the table */
  withStats?: boolean
  /** Show filter bar above the table */
  withFilter?: boolean
  rows?: number
  cols?: number
}

export function PageSkeleton({ withStats = true, withFilter = true, rows = 8, cols = 5 }: PageSkeletonProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      {withStats && <StatCardSkeleton count={4} />}
      {withFilter && (
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      )}
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  )
}

/**
 * Inline list skeleton — for non-table lists (notifications, chat, etc.)
 */
export function ListSkeleton({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className || ""}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-2/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
