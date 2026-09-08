import Modal from '@/shared/components/Modal'
import type { Component } from 'solid-js'
import { createSignal } from 'solid-js'

interface CreateBoardModalProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

const CreateBoardModal: Component<CreateBoardModalProps> = (props) => {
  const [name, setName] = createSignal('')

  function handleCreate() {
    const n = name().trim()
    if (!n) return
    props.onCreate(n)
    setName('')
    props.onClose()
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title="New Board">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 500; color: var(--katab-color-text-secondary); margin-bottom: 6px;">
            Board name
          </label>
          <input
            type="text"
            placeholder="e.g. Work, Personal, Research…"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
            style="width: 100%; padding: 8px 12px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 14px; outline: none; background: var(--katab-color-surface); color: var(--katab-color-text-primary);"
            autofocus
          />
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button
            onClick={props.onClose}
            style="padding: 8px 16px; border: 1px solid var(--katab-color-border); border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px; color: var(--katab-color-text-primary);"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name().trim()}
            style={`padding: 8px 16px; border: none; border-radius: 8px; background: var(--katab-color-accent); color: #fff; cursor: ${!name().trim() ? 'not-allowed' : 'pointer'}; font-size: 13px; font-weight: 500; opacity: ${!name().trim() ? '0.6' : '1'};`}
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateBoardModal
