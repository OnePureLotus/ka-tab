import type { Component } from 'solid-js'
import { createSignal, For, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { settingsStore } from '@/features/settings/store'
import { DEFAULT_COLOR_PALETTE } from '@/features/settings/types'
import type { Collection } from '../types'

interface ChangeColorModalProps {
  collection: Collection
  onClose: () => void
  onSave: (color: string, tabGroupColor?: string) => void
}

const ChangeColorModal: Component<ChangeColorModalProps> = (props) => {
  const [selectedColor, setSelectedColor] = createSignal(props.collection.color)

  const palette = () => {
    const p = settingsStore.colorPalette
    return p && p.length > 0 ? p : DEFAULT_COLOR_PALETTE
  }

  function handleSave() {
    const entry = palette().find((e) => e.color === selectedColor())
    props.onSave(selectedColor(), entry?.tabGroupColor)
  }

  return (
    <Portal>
      <div
        style="position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center;"
        onClick={props.onClose}
      >
        <div
          style="background: var(--katab-color-surface); border-radius: 14px; padding: 28px; min-width: 340px; max-width: 420px; width: 90vw; box-shadow: 0 8px 40px rgba(0,0,0,0.22); display: flex; flex-direction: column; gap: 20px;"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style="display: flex; align-items: center; gap: 10px;">
            <div
              style={`width: 12px; height: 12px; border-radius: 6px; background: ${selectedColor()}; flex-shrink: 0;`}
            />
            <div>
              <div style="font-size: 16px; font-weight: 700; color: var(--katab-color-text-primary); line-height: 1.2;">
                Change Color
              </div>
              <div style="font-size: 12px; color: var(--katab-color-text-secondary); margin-top: 2px;">
                Choose from colors configured in Settings.
              </div>
            </div>
          </div>

          {/* Current collection row */}
          <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--katab-color-surface-secondary); border-radius: 8px;">
            <div
              style={`width: 10px; height: 10px; border-radius: 5px; background: ${props.collection.color}; flex-shrink: 0;`}
            />
            <span style="font-size: 13px; font-weight: 500; color: var(--katab-color-text-primary);">
              {props.collection.name}
            </span>
          </div>

          {/* Color grid */}
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <For each={palette()}>
              {(entry) => {
                const isSelected = () => selectedColor() === entry.color
                return (
                  <button
                    onClick={() => setSelectedColor(entry.color)}
                    style={`display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1.5px solid ${isSelected() ? entry.color : 'var(--katab-color-border)'}; background: ${isSelected() ? `color-mix(in srgb, ${entry.color} 12%, var(--katab-color-surface))` : 'var(--katab-color-surface-secondary)'}; cursor: pointer; text-align: left; transition: border-color 120ms, background 120ms; position: relative;`}
                  >
                    <div
                      style={`width: 22px; height: 22px; border-radius: 6px; background: ${entry.color}; flex-shrink: 0;`}
                    />
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 12px; font-weight: 600; color: var(--katab-color-text-primary);">
                        {entry.name}
                      </div>
                      <Show when={entry.tabGroupColor}>
                        <div style="font-size: 10px; color: var(--katab-color-text-muted); margin-top: 1px;">
                          Chrome: {entry.tabGroupColor}
                        </div>
                      </Show>
                    </div>
                    <Show when={isSelected()}>
                      <div
                        style={`width: 18px; height: 18px; border-radius: 9px; background: ${entry.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;`}
                      >
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </div>
                    </Show>
                  </button>
                )
              }}
            </For>
          </div>

          {/* Footer actions */}
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button
              onClick={props.onClose}
              style="padding: 8px 18px; border: 1px solid var(--katab-color-border); border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--katab-color-text-primary);"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={`padding: 8px 18px; border: none; border-radius: 8px; background: ${selectedColor()}; color: #fff; cursor: pointer; font-size: 13px; font-weight: 600;`}
            >
              Save color
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default ChangeColorModal
