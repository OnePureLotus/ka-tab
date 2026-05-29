import type { Component } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import type { Collection } from '../types'
import Modal from '@/shared/components/Modal'
import { mapToTabGroupColor } from '@/shared/color/tab-group-mapper'

interface CreateCollectionModalProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, color: string) => void
}

const PRESET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const CreateCollectionModal: Component<CreateCollectionModalProps> = (props) => {
  const [name, setName] = createSignal('')
  const [color, setColor] = createSignal('#6366f1')

  const tabGroupColor = () => mapToTabGroupColor(color())

  function handleCreate() {
    const n = name().trim()
    if (!n) return
    props.onCreate(n, color())
    setName('')
    setColor('#6366f1')
    props.onClose()
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title="New Collection">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 500; color: var(--katab-color-text-secondary); margin-bottom: 6px;">
            Collection name
          </label>
          <input
            type="text"
            placeholder="e.g. Work, Research, Reading list…"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
            style="width: 100%; padding: 8px 12px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 14px; outline: none; background: var(--katab-color-surface); color: var(--katab-color-text-primary);"
            // biome-ignore lint/a11y/noAutofocus: intentional focus for modal input
            autofocus
          />
        </div>

        <div>
          <label style="display: block; font-size: 12px; font-weight: 500; color: var(--katab-color-text-secondary); margin-bottom: 6px;">
            Color
          </label>
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            {PRESET_COLORS.map((c) => (
              <button
                onClick={() => setColor(c)}
                style={`width: 28px; height: 28px; border-radius: 50%; background: ${c}; border: 3px solid ${color() === c ? 'var(--katab-color-text-primary)' : 'transparent'}; cursor: pointer; padding: 0;`}
                title={c}
              />
            ))}
            <input
              type="color"
              value={color()}
              onInput={(e) => setColor(e.currentTarget.value)}
              style="width: 36px; height: 36px; border: 1px solid var(--katab-color-border); border-radius: 6px; padding: 2px; cursor: pointer;"
              title="Custom color"
            />
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--katab-color-surface-secondary); border-radius: 8px; font-size: 12px; color: var(--katab-color-text-secondary);">
          <div style={`width: 10px; height: 10px; border-radius: 3px; background: ${color()};`} />
          Chrome tab group color:{' '}
          <strong style="color: var(--katab-color-text-primary);">{tabGroupColor()}</strong>
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

export default CreateCollectionModal
