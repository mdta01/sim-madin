"use client"

import { useState, useCallback, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, AlertTriangle, Trash2, AlertCircle } from "lucide-react"

/**
 * ============================================================================
 * CONFIRM DIALOG — Reusable replacement for window.confirm()
 * ============================================================================
 *
 * Why not window.confirm()?
 *   - Native confirm() blocks the JS thread, can't be styled, doesn't support
 *     loading state during async delete, and looks different per-browser.
 *   - This component uses shadcn AlertDialog (Radix) which has focus trap,
 *     keyboard nav (Esc to cancel, Enter to confirm), and theme-matching UI.
 *
 * Usage:
 *   const confirmDialog = useConfirmDialog()
 *   const ok = await confirmDialog.confirm({
 *     title: "Hapus santri?",
 *     description: "Tindakan ini tidak bisa dibatalkan.",
 *     confirmLabel: "Hapus",
 *     variant: "destructive",
 *     onConfirm: async () => {
 *       await apiDelete(`/api/admin/santri/${id}`)
 *     },
 *   })
 *   if (ok) toast({ title: "Berhasil dihapus" })
 *
 * The hook returns:
 *   - `confirm(opts)`: Promise<boolean> — true if user confirmed & onConfirm
 *     succeeded, false if user cancelled or onConfirm threw.
 *   - `ConfirmDialogComponent`: the JSX element to render once (typically in
 *     the page/layout root).
 * ============================================================================
 */

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "destructive" | "default"
  /** Icon to show next to the title. Auto-picked based on variant if omitted. */
  icon?: "trash" | "warning" | "alert" | "none"
  /** Async action to run when user clicks confirm. While pending, the
   *  confirm button shows a spinner and the cancel button is disabled. */
  onConfirm: () => Promise<void> | void
}

interface ConfirmState {
  open: boolean
  opts: ConfirmOptions | null
  pending: boolean
  resolve: ((ok: boolean) => void) | null
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    opts: null,
    pending: false,
    resolve: null,
  })

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, opts, pending: false, resolve })
    })
  }, [])

  const handleCancel = useCallback(() => {
    if (state.pending) return // can't cancel while pending
    state.resolve?.(false)
    setState((s) => ({ ...s, open: false, opts: null, resolve: null }))
  }, [state])

  const handleConfirm = useCallback(async () => {
    if (!state.opts) return
    setState((s) => ({ ...s, pending: true }))
    try {
      await state.opts.onConfirm()
      state.resolve?.(true)
    } catch (err) {
      console.error("[ConfirmDialog] onConfirm error:", err)
      state.resolve?.(false)
    } finally {
      setState((s) => ({ ...s, pending: false, open: false, opts: null, resolve: null }))
    }
  }, [state])

  // Esc key handler — Radix AlertDialog already handles Esc, but we
  // sync our internal state via onOpenChange.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleCancel()
    },
    [handleCancel],
  )

  const ConfirmDialogComponent = state.opts ? (
    <AlertDialog open={state.open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-start gap-2">
            <ConfirmIcon
              variant={state.opts.variant || "default"}
              icon={state.opts.icon}
            />
            <span>{state.opts.title}</span>
          </AlertDialogTitle>
          {state.opts.description && (
            <AlertDialogDescription>{state.opts.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={state.pending}>
            {state.opts.cancelLabel || "Batal"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault() // prevent Radix from auto-closing
              handleConfirm()
            }}
            disabled={state.pending}
            className={
              state.opts.variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600"
                : ""
            }
          >
            {state.pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Memproses...
              </>
            ) : (
              state.opts.confirmLabel || (state.opts.variant === "destructive" ? "Hapus" : "Konfirmasi")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null

  return { confirm, ConfirmDialogComponent }
}

function ConfirmIcon({
  variant,
  icon,
}: {
  variant: "destructive" | "default"
  icon?: "trash" | "warning" | "alert" | "none"
}) {
  if (icon === "none") return null
  // Auto-pick icon
  const effectiveIcon = icon || (variant === "destructive" ? "trash" : "warning")
  const className =
    variant === "destructive"
      ? "h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
      : "h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
  switch (effectiveIcon) {
    case "trash":
      return <Trash2 className={className} />
    case "alert":
      return <AlertCircle className={className} />
    case "warning":
      return <AlertTriangle className={className} />
    default:
      return null
  }
}
