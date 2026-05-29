import type { Component } from 'solid-js'
import { createSignal, createMemo, Show } from 'solid-js'
import type { Collection } from '../types'
import { addSiteToCollection, validateSiteLimit } from '../service'
import { updateCollection } from '../store'
import { sendCommand } from '@/shared/messaging/client'
import { MessageType } from '@/shared/messaging/types'
import { showToast } from '@/shared/toast'

interface AddSitePanelProps {
  collection: Collection
  onClose: () => void
}

const AddSitePanel: Component<AddSitePanelProps> = (props) => {
  const [url, setUrl] = createSignal('')
  const [title, setTitle] = createSignal('')
  const [tabFavicon, setTabFavicon] = createSignal('')
  const [error, setError] = createSignal('')
  const [saving, setSaving] = createSignal(false)

  const siteStatus = () => validateSiteLimit(props.collection)

  // Prefer the favicon from the active tab (already resolved); fall back to Google API.
  // createMemo ensures this only recomputes when url/tabFavicon actually change.
  const faviconUrl = createMemo(() => tabFavicon() || getFaviconUrl(url().trim()))

  function getFaviconUrl(rawUrl: string): string {
    try {
      const domain = new URL(rawUrl).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch {
      return ''
    }
  }

  function validateUrl(rawUrl: string): boolean {
    try {
      new URL(rawUrl)
      return true
    } catch {
      return false
    }
  }

  async function handleAddCurrentTab() {
    try {
      const tabs = await sendCommand<void, chrome.tabs.Tab[]>({
        type: MessageType.TAB_GET_CURRENT,
        payload: undefined,
      })
      const active = tabs.find((t) => t.active)
      if (active) {
        setUrl(active.url ?? '')
        setTitle(active.title ?? '')
        setTabFavicon(active.favIconUrl ?? '')
      }
    } catch (err) {
      console.error('[KaTab] Failed to get current tab', err)
    }
  }

  async function handleSave() {
    const rawUrl = url().trim()
    if (!rawUrl) {
      setError('URL is required')
      return
    }
    if (!validateUrl(rawUrl)) {
      setError('Please enter a valid URL')
      return
    }
    if (siteStatus().atLimit) {
      setError('Collection is at max capacity (30 sites)')
      return
    }

    // Duplicate URL check
    const isDuplicate = props.collection.sites.some((s) => s.url === rawUrl)
    if (isDuplicate) {
      showToast('URL already exists', {
        type: 'warning',
        body: `This URL is already saved in "${props.collection.name}".`,
      })
      return
    }

    setSaving(true)
    setError('')

    const updated = addSiteToCollection(props.collection, {
      url: rawUrl,
      title: title().trim() || rawUrl,
      favicon: faviconUrl(),
    })

    await updateCollection(updated)
    setSaving(false)
    props.onClose()
  }

  return (
    <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; background: var(--katab-color-surface-secondary); border-top: 1px solid var(--katab-color-border);">
      <Show when={siteStatus().nearLimit && !siteStatus().atLimit}>
        <div style="padding: 8px 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; font-size: 12px; color: #92400e;">
          ⚠️ {siteStatus().count}/30 sites — approaching limit
        </div>
      </Show>

      <div style="display: flex; gap: 8px;">
        <input
          type="url"
          placeholder="https://example.com"
          value={url()}
          onInput={(e) => {
            setUrl(e.currentTarget.value)
            setTabFavicon('')
            setError('')
          }}
          style="flex: 1; padding: 8px 10px; border: 1px solid var(--katab-color-border); border-radius: 6px; font-size: 13px; outline: none; background: var(--katab-color-surface); color: var(--katab-color-text-primary);"
          // biome-ignore lint/a11y/noAutofocus: intentional focus for add site input
          autofocus
        />
        <button
          onClick={handleAddCurrentTab}
          title="Use current tab"
          style="padding: 8px 12px; border: 1px solid var(--katab-color-border); border-radius: 6px; background: var(--katab-color-surface); cursor: pointer; font-size: 12px; color: var(--katab-color-text-secondary); white-space: nowrap; flex-shrink: 0;"
        >
          Current tab
        </button>
      </div>

      <input
        type="text"
        placeholder="Title (optional)"
        value={title()}
        onInput={(e) => setTitle(e.currentTarget.value)}
        style="padding: 8px 10px; border: 1px solid var(--katab-color-border); border-radius: 6px; font-size: 13px; outline: none; background: var(--katab-color-surface); color: var(--katab-color-text-primary);"
      />

      <Show when={error()}>
        <div style="font-size: 12px; color: #ef4444;">{error()}</div>
      </Show>

      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button
          onClick={props.onClose}
          style="padding: 6px 14px; border: 1px solid var(--katab-color-border); border-radius: 6px; background: transparent; cursor: pointer; font-size: 13px;"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving() || siteStatus().atLimit}
          style={`padding: 6px 14px; border: none; border-radius: 6px; background: var(--katab-color-accent); color: #fff; cursor: pointer; font-size: 13px; font-weight: 500; opacity: ${saving() || siteStatus().atLimit ? '0.6' : '1'};`}
        >
          {saving() ? 'Adding…' : 'Add site'}
        </button>
      </div>
    </div>
  )
}

export default AddSitePanel
