import type { Component } from 'solid-js'
import { createSignal, createMemo, onMount, onCleanup, Show, For } from 'solid-js'
import { tabTrayStore } from '../store'
import { connectTabTray } from '../tab-tray.port'
import { sendCommand } from '@/shared/messaging/client'
import { MessageType } from '@/shared/messaging/types'
import Skeleton from '@/shared/components/Skeleton'
import SiteFavicon from '@/shared/components/SiteFavicon'

interface TabTrayProps {
  onDropToCollection?: (
    tabUrl: string,
    tabTitle: string,
    tabFavicon: string,
    collectionId: string,
  ) => void
}

const TabTray: Component<TabTrayProps> = (props) => {
  const [openTabsExpanded, setOpenTabsExpanded] = createSignal(true)
  const [recentExpanded, setRecentExpanded] = createSignal(true)
  const [connecting, setConnecting] = createSignal(true)

  const deduplicatedOpenTabs = createMemo(() => {
    const seen = new Set<string>()
    return tabTrayStore.openTabs.filter((t) => {
      const key = t.url?.replace(/\/+$/, '') ?? ''
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  })

  const deduplicatedRecentlyClosed = createMemo(() => {
    const openUrls = new Set(deduplicatedOpenTabs().map((t) => t.url?.replace(/\/+$/, '') ?? ''))
    const seen = new Set<string>()
    return tabTrayStore.recentlyClosed.filter((e) => {
      const key = e.url?.replace(/\/+$/, '') ?? ''
      if (!key || seen.has(key) || openUrls.has(key)) return false
      seen.add(key)
      return true
    })
  })

  onMount(() => {
    const disconnect = connectTabTray()
    const timer = setTimeout(() => setConnecting(false), 500)
    onCleanup(() => {
      disconnect()
      clearTimeout(timer)
    })
  })

  async function handleFocusTab(tabId: number) {
    await sendCommand({ type: MessageType.TAB_FOCUS, payload: { tabId } })
  }

  async function handleRestoreTab(sessionId: string | undefined) {
    if (!sessionId) return
    await sendCommand({ type: MessageType.TAB_RESTORE, payload: sessionId })
  }

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

      {/* Not connected banner */}
      <Show when={!tabTrayStore.connected && !connecting()}>
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
                  {(tab) => {
                    return (
                      <div
                        style={`display: flex; align-items: center; gap: 10px; padding: 7px 8px; background: var(--katab-color-surface-secondary); border-radius: 7px; cursor: grab; min-height: 46px; box-sizing: border-box;`}
                        onClick={() => handleFocusTab(tab.id)}
                        draggable={true}
                        onPointerDown={(e) =>
                          console.log(
                            '[KaTab][TabTray] pointerdown on tab',
                            tab.title,
                            'pointerId:',
                            e.pointerId,
                          )
                        }
                        onMouseDown={() =>
                          console.log('[KaTab][TabTray] mousedown on tab', tab.title)
                        }
                        onDragStart={(e) => {
                          const data = JSON.stringify({
                            url: tab.url,
                            title: tab.title,
                            favicon: tab.favIconUrl,
                          })
                          console.log('[KaTab][TabTray] dragstart open tab', tab.title, data)
                          e.dataTransfer?.setData('application/katab-tab', data)
                        }}
                        onDragEnd={() => console.log('[KaTab][TabTray] dragend', tab.title)}
                        ref={(el) => {
                          // Verify draggable attribute is set
                          requestAnimationFrame(() => {
                            console.log(
                              '[KaTab][TabTray] tab el draggable attr:',
                              el.getAttribute('draggable'),
                              'prop:',
                              el.draggable,
                            )
                          })
                        }}
                        title={tab.url}
                      >
                        <SiteFavicon
                          favicon={tab.favIconUrl ?? ''}
                          url={tab.url ?? ''}
                          title={tab.title ?? ''}
                          size={18}
                        />
                        <div style="flex: 1; overflow: hidden; min-width: 0;">
                          <div style="font-size: 12px; font-weight: 500; color: var(--katab-color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">
                            {tab.title || tab.url}
                          </div>
                          <Show when={tab.url}>
                            <div style="font-size: 10px; color: var(--katab-color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; margin-top: 1px;">
                              {(() => {
                                try {
                                  return new URL(tab.url).hostname
                                } catch {
                                  return tab.url
                                }
                              })()}
                            </div>
                          </Show>
                        </div>
                      </div>
                    )
                  }}
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
                  {(entry) => {
                    return (
                      <div
                        style="display: flex; align-items: center; gap: 10px; padding: 7px 8px; background: var(--katab-color-surface); border: 1px solid var(--katab-color-border); border-radius: 7px; cursor: grab; opacity: 0.8; min-height: 46px; box-sizing: border-box;"
                        onClick={() => handleRestoreTab(entry.sessionId)}
                        draggable={true}
                        onDragStart={(e) => {
                          const data = JSON.stringify({
                            url: entry.url,
                            title: entry.title,
                            favicon: entry.favIconUrl,
                          })
                          console.log('[KaTab][TabTray] dragstart recent tab', entry.title, data)
                          e.dataTransfer?.setData('application/katab-tab', data)
                        }}
                        onDragEnd={() =>
                          console.log('[KaTab][TabTray] dragend recent', entry.title)
                        }
                        title={`Restore: ${entry.url}`}
                      >
                        <SiteFavicon
                          favicon={entry.favIconUrl ?? ''}
                          url={entry.url ?? ''}
                          title={entry.title ?? ''}
                          size={18}
                        />
                        <div style="flex: 1; overflow: hidden; min-width: 0;">
                          <div style="font-size: 12px; font-weight: 500; color: var(--katab-color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">
                            {entry.title || entry.url}
                          </div>
                          <div style="font-size: 10px; color: var(--katab-color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; margin-top: 1px;">
                            {(() => {
                              try {
                                return new URL(entry.url).hostname
                              } catch {
                                return ''
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    )
                  }}
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
