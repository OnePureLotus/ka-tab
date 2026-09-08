import SiteFavicon from '@/shared/components/SiteFavicon'
import { showToast } from '@/shared/toast'
import type { Component } from 'solid-js'
import { Show, createMemo, createSignal } from 'solid-js'
import { Portal } from 'solid-js/web'
import { SiteUpdateError, updateSiteInCollection } from '../service'
import { updateCollection } from '../store'
import type { Collection, Site } from '../types'
import { getFaviconUrl, isValidUrl } from '../utils'

interface EditSiteDialogProps {
  collection: Collection
  site: Site
  onClose: () => void
}

const EditSiteDialog: Component<EditSiteDialogProps> = (props) => {
  const [url, setUrl] = createSignal(props.site.url)
  const [title, setTitle] = createSignal(props.site.title)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal('')

  const accentColor = () => props.collection.color || 'var(--katab-color-accent)'

  async function handleSave() {
    const rawUrl = url().trim()
    if (!rawUrl) {
      setError('URL is required')
      return
    }
    if (!isValidUrl(rawUrl)) {
      setError('Please enter a valid URL')
      return
    }

    setSaving(true)
    setError('')
    try {
      const updated = updateSiteInCollection(props.collection, props.site.id, {
        url: rawUrl,
        title: title().trim() || rawUrl,
      })
      await updateCollection(updated)
      props.onClose()
    } catch (err) {
      if (err instanceof SiteUpdateError && err.message === 'Duplicate URL') {
        showToast('URL already exists', {
          type: 'warning',
          body: `This URL is already saved in "${props.collection.name}".`,
        })
      } else if (err instanceof SiteUpdateError) {
        setError(err.message)
      } else {
        setError('Failed to save site')
      }
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') props.onClose()
  }

  const previewDomain = createMemo(() => {
    try {
      return new URL(url().trim()).hostname
    } catch {
      return ''
    }
  })
  const previewTitle = createMemo(() => title().trim() || url().trim())
  const previewFavicon = createMemo(() => getFaviconUrl(url().trim()) || props.site.favicon)

  return (
    <Portal>
      <div
        style="position: fixed; inset: 0; background: rgba(99,102,241,0.12); z-index: 300; display: flex; align-items: center; justify-content: center;"
        onClick={props.onClose}
      >
        <div
          style="background: var(--katab-color-surface); border: 1px solid var(--katab-color-border); border-radius: 12px; box-shadow: 0 18px 44px rgba(0,0,0,0.14); width: 500px; max-width: calc(100vw - 48px); overflow: hidden;"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div style="padding: 26px 32px 12px;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                <div
                  style={`width: 12px; height: 12px; border-radius: 6px; background: ${accentColor()}; flex-shrink: 0; margin-top: 4px;`}
                />
                <h2 style="font-size: 22px; font-weight: 700; color: var(--katab-color-text-primary); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  Edit site in {props.collection.name}
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
              Update the URL or title for this saved site.
            </p>
          </div>

          <div style="padding: 0 32px 28px;">
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--katab-color-text-site); margin-bottom: 8px;">
                Site URL *
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                value={url()}
                onInput={(e) => {
                  setUrl(e.currentTarget.value)
                  setError('')
                }}
                autofocus
                style="width: 100%; height: 42px; padding: 0 14px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 13px; background: var(--katab-color-surface-secondary); color: var(--katab-color-text-primary); outline: none; box-sizing: border-box;"
              />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--katab-color-text-site); margin-bottom: 8px;">
                Title
              </label>
              <input
                type="text"
                placeholder="Site title"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
                style="width: 100%; height: 42px; padding: 0 14px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 13px; background: var(--katab-color-surface-secondary); color: var(--katab-color-text-primary); outline: none; box-sizing: border-box;"
              />
              <p style="font-size: 11px; color: var(--katab-color-text-muted); margin: 5px 0 0;">
                Optional. If empty, KaTab uses the URL as title.
              </p>
            </div>

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

            <Show when={error()}>
              <div style="font-size: 12px; color: #ef4444; margin-bottom: 12px;">{error()}</div>
            </Show>

            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button
                onClick={props.onClose}
                style="height: 36px; padding: 0 22px; border: 1px solid var(--katab-color-border); border-radius: 8px; background: var(--katab-color-surface); cursor: pointer; font-size: 12px; font-weight: 600; color: var(--katab-color-accent);"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving()}
                style={`height: 36px; padding: 0 22px; border: none; border-radius: 8px; background: var(--katab-color-accent); color: #fff; cursor: ${saving() ? 'not-allowed' : 'pointer'}; font-size: 12px; font-weight: 600; opacity: ${saving() ? '0.6' : '1'}; min-width: 90px;`}
              >
                {saving() ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default EditSiteDialog
