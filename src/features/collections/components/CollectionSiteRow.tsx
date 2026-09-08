import EllipsisTitle from '@/shared/components/EllipsisTitle'
import SiteFavicon from '@/shared/components/SiteFavicon'
import type { Component } from 'solid-js'
import { Show, createSignal } from 'solid-js'
import type { Site } from '../types'

interface CollectionSiteRowProps {
  site: Site
  variant?: 'card' | 'modal'
  dragOver?: boolean
  onEdit: () => void
  onDelete: () => void
  onOpen?: () => void
  draggable?: boolean
  onDragStart?: () => void
  onDragOver?: (e: DragEvent) => void
  onDragLeave?: () => void
  onDrop?: () => void
}

const actionBtnStyle =
  'width: 26px; height: 26px; border: none; background: transparent; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 100ms, opacity 150ms;'

const CollectionSiteRow: Component<CollectionSiteRowProps> = (props) => {
  const [hovered, setHovered] = createSignal(false)
  const variant = () => props.variant ?? 'card'
  const displayTitle = () => props.site.title || props.site.url

  function handleRowClick() {
    if (props.onOpen) {
      props.onOpen()
    } else {
      chrome.tabs.create({ url: props.site.url })
    }
  }

  return (
    <div
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
      style={`display: flex; align-items: center; gap: ${variant() === 'modal' ? '10px' : '8px'}; padding: ${variant() === 'modal' ? '10px 14px' : '5px 14px'}; border-bottom: ${variant() === 'modal' ? '1px solid var(--katab-color-border)' : 'none'}; background: ${props.dragOver ? 'var(--katab-color-surface-secondary)' : hovered() ? 'var(--katab-color-surface-secondary)' : 'transparent'}; cursor: pointer; transition: background 100ms;`}
      onClick={handleRowClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Show when={variant() === 'modal'}>
        <span
          style="cursor: grab; color: var(--katab-color-text-secondary); font-size: 14px; flex-shrink: 0;"
          onClick={(e) => e.stopPropagation()}
        >
          {String.fromCodePoint(0x2807)}
        </span>
      </Show>

      <SiteFavicon
        favicon={props.site.favicon}
        url={props.site.url}
        title={props.site.title}
        size={variant() === 'modal' ? 16 : 18}
      />

      <Show
        when={variant() === 'modal'}
        fallback={
          <EllipsisTitle
            text={displayTitle()}
            showTooltip={hovered()}
            textStyle="font-size: 12px; font-weight: 500; color: var(--katab-color-text-site);"
          />
        }
      >
        <div style="flex: 1; min-width: 0; overflow: hidden;">
          <EllipsisTitle
            text={displayTitle()}
            showTooltip={hovered()}
            textStyle="font-size: 13px; color: var(--katab-color-text-primary);"
          />
          <div style="font-size: 11px; color: var(--katab-color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {props.site.url}
          </div>
        </div>
      </Show>

      <div
        style={`display: flex; align-items: center; gap: 2px; flex-shrink: 0; opacity: ${hovered() ? 1 : 0}; pointer-events: ${hovered() ? 'auto' : 'none'}; transition: opacity 150ms;`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          title="Edit site"
          onClick={props.onEdit}
          style={`${actionBtnStyle} color: var(--katab-color-text-secondary);`}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--katab-color-surface)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          title="Remove site"
          onClick={props.onDelete}
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
    </div>
  )
}

export default CollectionSiteRow
