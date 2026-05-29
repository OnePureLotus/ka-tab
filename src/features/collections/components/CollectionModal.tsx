import type { Component } from 'solid-js'
import { createSignal, createMemo, Show, For } from 'solid-js'
import type { Collection } from '../types'
import Modal from '@/shared/components/Modal'
import { removeSiteFromCollection, reorderSitesInCollection } from '../service'
import { updateCollection } from '../store'
import SiteFavicon from '@/shared/components/SiteFavicon'

interface CollectionModalProps {
  open: boolean
  collection: Collection | null
  onClose: () => void
  onAddSite: (collectionId: string) => void
  onOpenCollection: (collectionId: string) => void
}

const CollectionModal: Component<CollectionModalProps> = (props) => {
  const [search, setSearch] = createSignal('')
  const [dragging, setDragging] = createSignal<number | null>(null)
  const [dragOver, setDragOver] = createSignal<number | null>(null)

  const filteredSites = createMemo(() => {
    const q = search().toLowerCase()
    const sites = props.collection?.sites ?? []
    if (!q) return sites
    return sites.filter((s) => s.title.toLowerCase().includes(q) || s.url.toLowerCase().includes(q))
  })

  async function handleDeleteSite(siteId: string) {
    if (!props.collection) return
    const updated = removeSiteFromCollection(props.collection, siteId)
    await updateCollection(updated)
  }

  async function handleDrop(toIndex: number) {
    const fromIndex = dragging()
    if (fromIndex === null || !props.collection) return
    const updated = reorderSitesInCollection(props.collection, fromIndex, toIndex)
    await updateCollection(updated)
    setDragging(null)
    setDragOver(null)
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title={props.collection?.name ?? ''}>
      <div style="display: flex; flex-direction: column; gap: 16px; max-height: 70vh;">
        <input
          type="text"
          placeholder="Search sites..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          style="padding: 8px 12px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 13px; outline: none; background: var(--katab-color-surface); color: var(--katab-color-text-primary);"
        />
        <div style="overflow-y: auto; flex: 1; border: 1px solid var(--katab-color-border); border-radius: 8px;">
          <Show
            when={filteredSites().length > 0}
            fallback={
              <div style="padding: 24px; text-align: center; color: var(--katab-color-text-secondary); font-size: 13px;">
                No sites found
              </div>
            }
          >
            <For each={filteredSites()}>
              {(site, idx) => (
                <div
                  style={`display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--katab-color-border); background: ${dragOver() === idx() ? 'var(--katab-color-surface-secondary)' : 'transparent'};`}
                  draggable
                  onDragStart={() => setDragging(idx())}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(idx())
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDrop(idx())}
                >
                  <span style="cursor: grab; color: var(--katab-color-text-secondary); font-size: 14px; flex-shrink: 0;">
                    {String.fromCodePoint(0x2807)}
                  </span>
                  <SiteFavicon favicon={site.favicon} url={site.url} title={site.title} size={16} />
                  <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 13px; color: var(--katab-color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {site.title || site.url}
                    </div>
                    <div style="font-size: 11px; color: var(--katab-color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {site.url}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSite(site.id)}
                    style="width: 26px; height: 26px; border: none; background: transparent; cursor: pointer; border-radius: 4px; color: #ef4444; font-size: 14px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;"
                    title="Remove site"
                  >
                    x
                  </button>
                </div>
              )}
            </For>
          </Show>
        </div>
        <div style="display: flex; gap: 10px; justify-content: space-between; padding-top: 4px;">
          <button
            onClick={() => props.collection && props.onAddSite(props.collection.id)}
            style="padding: 8px 16px; border: 1px dashed var(--katab-color-border); border-radius: 8px; background: transparent; cursor: pointer; font-size: 13px; color: var(--katab-color-text-secondary);"
          >
            Add site
          </button>
          <button
            onClick={() => props.collection && props.onOpenCollection(props.collection.id)}
            style="padding: 8px 16px; border: none; border-radius: 8px; background: var(--katab-color-accent); color: #fff; cursor: pointer; font-size: 13px; font-weight: 500;"
          >
            Open all
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CollectionModal
