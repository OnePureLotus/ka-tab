import { useIsUrlOpen } from '@/features/tab-tray/use-open-tabs'
import EllipsisTitle from '@/shared/components/EllipsisTitle'
import SiteFavicon from '@/shared/components/SiteFavicon'
import type { Component } from 'solid-js'
import { Show, createSignal } from 'solid-js'
import type { Site } from '../types'

interface CollectionSiteRowProps {
  site: Site
  collectionColor?: string | undefined
  variant?: 'card' | 'modal'
  sortable?: boolean
  dragOver?: boolean
  onEdit: () => void
  onDelete: () => void
  onOpen?: () => void
  onDragHandleStart?: (e: DragEvent) => void
  onDragEnd?: () => void
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
  const isOpen = useIsUrlOpen(() => props.site.url)
  const accentColor = () => props.collectionColor || 'var(--katab-color-accent)'

  function rowBackground() {
    if (props.dragOver) return 'var(--katab-color-surface-secondary)'
    if (isOpen()) return `color-mix(in srgb, ${accentColor()} 20%, var(--katab-color-surface))`
    if (hovered()) return 'var(--katab-color-surface-secondary)'
    return 'transparent'
  }

  function rowStyle() {
    const isModal = variant() === 'modal'
    const inset = isModal ? '' : 'margin: 0 8px; border-radius: 5px;'
    return `display: flex; align-items: center; gap: ${isModal ? '10px' : '8px'}; padding: ${isModal ? '10px 14px' : '5px 10px'}; border-bottom: ${isModal ? '1px solid var(--katab-color-border)' : 'none'}; border-left: ${isOpen() ? `3px solid ${accentColor()}` : '3px solid transparent'}; background: ${rowBackground()}; cursor: pointer; transition: background 100ms, border-color 100ms; ${inset}`
  }

  function handleRowClick() {
    if (props.onOpen) {
      props.onOpen()
    } else {
      chrome.tabs.create({ url: props.site.url })
    }
  }

  return (
    <div
      class="collection-site-row"
      data-open={isOpen() ? 'true' : 'false'}
      data-site-id={props.site.id}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
      style={rowStyle()}
      onClick={handleRowClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Show when={props.sortable}>
        <span
          data-testid="site-drag-handle"
          draggable={true}
          title="Drag to reorder"
          style="cursor: grab; color: var(--katab-color-text-secondary); font-size: 14px; flex-shrink: 0; touch-action: none;"
          onClick={(e) => e.stopPropagation()}
          onDragStart={(e) => props.onDragHandleStart?.(e)}
          onDragEnd={() => props.onDragEnd?.()}
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
        style={`position: relative; flex-shrink: 0; width: ${isOpen() || hovered() ? '54px' : '0'}; height: 26px; overflow: visible; transition: width 150ms;`}
        onClick={(e) => e.stopPropagation()}
      >
        <Show when={isOpen() && !hovered()}>
          <span
            aria-label="Open in browser"
            style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex-shrink: 0;"
          />
        </Show>
        <div
          style={`position: absolute; right: 0; top: 0; display: flex; align-items: center; gap: 2px; opacity: ${hovered() ? 1 : 0}; pointer-events: ${hovered() ? 'auto' : 'none'}; transition: opacity 150ms;`}
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
    </div>
  )
}

export default CollectionSiteRow
