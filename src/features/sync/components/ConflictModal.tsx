import type { Component } from 'solid-js'
import { For, createSignal, Show } from 'solid-js'
import { syncStore, removeConflict } from '../sync.store'
import { sendCommand } from '@/shared/messaging/client'
import { MessageType } from '@/shared/messaging/types'

interface ConflictModalProps {
  onClose: () => void
}

const ConflictModal: Component<ConflictModalProps> = (props) => {
  const [resolving, setResolving] = createSignal<string | null>(null)

  async function resolve(key: string, choice: 'local' | 'remote') {
    setResolving(key)
    try {
      await sendCommand({
        type: MessageType.SYNC_RESOLVE_CONFLICT,
        payload: { key, choice },
      })
      removeConflict(key)
    } catch (err) {
      console.error('[KaTab] ConflictModal: resolve failed', err)
    } finally {
      setResolving(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resolve sync conflicts"
      style="position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <div style="background: #fff; border-radius: 12px; padding: 24px; min-width: 420px; max-width: 560px; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 600; flex: 1;">⚠️ Sync Conflicts</h2>
          <button
            onClick={props.onClose}
            style="border: none; background: none; cursor: pointer; font-size: 18px; color: #6b7280; padding: 2px 6px;"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p style="font-size: 13px; color: #6b7280; margin: 0 0 16px;">
          The same data was modified on multiple devices. Choose which version to keep for each
          conflict.
        </p>

        <Show
          when={syncStore.conflicts().length > 0}
          fallback={
            <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 14px;">
              ✅ All conflicts resolved!
            </div>
          }
        >
          <For each={syncStore.conflicts()}>
            {(conflict) => (
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 10px; font-family: monospace; background: #f9fafb; padding: 4px 8px; border-radius: 4px;">
                  {conflict.key}
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  {/* Local version */}
                  <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px;">
                    <div style="font-size: 11px; font-weight: 600; color: #0369a1; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                      This device
                    </div>
                    <pre style="font-size: 10px; color: #374151; margin: 0; white-space: pre-wrap; word-break: break-all; max-height: 80px; overflow: hidden;">
                      {JSON.stringify(conflict.localValue, null, 2)}
                    </pre>
                    <button
                      onClick={() => resolve(conflict.key, 'local')}
                      disabled={resolving() === conflict.key}
                      style="margin-top: 8px; width: 100%; padding: 5px; background: #0ea5e9; color: #fff; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;"
                    >
                      Keep local
                    </button>
                  </div>

                  {/* Remote version */}
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px;">
                    <div style="font-size: 11px; font-weight: 600; color: #15803d; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Other device
                    </div>
                    <pre style="font-size: 10px; color: #374151; margin: 0; white-space: pre-wrap; word-break: break-all; max-height: 80px; overflow: hidden;">
                      {JSON.stringify(conflict.remoteValue, null, 2)}
                    </pre>
                    <button
                      onClick={() => resolve(conflict.key, 'remote')}
                      disabled={resolving() === conflict.key}
                      style="margin-top: 8px; width: 100%; padding: 5px; background: #22c55e; color: #fff; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;"
                    >
                      Keep remote
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </Show>

        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
          <button
            onClick={props.onClose}
            style="padding: 8px 20px; background: #f3f4f6; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; color: #374151;"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConflictModal
