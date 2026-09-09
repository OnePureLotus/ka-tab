import type { Component } from 'solid-js'
import { For, Show, createMemo, createSignal } from 'solid-js'
import { Portal } from 'solid-js/web'
import { COLLECTION_CARD_MIN_HEIGHT } from '../constants'
import { validateSiteLimit } from '../service'
import { collectionsStore } from '../store'
import type { Collection } from '../types'
import CollectionSiteRow from './CollectionSiteRow'

interface CollectionCardProps {
  collection: Collection
  onRename: (id: string, name: string) => void
  onChangeColor: (id: string, color: string) => void
  onDelete: (id: string) => void
  onAddSite: (id: string) => void
  onOpenModal: (id: string) => void
  onOpenCollection: (id: string) => void
  onEditSite: (collectionId: string, siteId: string) => void
  onDeleteSite: (collectionId: string, siteId: string) => void
  onTabDrop?: (url: string, title: string, favicon: string) => void
}

const CollectionCard: Component<CollectionCardProps> = (props) => {
  const [menuOpen, setMenuOpen] = createSignal(false)
  const [menuPos, setMenuPos] = createSignal({ top: 0, right: 0 })
  const [renaming, setRenaming] = createSignal(false)
  const [newName, setNewName] = createSignal(props.collection.name)
  const [isDragOver, setIsDragOver] = createSignal(false)
  let dragEnterCount = 0
  let cancelRename = false

  function openMenu(e: MouseEvent) {
    e.stopPropagation()
    const btn = e.currentTarget as HTMLElement
    const rect = btn.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuOpen(true)
  }

  function onDocClick() {
    setMenuOpen(false)
  }

  const collection = createMemo(() => {
    const matches = collectionsStore.items.filter((c) => c.id === props.collection.id)
    if (matches.length === 0) return props.collection
    return matches.reduce((best, cur) => {
      if (cur.updatedAt > best.updatedAt) return cur
      if (cur.updatedAt < best.updatedAt) return best
      return cur.sites.length > best.sites.length ? cur : best
    }, matches[0]!)
  })

  const siteStatus = createMemo(() => validateSiteLimit(collection()))

  function handleRenameSubmit() {
    if (cancelRename) {
      cancelRename = false
      return
    }
    const name = newName().trim()
    if (name && name !== collection().name) {
      props.onRename(collection().id, name)
    }
    setRenaming(false)
  }

  function handleOpenAll() {
    props.onOpenCollection(collection().id)
  }

  const accentColor = () => collection().color || 'var(--katab-color-accent)'

  return (
    <div
      ref={(el) => {
        el.addEventListener('dragenter', (e) => {
          const de = e as DragEvent
          if (de.dataTransfer?.types.includes('application/katab-tab')) {
            dragEnterCount++
            setIsDragOver(true)
          }
        })
        el.addEventListener('dragleave', () => {
          dragEnterCount--
          if (dragEnterCount <= 0) {
            dragEnterCount = 0
            setIsDragOver(false)
          }
        })
        el.addEventListener('dragover', (e) => {
          const de = e as DragEvent
          if (de.dataTransfer?.types.includes('application/katab-tab')) {
            de.preventDefault()
          }
        })
        el.addEventListener('drop', (e) => {
          const de = e as DragEvent
          de.preventDefault()
          de.stopPropagation()
          dragEnterCount = 0
          setIsDragOver(false)
          const raw = de.dataTransfer?.getData('application/katab-tab')
          if (!raw) return
          try {
            const { url, title, favicon } = JSON.parse(raw) as {
              url: string
              title: string
              favicon: string
            }
            props.onTabDrop?.(url, title, favicon)
          } catch {}
        })
      }}
      style={`background: var(--katab-color-surface); border: 2px solid ${isDragOver() ? 'var(--katab-color-accent)' : accentColor()}; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; box-shadow: ${isDragOver() ? '0 0 0 4px color-mix(in srgb, var(--katab-color-accent) 20%, transparent)' : '0 1px 3px rgba(0,0,0,0.06)'}; min-height: ${COLLECTION_CARD_MIN_HEIGHT}px; transition: border-color 150ms, box-shadow 150ms;`}
    >
      {/* Tinted Header */}
      <div
        style={`height: 52px; padding: 0 14px; display: flex; align-items: center; gap: 10px; background: color-mix(in srgb, ${accentColor()} 15%, var(--katab-color-surface)); flex-shrink: 0;`}
      >
        <div
          style={`width: 12px; height: 12px; border-radius: 6px; background: ${accentColor()}; flex-shrink: 0;`}
        />

        <Show
          when={!renaming()}
          fallback={
            <input
              value={newName()}
              onInput={(e) => setNewName(e.currentTarget.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') {
                  cancelRename = true
                  setRenaming(false)
                }
              }}
              style="flex: 1; font-weight: 600; font-size: 14px; border: 1px solid var(--katab-color-accent); border-radius: 4px; padding: 2px 6px; outline: none; background: var(--katab-color-surface); color: var(--katab-color-text-primary);"
              autofocus
            />
          }
        >
          <span
            style="flex: 1; font-weight: 600; font-size: 14px; color: var(--katab-color-text-primary); cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
            onClick={() => props.onOpenModal(collection().id)}
          >
            {collection().name}
          </span>
        </Show>

        <button
          onClick={openMenu}
          style="width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--katab-color-text-secondary); font-size: 14px; font-weight: 700; letter-spacing: 1px; flex-shrink: 0;"
          title="More options"
        >
          ...
        </button>
      </div>

      {/* Dropdown menu Portal */}
      <Show when={menuOpen()}>
        <Portal>
          <div style="position: fixed; inset: 0; z-index: 999;" onClick={onDocClick} />
          <div
            style={`position: fixed; top: ${menuPos().top}px; right: ${menuPos().right}px; background: var(--katab-color-surface); border: 1px solid var(--katab-color-border); border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.16); z-index: 1000; min-width: 180px; padding: 6px 0; overflow: hidden;`}
          >
            {/* Section label */}
            <div style="padding: 4px 14px 6px; font-size: 10px; font-weight: 700; color: var(--katab-color-text-muted); letter-spacing: 0.08em;">
              COLLECTION
            </div>

            {/* Rename */}
            <button
              onClick={() => {
                setMenuOpen(false)
                setRenaming(true)
                setNewName(collection().name)
              }}
              style="display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 8px 14px; border: none; background: transparent; cursor: pointer; font-size: 13px; color: var(--katab-color-text-primary); transition: background 100ms;"
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background =
                  'var(--katab-color-surface-secondary)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--katab-color-text-secondary); flex-shrink: 0; border: 1.5px solid var(--katab-color-text-secondary); border-radius: 3px;">
                T
              </span>
              <span>Change name</span>
            </button>

            {/* Change color */}
            <button
              onClick={() => {
                setMenuOpen(false)
                props.onChangeColor(collection().id, collection().color)
              }}
              style="display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 8px 14px; border: none; background: transparent; cursor: pointer; font-size: 13px; color: var(--katab-color-text-primary); transition: background 100ms;"
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background =
                  'var(--katab-color-surface-secondary)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span
                style={
                  'width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;'
                }
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5" />
                  <circle cx="7" cy="7" r="2.5" fill={accentColor()} />
                </svg>
              </span>
              <span>Change color</span>
            </button>

            {/* Separator */}
            <div style="height: 1px; background: var(--katab-color-border); margin: 4px 0;" />

            {/* Delete */}
            <button
              onClick={() => {
                setMenuOpen(false)
                props.onDelete(collection().id)
              }}
              style="display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 8px 14px; border: none; background: transparent; cursor: pointer; font-size: 13px; color: #ef4444; transition: background 100ms;"
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background =
                  'color-mix(in srgb, #ef4444 8%, var(--katab-color-surface))'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #ef4444; flex-shrink: 0; line-height: 1;">
                &times;
              </span>
              <span>Delete</span>
            </button>
          </div>
        </Portal>
      </Show>

      {/* Sites list */}
      <div style="padding: 6px 0;">
        <For each={collection().sites}>
          {(site) => (
            <CollectionSiteRow
              site={site}
              collectionColor={collection().color}
              variant="card"
              onEdit={() => props.onEditSite(collection().id, site.id)}
              onDelete={() => props.onDeleteSite(collection().id, site.id)}
            />
          )}
        </For>
      </div>

      {/* Footer */}
      <div style="display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid var(--katab-color-border); flex-shrink: 0;">
        <button
          onClick={() => props.onAddSite(collection().id)}
          disabled={siteStatus().atLimit}
          style={`flex: 1; padding: 7px 10px; border: 1px solid var(--katab-color-border); border-radius: 7px; background: var(--katab-color-surface); cursor: ${siteStatus().atLimit ? 'not-allowed' : 'pointer'}; font-size: 12px; font-weight: 500; color: var(--katab-color-text-primary); opacity: ${siteStatus().atLimit ? '0.5' : '1'};`}
        >
          + Add site
        </button>
        <button
          onClick={handleOpenAll}
          disabled={collection().sites.length === 0}
          style={`width: 90px; flex-shrink: 0; padding: 7px 10px; border: none; border-radius: 7px; background: var(--katab-color-accent); color: #fff; cursor: ${collection().sites.length === 0 ? 'not-allowed' : 'pointer'}; font-size: 12px; font-weight: 500; opacity: ${collection().sites.length === 0 ? '0.5' : '1'};`}
        >
          Open all
        </button>
      </div>
    </div>
  )
}

export default CollectionCard
