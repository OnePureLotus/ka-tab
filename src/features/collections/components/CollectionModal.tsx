import Modal from '@/shared/components/Modal'
import type { Component } from 'solid-js'
import { createMemo, createSignal } from 'solid-js'
import { removeSiteFromCollection } from '../service'
import { updateCollection } from '../store'
import type { Collection } from '../types'
import CollectionSiteList from './CollectionSiteList'

interface CollectionModalProps {
  open: boolean
  collection: Collection | null
  onClose: () => void
  onAddSite: (collectionId: string) => void
  onOpenCollection: (collectionId: string) => void
  onEditSite: (collectionId: string, siteId: string) => void
}

const CollectionModal: Component<CollectionModalProps> = (props) => {
  const [search, setSearch] = createSignal('')

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
          {props.collection && (
            <CollectionSiteList
              collection={props.collection}
              sites={filteredSites()}
              variant="modal"
              collectionColor={props.collection.color}
              searchQuery={search()}
              onEdit={(siteId) => props.onEditSite(props.collection!.id, siteId)}
              onDelete={handleDeleteSite}
            />
          )}
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
