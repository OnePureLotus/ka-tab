import type { Component } from 'solid-js'
import { createSignal, onMount } from 'solid-js'
import { sendCommand } from '@/shared/messaging/client'
import { MessageType } from '@/shared/messaging/types'
import type { NoteSavePayload } from '@/shared/messaging/types'

interface FloatingPanelProps {
  selectedText: string
  sourceUrl: string
  sourceDomain: string
  onClose: () => void
  onSaved: () => void
}

const FloatingPanel: Component<FloatingPanelProps> = (props) => {
  let textareaRef: HTMLTextAreaElement | undefined
  const [saving, setSaving] = createSignal(false)
  const [saved, setSaved] = createSignal(false)
  const [error, setError] = createSignal(false)

  onMount(() => {
    // Set textarea value explicitly after mount — SolidJS textContent insertion
    // may not update textarea.value in all browsers. Direct property assignment
    // is the only reliable way.
    if (textareaRef) {
      textareaRef.value = props.selectedText
      textareaRef.focus()
    }
  })

  async function handleSave() {
    const text = (textareaRef?.value ?? '').trim()
    if (!text || saving()) return
    setError(false)
    setSaving(true)
    try {
      const payload: NoteSavePayload = { content: text }
      if (props.sourceUrl) payload.sourceUrl = props.sourceUrl
      if (props.sourceDomain) payload.sourceDomain = props.sourceDomain
      await sendCommand({ type: MessageType.NOTE_SAVE, payload })
      setSaved(true)
      setTimeout(() => props.onSaved(), 900)
    } catch (err) {
      console.error('[KaTab] FloatingPanel: save failed', err)
      setSaving(false)
      setError(true)
    }
  }

  const domainLabel = () => props.sourceDomain.replace(/^www\./, '')

  // IMPORTANT: Use on:click / on:event (not onClick) throughout this component.
  // SolidJS onClick uses event delegation (attaches listener to document).
  // Inside a shadow DOM, composedPath() seen from outside omits shadow
  // internals, so delegation never finds the handler. on:click attaches the
  // listener directly to the element, bypassing delegation entirely.
  return (
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: #fff; border-radius: 12px; box-shadow: 0 14px 36px rgba(0,0,0,0.16); border: 1px solid #e5e7eb; width: 330px; overflow: hidden;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 6px;">
        <span style="font-size: 16px; font-weight: 700; color: #111827;">Save to Note</span>
        <button
          on:click={props.onClose}
          style="width: 24px; height: 24px; border: none; background: transparent; cursor: pointer; font-size: 18px; color: #9ca3af; line-height: 1; display: flex; align-items: center; justify-content: center; border-radius: 4px; padding: 0;"
        >
          ×
        </button>
      </div>

      <div style="padding: 0 16px 10px; font-size: 11px; color: #6b7280;">
        {domainLabel()} · selected text
      </div>

      <div style="padding: 0 16px;">
        <textarea
          ref={textareaRef}
          rows={5}
          style="width: 100%; box-sizing: border-box; padding: 10px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; color: #374151; font-family: inherit; line-height: 1.55; resize: vertical; outline: none; min-height: 100px;"
        />
      </div>

      <div
        style={`padding: 6px 16px 10px; font-size: 11px; color: ${error() ? '#ef4444' : '#9ca3af'};`}
      >
        {error()
          ? 'Failed to save. Please try again.'
          : 'Editable before saving. Source URL is saved automatically.'}
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 14px;">
        <button
          on:click={props.onClose}
          style="padding: 0 18px; height: 34px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; font-size: 12px; font-weight: 600; color: #6b7280; font-family: inherit;"
        >
          Cancel
        </button>
        <button
          on:click={handleSave}
          disabled={saving() || saved()}
          style={`padding: 0 18px; height: 34px; border: none; border-radius: 8px; background: ${saved() ? '#10b981' : error() ? '#ef4444' : '#4f46e5'}; color: #fff; cursor: ${saving() || saved() ? 'default' : 'pointer'}; font-size: 12px; font-weight: 600; font-family: inherit; transition: background 200ms; display: flex; align-items: center; gap: 6px;`}
        >
          {saved() ? '✓ Saved' : saving() ? '…' : 'Save note'}
        </button>
      </div>
    </div>
  )
}

export default FloatingPanel
