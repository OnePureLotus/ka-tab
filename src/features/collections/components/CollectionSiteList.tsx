import type { Component } from 'solid-js'
import { For, Show, createSignal } from 'solid-js'
import { SITE_REORDER_MIME } from '../constants'
import { reorderSitesById } from '../service'
import { updateCollection } from '../store'
import type { Collection, Site } from '../types'
import CollectionSiteRow from './CollectionSiteRow'

interface CollectionSiteListProps {
  collection: Collection
  sites: Site[]
  variant: 'card' | 'modal'
  collectionColor?: string
  searchQuery?: string
  onEdit: (siteId: string) => void
  onDelete: (siteId: string) => void
  emptyFallback?: string
}

const CollectionSiteList: Component<CollectionSiteListProps> = (props) => {
  const [draggingSiteId, setDraggingSiteId] = createSignal<string | null>(null)
  const [dragOverSiteId, setDragOverSiteId] = createSignal<string | null>(null)

  const sortable = () => !props.searchQuery?.trim()

  async function handleDrop(targetSiteId: string) {
    const fromSiteId = draggingSiteId()
    if (!fromSiteId || fromSiteId === targetSiteId) {
      setDraggingSiteId(null)
      setDragOverSiteId(null)
      return
    }

    const updated = reorderSitesById(props.collection, fromSiteId, targetSiteId)
    if (updated !== props.collection) {
      await updateCollection(updated)
    }
    setDraggingSiteId(null)
    setDragOverSiteId(null)
  }

  function handleDragEnd() {
    setDraggingSiteId(null)
    setDragOverSiteId(null)
  }

  return (
    <Show
      when={props.sites.length > 0}
      fallback={
        <div style="padding: 24px; text-align: center; color: var(--katab-color-text-secondary); font-size: 13px;">
          {props.emptyFallback ?? 'No sites found'}
        </div>
      }
    >
      <For each={props.sites}>
        {(site) => (
          <CollectionSiteRow
            site={site}
            collectionColor={props.collectionColor}
            variant={props.variant}
            sortable={sortable()}
            dragOver={dragOverSiteId() === site.id}
            onDragHandleStart={(e) => {
              e.stopPropagation()
              setDraggingSiteId(site.id)
              e.dataTransfer?.setData(SITE_REORDER_MIME, site.id)
              e.dataTransfer!.effectAllowed = 'move'
            }}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => {
              if (!sortable()) return
              if (!e.dataTransfer?.types.includes(SITE_REORDER_MIME)) return
              e.preventDefault()
              setDragOverSiteId(site.id)
            }}
            onDragLeave={() => {
              if (dragOverSiteId() === site.id) setDragOverSiteId(null)
            }}
            onDrop={() => void handleDrop(site.id)}
            onEdit={() => props.onEdit(site.id)}
            onDelete={() => props.onDelete(site.id)}
          />
        )}
      </For>
    </Show>
  )
}

export default CollectionSiteList
