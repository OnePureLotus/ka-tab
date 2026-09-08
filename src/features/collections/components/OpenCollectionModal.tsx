import Modal from '@/shared/components/Modal'
import { sendCommand } from '@/shared/messaging/client'
import { MessageType } from '@/shared/messaging/types'
import type { CollectionOpenPayload, Result } from '@/shared/messaging/types'
import type { Component } from 'solid-js'
import { Show, createMemo, createSignal } from 'solid-js'
import { collectionsStore } from '../store'

interface OpenCollectionModalProps {
  open: boolean
  collectionId: string | null
  onClose: () => void
}

const OpenCollectionModal: Component<OpenCollectionModalProps> = (props) => {
  const [mode, setMode] = createSignal<'tab-group' | 'new-window'>('tab-group')
  const [confirming, setConfirming] = createSignal(false)
  const [opening, setOpening] = createSignal(false)
  const [error, setError] = createSignal('')

  const collection = createMemo(
    () => collectionsStore.items.find((c) => c.id === props.collectionId) ?? null,
  )

  const siteCount = createMemo(() => collection()?.sites.length ?? 0)
  const needsConfirmation = createMemo(() => siteCount() > 20)

  function handleOpen() {
    if (needsConfirmation() && !confirming()) {
      setConfirming(true)
      return
    }
    doOpen()
  }

  async function doOpen() {
    const id = props.collectionId
    if (!id) return

    setOpening(true)
    setError('')

    try {
      const result = await sendCommand<CollectionOpenPayload, Result<void>>({
        type: MessageType.COLLECTION_OPEN,
        payload: { collectionId: id, mode: mode() },
      })

      if (!result.ok) {
        setError(result.error.message)
        console.error('[KaTab] COLLECTION_OPEN failed', result.error)
      } else {
        props.onClose()
      }
    } catch (err) {
      setError(String(err))
      console.error('[KaTab] COLLECTION_OPEN error', err)
    } finally {
      setOpening(false)
      setConfirming(false)
    }
  }

  function handleClose() {
    setConfirming(false)
    setError('')
    props.onClose()
  }

  return (
    <Modal open={props.open} onClose={handleClose} title={`Open "${collection()?.name ?? ''}"`}>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        {/* Confirmation step */}
        <Show when={confirming()}>
          <div style="padding: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; font-size: 13px; color: #92400e;">
            ⚠️ This will open <strong>{siteCount()}</strong> tabs. Continue?
          </div>
        </Show>

        {/* Site count summary */}
        <Show when={!confirming()}>
          <div style="font-size: 14px; color: var(--katab-color-text-secondary);">
            {siteCount()} site{siteCount() !== 1 ? 's' : ''} in this collection
          </div>

          {/* Mode selection */}
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label
              style={`display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 2px solid ${mode() === 'tab-group' ? 'var(--katab-color-accent)' : 'var(--katab-color-border)'}; border-radius: 10px; cursor: pointer;`}
            >
              <input
                type="radio"
                name="open-mode"
                checked={mode() === 'tab-group'}
                onChange={() => setMode('tab-group')}
                style="accent-color: var(--katab-color-accent);"
              />
              <div>
                <div style="font-weight: 500; font-size: 13px;">
                  Open in this window (Tab Group)
                </div>
                <div style="font-size: 12px; color: var(--katab-color-text-secondary);">
                  Create a grouped tab section in the current window
                </div>
              </div>
            </label>

            <label
              style={`display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 2px solid ${mode() === 'new-window' ? 'var(--katab-color-accent)' : 'var(--katab-color-border)'}; border-radius: 10px; cursor: pointer;`}
            >
              <input
                type="radio"
                name="open-mode"
                checked={mode() === 'new-window'}
                onChange={() => setMode('new-window')}
                style="accent-color: var(--katab-color-accent);"
              />
              <div>
                <div style="font-weight: 500; font-size: 13px;">Open in new window</div>
                <div style="font-size: 12px; color: var(--katab-color-text-secondary);">
                  Launch a dedicated window with all sites
                </div>
              </div>
            </label>
          </div>
        </Show>

        <Show when={error()}>
          <div style="padding: 10px 14px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; font-size: 13px; color: #991b1b;">
            {error()}
          </div>
        </Show>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button
            onClick={handleClose}
            style="padding: 8px 16px; border: 1px solid var(--katab-color-border); border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px;"
          >
            Cancel
          </button>
          <button
            onClick={handleOpen}
            disabled={opening() || siteCount() === 0}
            style={`padding: 8px 20px; border: none; border-radius: 8px; background: var(--katab-color-accent); color: #fff; cursor: ${opening() || siteCount() === 0 ? 'not-allowed' : 'pointer'}; font-size: 13px; font-weight: 500; opacity: ${opening() || siteCount() === 0 ? '0.6' : '1'};`}
          >
            {opening() ? 'Opening…' : confirming() ? 'Yes, open all' : 'Open'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default OpenCollectionModal
