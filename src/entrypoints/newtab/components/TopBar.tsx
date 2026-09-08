import { boardsStore } from '@/features/boards/store'
import { collectionsStore } from '@/features/collections/store'
import { notesStore } from '@/features/notes/store'
import { sendCommand } from '@/shared/messaging/client'
import { MessageType } from '@/shared/messaging/types'
import { showToast } from '@/shared/toast'
import type { Component } from 'solid-js'
import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'

type SyncCommandResult = { ok: boolean; error?: string }

interface TopBarProps {
  onAddCollection?: () => void
  onOpenSettings?: () => void
  onSearch?: (query: string) => void
  onSwitchBoard?: (boardId: string) => void
}

interface SearchResult {
  type: 'collection' | 'site' | 'note'
  id: string
  label: string
  sub?: string
  collectionId?: string
  boardId?: string
  url?: string
}

const TopBar: Component<TopBarProps> = (props) => {
  const [query, setQuery] = createSignal('')
  const [dropdownOpen, setDropdownOpen] = createSignal(false)
  const [syncBusy, setSyncBusy] = createSignal(false)
  const [isDark, setIsDark] = createSignal(
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  onMount(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    onCleanup(() => mq.removeEventListener('change', handler))
  })

  function getBoardName(boardId: string): string {
    return boardsStore.items.find((b) => b.id === boardId)?.name ?? ''
  }

  const results = createMemo<SearchResult[]>(() => {
    const q = query().toLowerCase().trim()
    if (!q) return []

    const out: SearchResult[] = []

    for (const col of collectionsStore.items) {
      const boardName = getBoardName(col.boardId)
      if (col.name.toLowerCase().includes(q)) {
        out.push({
          type: 'collection',
          id: col.id,
          label: col.name,
          sub: boardName ? `${boardName} · ${col.sites.length} sites` : `${col.sites.length} sites`,
          boardId: col.boardId,
        })
      }
      for (const site of col.sites) {
        if (site.title.toLowerCase().includes(q) || site.url.toLowerCase().includes(q)) {
          out.push({
            type: 'site',
            id: site.id,
            label: site.title,
            sub: boardName ? `${boardName} · ${col.name}` : col.name,
            collectionId: col.id,
            boardId: col.boardId,
            url: site.url,
          })
        }
      }
    }

    for (const note of notesStore.items) {
      if (note.content.toLowerCase().includes(q)) {
        const preview = note.content.slice(0, 60).replace(/\n/g, ' ')
        out.push({
          type: 'note',
          id: note.id,
          label: preview,
          ...(note.sourceDomain ? { sub: note.sourceDomain } : {}),
        })
      }
    }

    return out.slice(0, 12)
  })

  function handleInput(value: string) {
    setQuery(value)
    props.onSearch?.(value)
    setDropdownOpen(value.trim().length > 0)
  }

  function handleResultClick(result: SearchResult) {
    setDropdownOpen(false)
    setQuery('')
    props.onSearch?.('')

    if (result.boardId) {
      props.onSwitchBoard?.(result.boardId)
    }

    if (result.type === 'site' && result.url) {
      window.open(result.url, '_blank')
    }
  }

  const typeIcon: Record<SearchResult['type'], string> = {
    collection: '📚',
    site: '🔗',
    note: '📝',
  }

  async function runManualSync(direction: 'SYNC_PUSH' | 'SYNC_PULL') {
    if (syncBusy()) return
    setSyncBusy(true)
    const label = direction === 'SYNC_PUSH' ? 'Upload' : 'Download'
    try {
      const res = await sendCommand<undefined, SyncCommandResult>({
        type: MessageType[direction],
      })
      if (res.ok) {
        showToast(`${label} completed`, { type: 'success' })
      } else {
        showToast(`${label} failed`, { type: 'error', body: String(res.error ?? 'Unknown error') })
      }
    } catch (err) {
      showToast(`${label} failed`, { type: 'error', body: String(err) })
    } finally {
      setSyncBusy(false)
    }
  }

  const actionBtnStyle =
    'height: 32px; padding: 0 12px; border-radius: 7px; border: 1px solid var(--katab-color-border); background: var(--katab-color-surface); cursor: pointer; font-size: 12px; font-weight: 600; color: var(--katab-color-text-primary); flex-shrink: 0;'

  return (
    <header style="height: 60px; display: flex; align-items: center; padding: 0 24px; gap: 16px; background: var(--katab-color-surface); border-bottom: 1px solid var(--katab-color-border); flex-shrink: 0; position: relative; z-index: 10;">
      {/* Logo */}
      <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0; cursor: default;">
        <span style="font-weight: 700; font-size: 22px; color: var(--katab-color-accent);">K</span>
        <span style="font-weight: 700; font-size: 22px; color: var(--katab-color-text-primary);">
          aTab
        </span>
      </div>

      {/* Search */}
      <div style="flex: 1; max-width: 520px; position: relative;">
        <input
          type="text"
          placeholder="/ Search collections, sites, notes…"
          value={query()}
          onInput={(e) => handleInput(e.currentTarget.value)}
          onFocus={() => {
            if (query().trim()) setDropdownOpen(true)
          }}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          style="width: 100%; height: 38px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--katab-color-border); background: var(--katab-color-surface-secondary); color: var(--katab-color-text-primary); font-size: 13px; outline: none; box-sizing: border-box; transition: border-color 150ms;"
          onFocusIn={(e) => {
            ;(e.currentTarget as HTMLInputElement).style.borderColor = 'var(--katab-color-accent)'
          }}
          onFocusOut={(e) => {
            ;(e.currentTarget as HTMLInputElement).style.borderColor = 'var(--katab-color-border)'
          }}
        />

        <Show when={dropdownOpen() && results().length > 0}>
          <div style="position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--katab-color-surface); border: 1px solid var(--katab-color-border); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); overflow: hidden; z-index: 100;">
            <For each={results()}>
              {(result) => (
                <button
                  type="button"
                  onMouseDown={() => handleResultClick(result)}
                  style="width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: none; background: transparent; cursor: pointer; text-align: left; transition: background 120ms;"
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background =
                      'var(--katab-color-surface-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  <span style="font-size: 14px; flex-shrink: 0;">{typeIcon[result.type]}</span>
                  <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 13px; color: var(--katab-color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {result.label}
                    </div>
                    <Show when={result.sub}>
                      <div style="font-size: 11px; color: var(--katab-color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        {result.sub}
                      </div>
                    </Show>
                  </div>
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div style="flex: 1;" />

      <div
        style={`padding: 0 10px; height: 24px; display: flex; align-items: center; justify-content: center; background: ${isDark() ? '#123c34' : '#ecfdf5'}; border-radius: 12px; font-size: 11px; font-weight: 500; color: ${isDark() ? '#34d399' : '#047857'}; flex-shrink: 0; white-space: nowrap;`}
      >
        {isDark() ? 'System: Dark' : 'System: Light'}
      </div>

      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        <button
          type="button"
          title="Upload local data to WebDAV"
          disabled={syncBusy()}
          onClick={() => runManualSync('SYNC_PUSH')}
          style={`${actionBtnStyle} opacity: ${syncBusy() ? 0.6 : 1};`}
        >
          Upload
        </button>
        <button
          type="button"
          title="Download data from WebDAV"
          disabled={syncBusy()}
          onClick={() => runManualSync('SYNC_PULL')}
          style={`${actionBtnStyle} opacity: ${syncBusy() ? 0.6 : 1};`}
        >
          Download
        </button>
        <button
          type="button"
          onClick={props.onOpenSettings}
          title="Settings"
          style={`${actionBtnStyle} color: var(--katab-color-accent);`}
        >
          Settings
        </button>
      </div>
    </header>
  )
}

export default TopBar
