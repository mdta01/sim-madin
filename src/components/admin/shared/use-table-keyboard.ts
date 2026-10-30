"use client"

import { useEffect, useRef, useCallback } from "react"

/**
 * ============================================================================
 * useTableKeyboard — keyboard navigation for accessible data tables
 * ============================================================================
 *
 * Adds arrow-key navigation between rows in a `<table role="grid">`:
 *   - ↑/↓ : move focus up/down by row
 *   - Home/End : jump to first/last row
 *   - Enter : trigger the row's primary action (e.g. open detail)
 *   - Esc : blur / exit table (focus goes to body)
 *
 * The hook expects rows to be `<tr role="row" tabIndex={0}>` and cells
 * `<td role="gridcell">`. The active row gets a focus ring.
 *
 * Usage:
 *   const tableRef = useRef<HTMLTableElement>(null)
 *   useTableKeyboard(tableRef, {
 *     onEnter: (rowIndex) => openDetail(rows[rowIndex].id),
 *     rowCount: rows.length,
 *   })
 *
 * Then in JSX:
 *   <table ref={tableRef} role="grid">
 *     <tbody>
 *       {rows.map((r, i) => (
 *         <tr key={r.id} role="row" tabIndex={0}>
 *           <td role="gridcell">...</td>
 *         </tr>
 *       ))}
 *     </tbody>
 *   </table>
 * ============================================================================
 */

interface UseTableKeyboardOptions {
  /** Triggered when Enter is pressed on a row */
  onEnter?: (rowIndex: number) => void
  /** Total number of navigable rows (for Home/End bounds) */
  rowCount?: number
  /** Whether keyboard nav is enabled (default: true). Set to false when modal is open */
  enabled?: boolean
}

export function useTableKeyboard(
  tableRef: React.RefObject<HTMLTableElement | null>,
  opts: UseTableKeyboardOptions = {},
) {
  const { onEnter, rowCount, enabled = true } = opts
  const onEnterRef = useRef(onEnter)
  onEnterRef.current = onEnter

  const focusRow = useCallback((index: number) => {
    const table = tableRef.current
    if (!table) return
    const rows = table.querySelectorAll<HTMLTableRowElement>("tbody tr[role='row']")
    if (rows.length === 0) return
    const clamped = Math.max(0, Math.min(index, rows.length - 1))
    const target = rows[clamped]
    if (target) {
      target.focus()
      target.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [tableRef])

  useEffect(() => {
    if (!enabled) return
    const table = tableRef.current
    if (!table) return

    const handler = (e: KeyboardEvent) => {
      // Only handle if focus is inside our table
      const active = document.activeElement
      if (!table.contains(active)) return

      // Get current row index from focused element
      const rows = table.querySelectorAll<HTMLTableRowElement>("tbody tr[role='row']")
      const currentIdx = Array.from(rows).findIndex((r) => r === active || r.contains(active))
      if (currentIdx < 0) return

      const total = rowCount ?? rows.length

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          focusRow(currentIdx + 1)
          break
        case "ArrowUp":
          e.preventDefault()
          focusRow(currentIdx - 1)
          break
        case "Home":
          e.preventDefault()
          focusRow(0)
          break
        case "End":
          e.preventDefault()
          focusRow(total - 1)
          break
        case "Enter":
          e.preventDefault()
          onEnterRef.current?.(currentIdx)
          break
        case "Escape":
          e.preventDefault()
          ;(document.activeElement as HTMLElement)?.blur()
          break
      }
    }

    table.addEventListener("keydown", handler)
    return () => table.removeEventListener("keydown", handler)
  }, [tableRef, enabled, rowCount, focusRow])

  return { focusRow }
}
