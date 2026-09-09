import EllipsisTitle from '@/shared/components/EllipsisTitle'
import SiteFavicon from '@/shared/components/SiteFavicon'
import { sendCommand } from '@/shared/messaging/client'
import { MessageType } from '@/shared/messaging/types'
import type { Component } from 'solid-js'
import { Show, createSignal } from 'solid-js'
import type { RecentlyClosedEntry, TabEntry } from '../types'
import { hostnameFromUrl } from '../utils'

const actionBtnStyle =
  'width: 26px; height: 26px; border: none; background: transparent; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 100ms, opacity 150ms;'

type OpenTabRowProps = {
  variant: 'open'
  tab: TabEntry
}

type RecentTabRowProps = {
  variant: 'recent'
  entry: RecentlyClosedEntry
}

type TabTrayItemRowProps = OpenTabRowProps | RecentTabRowProps

const TabTrayItemRow: Component<TabTrayItemRowProps> = (props) => {
  const [hovered, setHovered] = createSignal(false)

  const title = () =>
    props.variant === 'open'
      ? props.tab.title || props.tab.url
      : props.entry.title || props.entry.url

  const url = () => (props.variant === 'open' ? props.tab.url : props.entry.url)

  const favicon = () =>
    props.variant === 'open' ? (props.tab.favIconUrl ?? '') : (props.entry.favIconUrl ?? '')

  const rowStyle = () => {
    if (props.variant === 'open') {
      return 'display: flex; align-items: center; gap: 10px; padding: 7px 8px; background: var(--katab-color-surface-secondary); border-radius: 7px; cursor: grab; min-height: 46px; box-sizing: border-box;'
    }
    return 'display: flex; align-items: center; gap: 10px; padding: 7px 8px; background: var(--katab-color-surface); border: 1px solid var(--katab-color-border); border-radius: 7px; cursor: grab; opacity: 0.8; min-height: 46px; box-sizing: border-box;'
  }

  const canDismiss = () => props.variant === 'recent' && props.entry.sessionId !== undefined

  async function handleRowClick() {
    if (props.variant === 'open') {
      await sendCommand({ type: MessageType.TAB_FOCUS, payload: { tabId: props.tab.id } })
      return
    }
    if (props.entry.sessionId) {
      await sendCommand({ type: MessageType.TAB_RESTORE, payload: props.entry.sessionId })
    }
  }

  async function handleRemove(e: MouseEvent) {
    e.stopPropagation()
    if (props.variant === 'open') {
      await sendCommand({ type: MessageType.TAB_CLOSE, payload: { tabId: props.tab.id } })
      return
    }
    if (!canDismiss()) return
    await sendCommand({
      type: MessageType.TAB_DISMISS_RECENT,
      payload: { sessionId: props.entry.sessionId! },
    })
  }

  function handleDragStart(e: DragEvent) {
    const data = JSON.stringify({
      url: url(),
      title: title(),
      favicon: favicon(),
    })
    e.dataTransfer?.setData('application/katab-tab', data)
  }

  return (
    <div
      style={rowStyle()}
      onClick={() => void handleRowClick()}
      draggable={true}
      onDragStart={handleDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <SiteFavicon favicon={favicon()} url={url()} title={title()} size={18} />

      <div style="flex: 1; overflow: hidden; min-width: 0;">
        <EllipsisTitle
          text={title()}
          showTooltip={hovered()}
          textStyle="font-size: 12px; font-weight: 500; color: var(--katab-color-text-primary); line-height: 1.3;"
        />
        <Show when={url()}>
          <div style="font-size: 10px; color: var(--katab-color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; margin-top: 1px;">
            {hostnameFromUrl(url())}
          </div>
        </Show>
      </div>

      <Show when={props.variant === 'open' || canDismiss()}>
        <div
          style={`display: flex; align-items: center; flex-shrink: 0; opacity: ${hovered() ? 1 : 0}; pointer-events: ${hovered() ? 'auto' : 'none'}; transition: opacity 150ms;`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            data-testid="tab-tray-remove"
            title={props.variant === 'open' ? 'Close tab' : 'Remove from list'}
            onClick={(e) => void handleRemove(e)}
            style={`${actionBtnStyle} color: #ef4444;`}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background =
                'color-mix(in srgb, #ef4444 10%, transparent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            ×
          </button>
        </div>
      </Show>
    </div>
  )
}

export default TabTrayItemRow
