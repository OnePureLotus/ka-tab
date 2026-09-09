import Skeleton from '@/shared/components/Skeleton'
import type { Component } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { tabTrayStore } from '../store'
import { normalizeTrayUrl } from '../utils'
import TabTrayItemRow from './TabTrayItemRow'

interface TabTrayProps {
  onDropToCollection?: (
    tabUrl: string,
    tabTitle: string,
    tabFavicon: string,
    collectionId: string,
  ) => void
}

const TabTray: Component<TabTrayProps> = (_props) => {
  const [openTabsExpanded, setOpenTabsExpanded] = createSignal(true)
  const [recentExpanded, setRecentExpanded] = createSignal(true)
  const [connecting, setConnecting] = createSignal(true)
  const [showReconnecting, setShowReconnecting] = createSignal(false)

  const deduplicatedOpenTabs = createMemo(() => {
    const seen = new Set<string>()
    return tabTrayStore.openTabs.filter((t) => {
      const key = normalizeTrayUrl(t.url)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  })

  const deduplicatedRecentlyClosed = createMemo(() => {
    const openUrls = new Set(deduplicatedOpenTabs().map((t) => normalizeTrayUrl(t.url)))
    const seen = new Set<string>()
    return tabTrayStore.recentlyClosed.filter((e) => {
      const key = normalizeTrayUrl(e.url)
      if (!key || seen.has(key) || openUrls.has(key)) return false
      seen.add(key)
      return true
    })
  })

  onMount(() => {
    const timer = setTimeout(() => setConnecting(false), 500)
    onCleanup(() => clearTimeout(timer))
  })

  createEffect(() => {
    if (tabTrayStore.connected || connecting()) {
      setShowReconnecting(false)
      return
    }
    const timer = setTimeout(() => setShowReconnecting(true), 1500)
    onCleanup(() => clearTimeout(timer))
  })

  return (
    <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden; user-select: none; background: var(--katab-color-surface);">
      {/* Panel Header */}
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 10px; flex-shrink: 0;">
        <span style="font-size: 13px; font-weight: 600; color: var(--katab-color-text-primary);">
          Tab Tray
        </span>
        <span style="font-size: 10px; padding: 2px 8px; background: var(--katab-color-chip-bg); color: var(--katab-color-chip-text); border-radius: 20px; font-weight: 500;">
          Drag to card
        </span>
      </div>

      <div style="height: 1px; background: var(--katab-color-border); flex-shrink: 0; margin: 0 0 4px;" />

      {/* Not connected banner — only after sustained disconnect */}
      <Show when={showReconnecting()}>
        <div style="margin: 8px; padding: 8px 10px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; font-size: 11px; color: #92400e; text-align: center;">
          Reconnecting…
        </div>
      </Show>

      {/* Loading skeleton */}
      <Show when={connecting()}>
        <div style="padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
          <For each={[1, 2, 3, 4]}>
            {() => (
              <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px;">
                <Skeleton width="18px" height="18px" borderRadius="5px" />
                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                  <Skeleton height="12px" width="80%" />
                  <Skeleton height="10px" width="50%" />
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      <div style="flex: 1; overflow-y: auto; padding-bottom: 8px;">
        <Show when={!connecting()}>
          {/* Open Tabs section */}
          <div>
            <button
              onClick={() => setOpenTabsExpanded(!openTabsExpanded())}
              style="width: 100%; display: flex; align-items: center; gap: 5px; padding: 6px 14px; border: none; background: transparent; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--katab-color-text-secondary); text-align: left;"
            >
              <span
                style={`display: inline-block; transition: transform 150ms; transform: ${openTabsExpanded() ? 'rotate(90deg)' : 'rotate(0)'};`}
              >
                ▶
              </span>
              <span>Current tabs ({deduplicatedOpenTabs().length})</span>
            </button>

            <Show when={openTabsExpanded()}>
              <div style="padding: 0 6px; display: flex; flex-direction: column; gap: 3px;">
                <For each={deduplicatedOpenTabs()}>
                  {(tab) => <TabTrayItemRow variant="open" tab={tab} />}
                </For>
              </div>
            </Show>
          </div>

          {/* Recently Closed section */}
          <div style="margin-top: 8px;">
            <button
              onClick={() => setRecentExpanded(!recentExpanded())}
              style="width: 100%; display: flex; align-items: center; gap: 5px; padding: 6px 14px; border: none; background: transparent; cursor: pointer; font-size: 12px; font-weight: 500; color: var(--katab-color-text-secondary); text-align: left;"
            >
              <span
                style={`display: inline-block; transition: transform 150ms; transform: ${recentExpanded() ? 'rotate(90deg)' : 'rotate(0)'};`}
              >
                ▶
              </span>
              <span>Recently closed ({deduplicatedRecentlyClosed().length})</span>
            </button>

            <Show when={recentExpanded()}>
              <div style="padding: 0 6px; display: flex; flex-direction: column; gap: 3px;">
                <For each={deduplicatedRecentlyClosed()}>
                  {(entry) => <TabTrayItemRow variant="recent" entry={entry} />}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default TabTray
