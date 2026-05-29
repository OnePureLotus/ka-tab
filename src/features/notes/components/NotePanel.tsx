import type { Component } from 'solid-js'
import { createSignal, Show, For, onMount, onCleanup } from 'solid-js'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { notesStore, loadNotes, addNote, removeNote } from '../store'
import { createNote } from '../service'
import { formatRelativeTime } from '@/shared/utils/time'
import Skeleton from '@/shared/components/Skeleton'
import { storage, STORAGE_KEYS } from '@/shared/storage/client'
import type { Note } from '../types'

function renderMarkdown(content: string): string {
  const html = marked.parse(content, { async: false }) as string
  return DOMPurify.sanitize(html)
}

// --- NoteCard ---

interface NoteCardProps {
  note: Note
  onDelete: () => void
}

const NoteCard: Component<NoteCardProps> = (props) => {
  const [hovered, setHovered] = createSignal(false)

  return (
    <div
      style="margin: 8px 12px; border: 1px solid var(--katab-color-border); border-radius: 8px; padding: 10px 12px; background: var(--katab-color-surface); position: relative;"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style="font-size: 12px; color: var(--katab-color-text-site); line-height: 1.5; max-height: 120px; overflow: hidden;"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by DOMPurify
        innerHTML={renderMarkdown(props.note.content)}
      />

      <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
        <span style="font-size: 10px; color: var(--katab-color-text-muted);">
          {formatRelativeTime(props.note.createdAt)}
          <Show when={props.note.sourceDomain}>
            {' · '}
            {props.note.sourceDomain}
          </Show>
        </span>
      </div>

      <Show when={hovered()}>
        <button
          onClick={props.onDelete}
          style="position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border: none; background: #fee2e2; color: #dc2626; border-radius: 4px; cursor: pointer; font-size: 12px;"
          title="Delete note"
        >
          ×
        </button>
      </Show>
    </div>
  )
}

// --- NotePanel ---

const NotePanel: Component = () => {
  const [newContent, setNewContent] = createSignal('')
  const [saving, setSaving] = createSignal(false)

  onMount(() => {
    loadNotes()

    const unwatch = storage.watch<string[]>(STORAGE_KEYS.NOTES_INDEX as `sync:${string}`, () => {
      loadNotes()
    })
    onCleanup(unwatch)
  })

  async function handleSave() {
    const content = newContent().trim()
    if (!content) return
    setSaving(true)
    const note = createNote(content)
    await addNote(note)
    setNewContent('')
    setSaving(false)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div style="display: flex; flex-direction: column; height: 100%; background: var(--katab-color-surface);">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 10px; flex-shrink: 0;">
        <span style="font-size: 20px; font-weight: 600; color: var(--katab-color-text-secondary);">
          Notes
        </span>
      </div>

      <div style="height: 1px; background: var(--katab-color-border); flex-shrink: 0;" />

      <div style="padding: 12px 14px; border-bottom: 1px solid var(--katab-color-border); flex-shrink: 0;">
        <textarea
          placeholder="Capture an idea or paste selected text..."
          value={newContent()}
          onInput={(e) => setNewContent(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          style="width: 100%; padding: 8px 10px; border: 1px solid var(--katab-color-border); border-radius: 8px; font-size: 12px; resize: none; outline: none; background: var(--katab-color-surface-secondary); color: var(--katab-color-text-primary); font-family: var(--katab-font-sans); box-sizing: border-box;"
          onFocusIn={(e) => {
            ;(e.currentTarget as HTMLTextAreaElement).style.borderColor =
              'var(--katab-color-accent)'
          }}
          onFocusOut={(e) => {
            ;(e.currentTarget as HTMLTextAreaElement).style.borderColor =
              'var(--katab-color-border)'
          }}
        />
        <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
          <button
            onClick={handleSave}
            disabled={saving() || !newContent().trim()}
            style={`height: 32px; padding: 0 18px; border: none; border-radius: 7px; background: var(--katab-color-accent); color: #fff; cursor: pointer; font-size: 12px; font-weight: 600; opacity: ${saving() || !newContent().trim() ? '0.5' : '1'};`}
          >
            {saving() ? '...' : 'Save'}
          </button>
        </div>
      </div>

      <div style="flex: 1; overflow-y: auto;">
        <Show when={notesStore.loading}>
          <div style="padding: 12px; display: flex; flex-direction: column; gap: 12px;">
            <For each={[1, 2]}>
              {() => (
                <div style="display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid var(--katab-color-border); border-radius: 8px;">
                  <Skeleton height="13px" />
                  <Skeleton height="13px" width="80%" />
                  <Skeleton height="10px" width="40%" />
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={!notesStore.loading && notesStore.items.length === 0}>
          <div style="padding: 24px 16px; text-align: center; color: var(--katab-color-text-secondary); font-size: 13px;">
            <div style="font-size: 28px; margin-bottom: 8px;">📝</div>
            <div>No notes yet.</div>
            <div>Select text on any page or type above</div>
          </div>
        </Show>

        <For each={notesStore.items}>
          {(note) => <NoteCard note={note} onDelete={() => removeNote(note.id)} />}
        </For>
      </div>
    </div>
  )
}

export default NotePanel
