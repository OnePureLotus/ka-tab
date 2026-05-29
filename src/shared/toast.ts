import { createSignal } from 'solid-js'

export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  body?: string
  action?: ToastAction
}

let idCounter = 0

const [toasts, setToasts] = createSignal<ToastItem[]>([])

export { toasts }

/**
 * Show a notification toast.
 * - success/info/warning (no action): auto-dismiss after 3s
 * - error or any toast with an action: stays until manually dismissed
 */
export function showToast(
  title: string,
  options?: { type?: ToastType; body?: string; action?: ToastAction },
): void {
  const type = options?.type ?? 'info'
  const id = String(++idCounter)
  const item: ToastItem = { id, type, title, body: options?.body, action: options?.action }

  // Cap visible toasts at 3 (remove oldest first)
  setToasts((prev) => {
    const trimmed = prev.length >= 3 ? prev.slice(1) : prev
    return [...trimmed, item]
  })

  const persistent = type === 'error' || !!options?.action
  if (!persistent) {
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }
}

export function dismissToast(id: string): void {
  setToasts((prev) => prev.filter((t) => t.id !== id))
}
