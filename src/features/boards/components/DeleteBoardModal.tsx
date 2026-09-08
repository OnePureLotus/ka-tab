import Modal from '@/shared/components/Modal'
import type { Component } from 'solid-js'
import { For, Show, createSignal } from 'solid-js'
import type { Board } from '../types'

interface DeleteBoardModalProps {
  open: boolean
  board: Board | null
  otherBoards: Board[]
  onClose: () => void
  onDelete: (mode: 'move' | 'delete-all', targetBoardId?: string) => void
}

const DeleteBoardModal: Component<DeleteBoardModalProps> = (props) => {
  const [mode, setMode] = createSignal<'move' | 'delete-all'>('move')
  const [targetBoardId, setTargetBoardId] = createSignal<string>('')

  const hasCollections = () => (props.board?.collectionIds.length ?? 0) > 0
  const canMove = () => props.otherBoards.length > 0

  function handleConfirm() {
    if (!props.board) return
    if (hasCollections() && mode() === 'move' && canMove()) {
      const target = targetBoardId() || props.otherBoards[0]?.id
      if (!target) return
      props.onDelete('move', target)
    } else {
      props.onDelete('delete-all')
    }
    props.onClose()
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title={`Delete "${props.board?.name ?? ''}"?`}>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <Show
          when={hasCollections()}
          fallback={
            <p style="margin: 0; font-size: 14px; color: var(--katab-color-text-secondary);">
              This board has no collections. It will be permanently deleted.
            </p>
          }
        >
          <p style="margin: 0; font-size: 14px; color: var(--katab-color-text-secondary);">
            This board contains {props.board?.collectionIds.length} collection(s). Choose what to do
            with them:
          </p>

          <Show when={canMove()}>
            <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
              <input
                type="radio"
                name="delete-mode"
                checked={mode() === 'move'}
                onChange={() => setMode('move')}
                style="margin-top: 3px;"
              />
              <div>
                <div style="font-size: 14px; font-weight: 500; color: var(--katab-color-text-primary);">
                  Move collections to another board
                </div>
                <select
                  value={targetBoardId() || props.otherBoards[0]?.id || ''}
                  onChange={(e) => setTargetBoardId(e.currentTarget.value)}
                  disabled={mode() !== 'move'}
                  style="margin-top: 8px; width: 100%; padding: 8px 12px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 13px; background: var(--katab-color-surface); color: var(--katab-color-text-primary);"
                >
                  <For each={props.otherBoards}>
                    {(b) => <option value={b.id}>{b.name}</option>}
                  </For>
                </select>
              </div>
            </label>
          </Show>

          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
            <input
              type="radio"
              name="delete-mode"
              checked={mode() === 'delete-all'}
              onChange={() => setMode('delete-all')}
              style="margin-top: 3px;"
            />
            <div>
              <div style="font-size: 14px; font-weight: 500; color: var(--katab-color-text-primary);">
                Delete board and all its collections
              </div>
              <div style="font-size: 12px; color: var(--katab-color-text-secondary); margin-top: 4px;">
                This cannot be undone.
              </div>
            </div>
          </label>
        </Show>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button
            onClick={props.onClose}
            style="padding: 8px 16px; border: 1px solid var(--katab-color-border); border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px; color: var(--katab-color-text-primary);"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style="padding: 8px 16px; border: none; border-radius: 8px; background: #ef4444; color: #fff; cursor: pointer; font-size: 13px; font-weight: 500;"
          >
            Delete board
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteBoardModal
