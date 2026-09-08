import Modal from '@/shared/components/Modal'
import type { Component } from 'solid-js'
import { createEffect, createSignal } from 'solid-js'
import type { Board } from '../types'

interface RenameBoardModalProps {
  open: boolean
  board: Board | null
  onClose: () => void
  onRename: (name: string) => void
}

const RenameBoardModal: Component<RenameBoardModalProps> = (props) => {
  const [name, setName] = createSignal('')

  createEffect(() => {
    if (props.open && props.board) setName(props.board.name)
  })

  function handleRename() {
    const n = name().trim()
    if (!n) return
    props.onRename(n)
    props.onClose()
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title="Rename Board">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <input
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename()
          }}
          style="width: 100%; padding: 8px 12px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 14px; outline: none; background: var(--katab-color-surface); color: var(--katab-color-text-primary);"
        />
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button
            onClick={props.onClose}
            style="padding: 8px 16px; border: 1px solid var(--katab-color-border); border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px;"
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={!name().trim()}
            style="padding: 8px 16px; border: none; border-radius: 8px; background: var(--katab-color-accent); color: #fff; cursor: pointer; font-size: 13px; font-weight: 500;"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default RenameBoardModal
