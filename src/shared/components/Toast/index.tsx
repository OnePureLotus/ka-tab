import type { Component } from 'solid-js'
import { For, Show } from 'solid-js'
import { toasts, dismissToast } from '@/shared/toast'
import type { ToastType } from '@/shared/toast'

const ICON_BG: Record<ToastType, string> = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#4f46e5',
}

const ICON_LABEL: Record<ToastType, string> = {
  success: '✓',
  warning: '!',
  error: '!',
  info: 'i',
}

const Toast: Component = () => {
  return (
    <Show when={toasts().length > 0}>
      <div
        aria-live="polite"
        style="position: fixed; bottom: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;"
      >
        <For each={toasts()}>
          {(item) => (
            <div
              role="status"
              style="display: flex; align-items: flex-start; gap: 12px; padding: 16px 14px 14px; border-radius: 10px; background: var(--katab-color-surface, #fff); border: 1px solid #e5e7eb; box-shadow: 0 10px 28px rgba(0,0,0,0.12); width: 360px; max-width: calc(100vw - 40px); box-sizing: border-box; pointer-events: all; animation: katab-toast-in 200ms ease;"
            >
              {/* Status icon */}
              <div
                style={`width: 24px; height: 24px; border-radius: 12px; background: ${ICON_BG[item.type]}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;`}
              >
                <span style="font-size: 11px; font-weight: 700; color: #fff; line-height: 1;">
                  {ICON_LABEL[item.type]}
                </span>
              </div>

              {/* Content */}
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 600; color: var(--katab-color-text-primary, #111827); line-height: 1.3; margin-bottom: 2px;">
                  {item.title}
                </div>
                <Show when={item.body}>
                  <div style="font-size: 12px; color: #6b7280; line-height: 1.45;">{item.body}</div>
                </Show>
                <Show when={item.action}>
                  <button
                    onClick={() => {
                      item.action!.onClick()
                      dismissToast(item.id)
                    }}
                    style="margin-top: 8px; height: 22px; padding: 0 10px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; font-size: 10px; font-weight: 600; color: #4f46e5; cursor: pointer; line-height: 1;"
                  >
                    {item.action!.label}
                  </button>
                </Show>
              </div>

              {/* Close */}
              <button
                onClick={() => dismissToast(item.id)}
                aria-label="Dismiss"
                style="background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 12px; font-weight: 600; padding: 0; line-height: 1; flex-shrink: 0; margin-top: 1px;"
              >
                x
              </button>
            </div>
          )}
        </For>
      </div>
    </Show>
  )
}

export default Toast
