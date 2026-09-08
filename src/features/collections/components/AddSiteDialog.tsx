import SiteFavicon from '@/shared/components/SiteFavicon'
import { sendCommand } from '@/shared/messaging/client'
import { MessageType } from '@/shared/messaging/types'
import { showToast } from '@/shared/toast'
import type { Component } from 'solid-js'
import { Show, createMemo, createSignal } from 'solid-js'
import { Portal } from 'solid-js/web'
import { addSiteToCollection, validateSiteLimit } from '../service'
import { updateCollection } from '../store'
import type { Collection } from '../types'

interface AddSiteDialogProps {
  collection: Collection
  onClose: () => void
}

const AddSiteDialog: Component<AddSiteDialogProps> = (props) => {
  const [url, setUrl] = createSignal('')
  const [title, setTitle] = createSignal('')
  const [tabFavicon, setTabFavicon] = createSignal('')
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal('')

  const siteStatus = () => validateSiteLimit(props.collection)
  const accentColor = () => props.collection.color || 'var(--katab-color-accent)'

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

  async function handleUseCurrentTab() {
    try {
      const tabs = await sendCommand<void, chrome.tabs.Tab[]>({
        type: MessageType.TAB_GET_CURRENT,
        payload: undefined,
      })
      const active = tabs[0]
      if (active) {
        setUrl(active.url ?? '')
        setTitle(active.title ?? '')
        setTabFavicon(active.favIconUrl ?? '')
      }
    } catch (err) {
      console.error('[KaTab] Failed to get current tab', err)
    }
  }

  async function handleAdd() {
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
      // Prefer resolved favicon from active tab; fall back to Google API
      favicon: tabFavicon() || getFaviconUrl(rawUrl),
    })
    await updateCollection(updated)
    setSaving(false)
    props.onClose()
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Escape') props.onClose()
  }

  // Preview derived values — only compute when URL is structurally valid
  const previewDomain = createMemo(() => {
    try {
      return new URL(url().trim()).hostname
    } catch {
      return ''
    }
  })
  const previewTitle = createMemo(() => title().trim() || url().trim())
  // Favicon URL is derived lazily: prefer resolved tab favicon, fall back to Google API only when URL parses correctly
  const previewFavicon = createMemo(() => tabFavicon() || getFaviconUrl(url().trim()))

  return (
    <Portal>
      {/* Scrim */}
      <div
        style="position: fixed; inset: 0; background: rgba(99,102,241,0.12); z-index: 300; display: flex; align-items: center; justify-content: center;"
        onClick={props.onClose}
      >
        {/* Dialog */}
        <div
          style="background: var(--katab-color-surface); border: 1px solid var(--katab-color-border); border-radius: 12px; box-shadow: 0 18px 44px rgba(0,0,0,0.14); width: 500px; max-width: calc(100vw - 48px); overflow: hidden;"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div style="padding: 26px 32px 12px;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                <div
                  style={`width: 12px; height: 12px; border-radius: 6px; background: ${accentColor()}; flex-shrink: 0; margin-top: 4px;`}
                />
                <h2 style="font-size: 22px; font-weight: 700; color: var(--katab-color-text-primary); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  Add site to {props.collection.name}
                </h2>
              </div>
              <button
                onClick={props.onClose}
                style="width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; font-size: 18px; font-weight: 600; color: var(--katab-color-text-muted); display: flex; align-items: center; justify-content: center; border-radius: 6px; flex-shrink: 0; line-height: 1;"
                title="Close"
              >
                ×
              </button>
            </div>
            <p style="font-size: 13px; color: var(--katab-color-text-secondary); margin: 0 0 0 26px;">
              Add a URL manually or use the active browser tab.
            </p>
          </div>

          <div style="padding: 0 32px 28px;">
            {/* Limit warning */}
            <Show when={siteStatus().nearLimit || siteStatus().atLimit}>
              <div style="padding: 10px 16px; background: #fffbeb; border: 1px solid #92400e; border-radius: 8px; font-size: 12px; font-weight: 500; color: #92400e; margin-bottom: 20px;">
                {siteStatus().count}/30 sites used.
                {siteStatus().atLimit
                  ? ' Collection is full.'
                  : ' You will see a warning after 25 sites.'}
              </div>
            </Show>

            {/* Site URL field */}
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--katab-color-text-site); margin-bottom: 8px;">
                Site URL *
              </label>
              <div style="position: relative;">
                <input
                  type="url"
                  placeholder="https://platform.openai.com/docs"
                  value={url()}
                  onInput={(e) => {
                    setUrl(e.currentTarget.value)
                    setTabFavicon('')
                    setError('')
                  }}
                  autofocus
                  style="width: 100%; height: 42px; padding: 0 148px 0 14px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 13px; background: var(--katab-color-surface-secondary); color: var(--katab-color-text-primary); outline: none; box-sizing: border-box; transition: border-color 150ms;"
                  onFocusIn={(e) => {
                    ;(e.currentTarget as HTMLInputElement).style.borderColor =
                      'var(--katab-color-accent)'
                  }}
                  onFocusOut={(e) => {
                    ;(e.currentTarget as HTMLInputElement).style.borderColor =
                      'var(--katab-color-border)'
                  }}
                />
                <button
                  onClick={handleUseCurrentTab}
                  style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); height: 34px; padding: 0 12px; border: 1px solid var(--katab-color-border); border-radius: 7px; background: var(--katab-color-surface); cursor: pointer; font-size: 12px; font-weight: 600; color: var(--katab-color-accent); white-space: nowrap;"
                >
                  Use current tab
                </button>
              </div>
            </div>

            {/* Title field */}
            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--katab-color-text-site); margin-bottom: 8px;">
                Title
              </label>
              <input
                type="text"
                placeholder="OpenAI Docs"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
                style="width: 100%; height: 42px; padding: 0 14px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 13px; background: var(--katab-color-surface-secondary); color: var(--katab-color-text-primary); outline: none; box-sizing: border-box; transition: border-color 150ms;"
                onFocusIn={(e) => {
                  ;(e.currentTarget as HTMLInputElement).style.borderColor =
                    'var(--katab-color-accent)'
                }}
                onFocusOut={(e) => {
                  ;(e.currentTarget as HTMLInputElement).style.borderColor =
                    'var(--katab-color-border)'
                }}
              />
              <p style="font-size: 11px; color: var(--katab-color-text-muted); margin: 5px 0 0;">
                Optional. If empty, KaTab uses the URL as title.
              </p>
            </div>

            {/* Preview row */}
            <Show when={url().trim()}>
              <div style="display: flex; align-items: center; gap: 10px; padding: 0 14px; height: 46px; border: 1px solid var(--katab-color-border); border-radius: 8px; background: var(--katab-color-surface-secondary); margin-bottom: 20px;">
                <SiteFavicon
                  favicon={previewFavicon()}
                  url={url().trim()}
                  title={previewTitle()}
                  size={18}
                />
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 13px; font-weight: 600; color: var(--katab-color-text-site); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">
                    {previewTitle()}
                  </div>
                  <div style="font-size: 10px; color: var(--katab-color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {previewDomain()}
                  </div>
                </div>
                <span style="font-size: 11px; font-weight: 500; color: var(--katab-color-text-secondary); flex-shrink: 0;">
                  Preview
                </span>
              </div>
            </Show>

            {/* Error */}
            <Show when={error()}>
              <div style="font-size: 12px; color: #ef4444; margin-bottom: 12px;">{error()}</div>
            </Show>

            {/* Actions */}
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button
                onClick={props.onClose}
                style="height: 36px; padding: 0 22px; border: 1px solid var(--katab-color-border); border-radius: 8px; background: var(--katab-color-surface); cursor: pointer; font-size: 12px; font-weight: 600; color: var(--katab-color-accent);"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving() || siteStatus().atLimit}
                style={`height: 36px; padding: 0 22px; border: none; border-radius: 8px; background: var(--katab-color-accent); color: #fff; cursor: ${saving() || siteStatus().atLimit ? 'not-allowed' : 'pointer'}; font-size: 12px; font-weight: 600; opacity: ${saving() || siteStatus().atLimit ? '0.6' : '1'}; min-width: 90px;`}
              >
                {saving() ? 'Adding…' : 'Add site'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default AddSiteDialog
