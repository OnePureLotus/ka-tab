import { createBoard } from '@/features/boards/service'
import type { Board } from '@/features/boards/types'
import { DEFAULT_BOARD_NAME } from '@/features/boards/types'
import type { Collection } from '@/features/collections/types'
import type { Settings } from '@/features/settings/types'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
import type { WebDavConfig } from '@/features/sync/webdav/types'
import { DEFAULT_WEBDAV_CONFIG } from '@/features/sync/webdav/types'
import type { SyncRuntimeStatus } from '@/features/sync/webdav/types'
import { sendCommand } from '@/shared/messaging/client'
import { MessageType } from '@/shared/messaging/types'
import {
  getAllBoards,
  getAllCollections,
  getAllNotes,
  getSettings,
  setBoard,
  setSettings,
} from '@/shared/storage/client'
import type { Component } from 'solid-js'
import { For, Show, createSignal, onMount } from 'solid-js'
import { render } from 'solid-js/web'

function applyTheme(theme: Settings['theme']) {
  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark')
  if (theme === 'light') root.classList.add('theme-light')
  else if (theme === 'dark') root.classList.add('theme-dark')
}

// ─── Accent color presets ─────────────────────────────────────────────────────

const ACCENT_PRESETS = [
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Green', value: '#059669' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#0f766e' },
] as const

// ─── Shared token helpers ─────────────────────────────────────────────────────

const T = {
  bg: 'var(--katab-color-bg)',
  surface: 'var(--katab-color-surface)',
  surfaceSec: 'var(--katab-color-surface-secondary)',
  border: 'var(--katab-color-border)',
  accent: 'var(--katab-color-accent)',
  textPrimary: 'var(--katab-color-text-primary)',
  textSecondary: 'var(--katab-color-text-secondary)',
  textMuted: 'var(--katab-color-text-muted)',
  chipBg: 'var(--katab-color-chip-bg)',
  chipText: 'var(--katab-color-chip-text)',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingCard(props: { title: string; description: string; children: any }) {
  return (
    <div
      style={`background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 12px;`}
    >
      <div>
        <div
          style={`font-size: 16px; font-weight: 600; color: ${T.textPrimary}; margin-bottom: 6px;`}
        >
          {props.title}
        </div>
        <div style={`font-size: 12px; color: ${T.textSecondary}; line-height: 1.5;`}>
          {props.description}
        </div>
      </div>
      {props.children}
    </div>
  )
}

// ─── Main Options App ─────────────────────────────────────────────────────────

type NavSection = 'appearance' | 'data' | 'sync' | 'privacy'

const OptionsApp: Component = () => {
  const [settings, setLocalSettings] = createSignal<Settings>({ ...DEFAULT_SETTINGS })
  const [collections, setCollections] = createSignal<Collection[]>([])
  const [notesCount, setNotesCount] = createSignal(0)
  const sitesCount = () => collections().reduce((sum, c) => sum + c.sites.length, 0)
  const [newDomain, setNewDomain] = createSignal('')
  const [saved, setSaved] = createSignal(false)
  const [activeSection, setActiveSection] = createSignal<NavSection>('appearance')
  const [webdav, setWebdav] = createSignal<WebDavConfig>({ ...DEFAULT_WEBDAV_CONFIG })
  const [syncStatus, setSyncStatus] = createSignal<SyncRuntimeStatus | null>(null)
  const [syncMessage, setSyncMessage] = createSignal('')
  const [syncBusy, setSyncBusy] = createSignal(false)

  type SyncCommandResult = { ok: boolean; data?: unknown; error?: string }

  onMount(async () => {
    const [s, cols, notes, configRes] = await Promise.all([
      getSettings(),
      getAllCollections(),
      getAllNotes(),
      sendCommand<undefined, SyncCommandResult>({ type: MessageType.WEBDAV_GET_CONFIG }),
    ])
    setLocalSettings(s)
    setCollections(cols)
    setNotesCount(notes.length)
    applyTheme(s.theme)
    if (configRes.ok && configRes.data) setWebdav(configRes.data as WebDavConfig)
    void refreshSyncStatus()
  })

  async function refreshSyncStatus() {
    const res = await sendCommand<undefined, SyncCommandResult>({
      type: MessageType.SYNC_STATUS_GET,
    })
    if (res.ok && res.data) {
      const { runtime } = res.data as { runtime: SyncRuntimeStatus }
      setSyncStatus(runtime)
    }
  }

  async function saveWebDavConfig() {
    setSyncBusy(true)
    setSyncMessage('')
    try {
      const res = await sendCommand<WebDavConfig, SyncCommandResult>({
        type: MessageType.WEBDAV_SAVE_CONFIG,
        payload: webdav(),
      })
      if (!res.ok) setSyncMessage(String(res.error ?? 'Failed to save'))
      else setSyncMessage('Configuration saved')
    } finally {
      setSyncBusy(false)
    }
  }

  async function testConnection() {
    setSyncBusy(true)
    setSyncMessage('')
    try {
      const res = await sendCommand<WebDavConfig, SyncCommandResult>({
        type: MessageType.WEBDAV_TEST_CONNECTION,
        payload: webdav(),
      })
      setSyncMessage(res.ok ? 'Connection successful' : String(res.error ?? 'Connection failed'))
    } finally {
      setSyncBusy(false)
    }
  }

  async function runSync(type: 'SYNC_NOW' | 'SYNC_PUSH' | 'SYNC_PULL') {
    setSyncBusy(true)
    setSyncMessage('')
    try {
      const res = await sendCommand<undefined, SyncCommandResult>({
        type: MessageType[type],
      })
      if (res.ok) setSyncMessage('Sync completed')
      else setSyncMessage(String(res.error ?? 'Sync failed'))
      await refreshSyncStatus()
    } finally {
      setSyncBusy(false)
    }
  }

  async function refreshCounts() {
    const [cols, notes] = await Promise.all([getAllCollections(), getAllNotes()])
    setCollections(cols)
    setNotesCount(notes.length)
  }

  async function save() {
    await setSettings(settings())
    applyTheme(settings().theme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addBlockedDomain() {
    const d = newDomain()
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
    if (!d) return
    if (settings().blockedDomains.includes(d)) return
    setLocalSettings((s) => ({ ...s, blockedDomains: [...s.blockedDomains, d] }))
    setNewDomain('')
    save()
  }

  function removeBlockedDomain(domain: string) {
    setLocalSettings((s) => ({
      ...s,
      blockedDomains: s.blockedDomains.filter((x) => x !== domain),
    }))
    save()
  }

  async function exportData() {
    const boards = await getAllBoards()
    const cols = await getAllCollections()
    const s = await getSettings()
    const allNotes = await getAllNotes()
    const blob = new Blob(
      [JSON.stringify({ boards, collections: cols, notes: allNotes, settings: s }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `katab-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text) as {
          boards?: Board[]
          collections?: Collection[]
          settings?: Settings
        }
        if (data.settings) {
          await setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
          const s = await getSettings()
          setLocalSettings(s)
        }
        const { setCollection } = await import('@/shared/storage/client')
        if (data.boards) {
          for (const board of data.boards) await setBoard(board)
        }
        if (data.collections) {
          if (!data.boards) {
            const board = createBoard(
              DEFAULT_BOARD_NAME,
              data.collections.map((c) => c.id),
            )
            await setBoard(board)
            for (const col of data.collections) {
              await setCollection({ ...col, boardId: col.boardId ?? board.id })
            }
          } else {
            for (const col of data.collections) await setCollection(col)
          }
        }
        alert('Data imported successfully. Reload the new tab page.')
      } catch (err) {
        alert(`Import failed: ${err}`)
      }
    }
    input.click()
  }

  const navItems: Array<{ id: NavSection; label: string; prefix: string }> = [
    { id: 'appearance', label: 'Appearance', prefix: 'Aa' },
    { id: 'data', label: 'Data & Backup', prefix: 'DB' },
    { id: 'sync', label: 'WebDAV Sync', prefix: 'Wd' },
    { id: 'privacy', label: 'Privacy', prefix: 'Sh' },
  ]

  return (
    <div
      style={`display: flex; flex-direction: column; height: 100vh; font-family: var(--katab-font-sans); background: ${T.bg}; color: ${T.textPrimary};`}
    >
      {/* ── Topbar ───────────────────────────────────────────────────────────── */}
      <header
        style={`height: 64px; background: ${T.surface}; border-bottom: 1px solid ${T.border}; display: flex; align-items: center; padding: 0 28px; gap: 0; flex-shrink: 0;`}
      >
        {/* Logo */}
        <span style={`font-size: 22px; font-weight: 700; color: ${T.accent};`}>K</span>
        <span
          style={`font-size: 22px; font-weight: 700; color: ${T.textPrimary}; margin-right: 28px;`}
        >
          aTab
        </span>
        {/* Page title + subtitle */}
        <span
          style={`font-size: 22px; font-weight: 700; color: ${T.textPrimary}; margin-right: 16px;`}
        >
          Settings
        </span>
        <span style={`font-size: 13px; color: ${T.textSecondary};`}>
          Customize your new tab workspace
        </span>
        {/* Spacer */}
        <div style="flex: 1;" />
        {/* Back button */}
        <button
          onClick={() => chrome.tabs.create({ url: 'chrome://newtab/' })}
          style={`height: 36px; padding: 0 16px; border: 1px solid ${T.border}; border-radius: 8px; background: ${T.surface}; color: ${T.accent}; cursor: pointer; font-size: 12px; font-weight: 600;`}
        >
          Back to new tab
        </button>
      </header>

      {/* ── Body (sidebar + content) ─────────────────────────────────────────── */}
      <div style="display: flex; flex: 1; overflow: hidden;">
        {/* Sidebar */}
        <aside
          style={`width: 260px; flex-shrink: 0; background: ${T.surface}; border-right: 1px solid ${T.border}; display: flex; flex-direction: column; padding-top: 20px;`}
        >
          <span
            style={`font-size: 11px; font-weight: 600; color: ${T.textMuted}; padding: 0 28px 12px; letter-spacing: 0.06em;`}
          >
            SETTINGS
          </span>

          {/* Nav items */}
          <nav style="flex: 1; padding: 0 8px;">
            <For each={navItems}>
              {(item) => {
                const isActive = () => activeSection() === item.id
                return (
                  <button
                    onClick={() => {
                      setActiveSection(item.id)
                      if (item.id === 'data') void refreshCounts()
                    }}
                    style={`display: flex; align-items: center; gap: 10px; width: 100%; padding: 0 14px; height: 42px; border: none; border-radius: 8px; cursor: pointer; text-align: left; font-size: 13px; background: ${isActive() ? T.chipBg : 'transparent'}; color: ${isActive() ? T.accent : T.textSecondary}; font-weight: ${isActive() ? '600' : '500'}; margin-bottom: 2px;`}
                  >
                    <span style={'font-size: 11px; font-weight: 700; width: 22px; opacity: 0.6;'}>
                      {item.prefix}
                    </span>
                    {item.label}
                  </button>
                )
              }}
            </For>
          </nav>
        </aside>

        {/* Main content */}
        <main style="flex: 1; overflow-y: auto; padding: 32px 40px;">
          {/* ── Appearance section ───────────────────────────────────────────── */}
          <Show when={activeSection() === 'appearance'}>
            <h1
              style={`font-size: 34px; font-weight: 700; color: ${T.textPrimary}; margin: 0 0 8px;`}
            >
              Appearance &amp; Behavior
            </h1>
            <p style={`font-size: 14px; color: ${T.textSecondary}; margin: 0 0 28px;`}>
              Simple controls for theme, opening behavior, saving, and backup.
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;">
              {/* Theme card */}
              <SettingCard
                title="Theme"
                description="Follow system by default, or force a specific appearance."
              >
                <div style="display: flex; gap: 8px;">
                  <For each={['system', 'light', 'dark'] as const}>
                    {(t) => {
                      const isActive = () => settings().theme === t
                      return (
                        <button
                          onClick={() => {
                            setLocalSettings((s) => ({ ...s, theme: t }))
                            save()
                          }}
                          style={`padding: 0 18px; height: 32px; border-radius: 8px; border: 1px solid ${isActive() ? T.accent : T.border}; background: ${isActive() ? T.chipBg : T.surfaceSec}; color: ${isActive() ? T.accent : T.textPrimary}; cursor: pointer; font-size: 12px; font-weight: 600;`}
                        >
                          {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
                        </button>
                      )
                    }}
                  </For>
                </div>
              </SettingCard>

              {/* Accent Color card */}
              <SettingCard
                title="Accent Color"
                description="Primary actions, focus rings, and selected controls."
              >
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  <For each={ACCENT_PRESETS}>
                    {(preset) => {
                      const isActive = () => settings().accentColor === preset.value
                      return (
                        <button
                          onClick={() => {
                            setLocalSettings((s) => ({ ...s, accentColor: preset.value }))
                            save()
                          }}
                          style={`display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 9px; border: 1px solid ${isActive() ? preset.value : T.border}; background: ${isActive() ? `color-mix(in srgb, ${preset.value} 12%, var(--katab-color-surface))` : T.surfaceSec}; cursor: pointer;`}
                          title={`${preset.name} ${preset.value}`}
                        >
                          <div
                            style={`width: 22px; height: 22px; border-radius: 6px; background: ${preset.value}; flex-shrink: 0;`}
                          />
                          <div style="text-align: left;">
                            <div
                              style={`font-size: 12px; font-weight: 600; color: ${T.textPrimary};`}
                            >
                              {preset.name}
                            </div>
                            <div
                              style={`font-size: 10px; color: ${T.textMuted}; font-family: monospace;`}
                            >
                              {preset.value.toUpperCase()}
                            </div>
                          </div>
                        </button>
                      )
                    }}
                  </For>
                </div>
                {/* Custom color fallback */}
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                  <input
                    type="color"
                    value={settings().accentColor}
                    onInput={(e) => {
                      setLocalSettings((s) => ({ ...s, accentColor: e.currentTarget.value }))
                      save()
                    }}
                    style={`width: 32px; height: 32px; border: 1px solid ${T.border}; border-radius: 6px; cursor: pointer; padding: 2px; background: ${T.surface};`}
                  />
                  <span
                    style={`font-size: 12px; color: ${T.textSecondary}; font-family: monospace;`}
                  >
                    Custom: {settings().accentColor.toUpperCase()}
                  </span>
                </div>
              </SettingCard>

              {/* Open Collection card */}
              <SettingCard
                title="Open Collection"
                description="Choose what happens when a collection is opened."
              >
                <div style="display: flex; gap: 10px;">
                  <For
                    each={
                      [
                        { id: 'tab-group', label: 'Tab Group', sub: 'Current window' },
                        { id: 'new-window', label: 'New Window', sub: 'Separate window' },
                      ] as const
                    }
                  >
                    {(option) => {
                      const isActive = () => settings().openCollectionMode === option.id
                      return (
                        <button
                          onClick={() => {
                            setLocalSettings((s) => ({ ...s, openCollectionMode: option.id }))
                            save()
                          }}
                          style={`flex: 1; padding: 12px 14px; border-radius: 10px; border: 1px solid ${isActive() ? T.accent : T.border}; background: ${isActive() ? T.chipBg : T.surfaceSec}; cursor: pointer; text-align: left; display: flex; align-items: flex-start; gap: 10px;`}
                        >
                          {/* Custom radio dot */}
                          <div
                            style={`width: 20px; height: 20px; border-radius: 10px; border: 2px solid ${isActive() ? T.accent : T.border}; background: ${isActive() ? T.accent : 'transparent'}; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 1px;`}
                          >
                            <Show when={isActive()}>
                              <div style="width: 8px; height: 8px; border-radius: 4px; background: #fff;" />
                            </Show>
                          </div>
                          <div>
                            <div
                              style={`font-size: 13px; font-weight: 600; color: ${isActive() ? T.accent : T.textPrimary};`}
                            >
                              {option.label}
                            </div>
                            <div
                              style={`font-size: 11px; color: ${T.textSecondary}; margin-top: 2px;`}
                            >
                              {option.sub}
                            </div>
                          </div>
                        </button>
                      )
                    }}
                  </For>
                </div>
              </SettingCard>

              {/* Floating Save Button card */}
              <SettingCard
                title="Floating Save Button"
                description="Hide the web-selection save button on listed domains."
              >
                <div style="display: flex; gap: 8px;">
                  <input
                    type="text"
                    placeholder="docs.google.com"
                    value={newDomain()}
                    onInput={(e) => setNewDomain(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addBlockedDomain()
                    }}
                    style={`flex: 1; height: 38px; padding: 0 12px; border: 1px solid ${T.border}; border-radius: 8px; background: ${T.surfaceSec}; color: ${T.textPrimary}; font-size: 12px; outline: none; font-family: var(--katab-font-sans);`}
                  />
                  <button
                    onClick={addBlockedDomain}
                    style={`height: 38px; padding: 0 16px; border: none; border-radius: 8px; background: ${T.accent}; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0;`}
                  >
                    Add
                  </button>
                </div>
                <Show when={settings().blockedDomains.length > 0}>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    <For each={settings().blockedDomains}>
                      {(domain) => (
                        <span
                          style={`display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; height: 30px; background: ${T.surfaceSec}; border: 1px solid ${T.border}; border-radius: 7px; font-size: 11px; font-weight: 500; color: ${T.textPrimary}; font-family: var(--katab-font-mono);`}
                        >
                          {domain}
                          <button
                            onClick={() => removeBlockedDomain(domain)}
                            style={`border: none; background: none; cursor: pointer; color: ${T.textMuted}; font-size: 11px; font-weight: 600; padding: 0; line-height: 1;`}
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </For>
                  </div>
                </Show>
              </SettingCard>

              {/* Data & Backup card */}
              <SettingCard
                title="Data & Backup"
                description="Export or restore Collections, Notes, and Settings as JSON."
              >
                <div style="display: flex; gap: 40px; margin-bottom: 4px;">
                  <div>
                    <div
                      style={`font-size: 12px; font-weight: 500; color: ${T.textSecondary}; margin-bottom: 4px;`}
                    >
                      Collections
                    </div>
                    <div style={`font-size: 24px; font-weight: 700; color: ${T.textPrimary};`}>
                      {collections().length}
                    </div>
                  </div>
                  <div>
                    <div
                      style={`font-size: 12px; font-weight: 500; color: ${T.textSecondary}; margin-bottom: 4px;`}
                    >
                      Sites
                    </div>
                    <div style={`font-size: 24px; font-weight: 700; color: ${T.textPrimary};`}>
                      {sitesCount()}
                    </div>
                  </div>
                  <div>
                    <div
                      style={`font-size: 12px; font-weight: 500; color: ${T.textSecondary}; margin-bottom: 4px;`}
                    >
                      Notes
                    </div>
                    <div style={`font-size: 24px; font-weight: 700; color: ${T.textPrimary};`}>
                      {notesCount()}
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 10px;">
                  <button
                    onClick={exportData}
                    style="height: 36px; padding: 0 18px; background: #059669; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600;"
                  >
                    Export Backup
                  </button>
                  <button
                    onClick={importData}
                    style={`height: 36px; padding: 0 18px; background: ${T.surface}; color: ${T.accent}; border: 1px solid ${T.border}; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600;`}
                  >
                    Import Backup
                  </button>
                </div>
              </SettingCard>
            </div>

            {/* Save button */}
            <div style="margin-top: 28px;">
              <button
                onClick={save}
                style={`height: 40px; padding: 0 28px; border: none; border-radius: 8px; background: ${saved() ? '#10b981' : T.accent}; color: #fff; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 200ms;`}
              >
                {saved() ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>
          </Show>

          {/* ── Data & Backup section ────────────────────────────────────────── */}
          <Show when={activeSection() === 'data'}>
            <h1
              style={`font-size: 34px; font-weight: 700; color: ${T.textPrimary}; margin: 0 0 8px;`}
            >
              Data &amp; Backup
            </h1>
            <p style={`font-size: 14px; color: ${T.textSecondary}; margin: 0 0 28px;`}>
              Export or restore Collections, Notes, and Settings as JSON.
            </p>

            <div
              style={`background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 10px; padding: 24px; max-width: 560px;`}
            >
              {/* Stats */}
              <div style="display: flex; gap: 40px; margin-bottom: 20px;">
                <div>
                  <div
                    style={`font-size: 12px; font-weight: 500; color: ${T.textSecondary}; margin-bottom: 4px;`}
                  >
                    Collections
                  </div>
                  <div style={`font-size: 24px; font-weight: 700; color: ${T.textPrimary};`}>
                    {collections().length}
                  </div>
                </div>
                <div>
                  <div
                    style={`font-size: 12px; font-weight: 500; color: ${T.textSecondary}; margin-bottom: 4px;`}
                  >
                    Sites
                  </div>
                  <div style={`font-size: 24px; font-weight: 700; color: ${T.textPrimary};`}>
                    {sitesCount()}
                  </div>
                </div>
                <div>
                  <div
                    style={`font-size: 12px; font-weight: 500; color: ${T.textSecondary}; margin-bottom: 4px;`}
                  >
                    Notes
                  </div>
                  <div style={`font-size: 24px; font-weight: 700; color: ${T.textPrimary};`}>
                    {notesCount()}
                  </div>
                </div>
              </div>
              {/* Buttons */}
              <div style="display: flex; gap: 10px;">
                <button
                  onClick={exportData}
                  style="height: 36px; padding: 0 20px; background: #059669; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600;"
                >
                  Export Backup
                </button>
                <button
                  onClick={importData}
                  style={`height: 36px; padding: 0 20px; background: ${T.surface}; color: ${T.accent}; border: 1px solid ${T.border}; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600;`}
                >
                  Import Backup
                </button>
              </div>
            </div>
          </Show>

          {/* ── WebDAV Sync section ──────────────────────────────────────────── */}
          <Show when={activeSection() === 'sync'}>
            <h1
              style={`font-size: 34px; font-weight: 700; color: ${T.textPrimary}; margin: 0 0 8px;`}
            >
              WebDAV Sync
            </h1>
            <p style={`font-size: 14px; color: ${T.textSecondary}; margin: 0 0 28px;`}>
              Sync boards, collections, notes, and settings to your own WebDAV server. Credentials
              are stored locally on this device only.
            </p>

            <div
              style={`background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 10px; padding: 24px; max-width: 640px; display: flex; flex-direction: column; gap: 16px;`}
            >
              <label style="display: flex; align-items: center; gap: 10px; font-size: 13px;">
                <input
                  type="checkbox"
                  checked={webdav().enabled}
                  onChange={(e) => setWebdav((c) => ({ ...c, enabled: e.currentTarget.checked }))}
                />
                Enable WebDAV sync
              </label>

              <div>
                <div
                  style={`font-size: 12px; font-weight: 600; color: ${T.textSecondary}; margin-bottom: 6px;`}
                >
                  Server URL
                </div>
                <input
                  type="url"
                  placeholder="https://dav.example.com/remote.php/dav/files/user/"
                  value={webdav().baseUrl}
                  onInput={(e) => setWebdav((c) => ({ ...c, baseUrl: e.currentTarget.value }))}
                  style={`width: 100%; height: 36px; padding: 0 12px; border: 1px solid ${T.border}; border-radius: 8px; font-size: 13px; background: ${T.surfaceSec}; color: ${T.textPrimary}; box-sizing: border-box;`}
                />
              </div>

              <div>
                <div
                  style={`font-size: 12px; font-weight: 600; color: ${T.textSecondary}; margin-bottom: 6px;`}
                >
                  Remote file path
                </div>
                <input
                  type="text"
                  placeholder="/katab-sync.json"
                  value={webdav().remotePath}
                  onInput={(e) => setWebdav((c) => ({ ...c, remotePath: e.currentTarget.value }))}
                  style={`width: 100%; height: 36px; padding: 0 12px; border: 1px solid ${T.border}; border-radius: 8px; font-size: 13px; background: ${T.surfaceSec}; color: ${T.textPrimary}; box-sizing: border-box;`}
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <div
                    style={`font-size: 12px; font-weight: 600; color: ${T.textSecondary}; margin-bottom: 6px;`}
                  >
                    Username
                  </div>
                  <input
                    type="text"
                    value={webdav().username}
                    onInput={(e) => setWebdav((c) => ({ ...c, username: e.currentTarget.value }))}
                    style={`width: 100%; height: 36px; padding: 0 12px; border: 1px solid ${T.border}; border-radius: 8px; font-size: 13px; background: ${T.surfaceSec}; color: ${T.textPrimary}; box-sizing: border-box;`}
                  />
                </div>
                <div>
                  <div
                    style={`font-size: 12px; font-weight: 600; color: ${T.textSecondary}; margin-bottom: 6px;`}
                  >
                    Password
                  </div>
                  <input
                    type="password"
                    value={webdav().password}
                    onInput={(e) => setWebdav((c) => ({ ...c, password: e.currentTarget.value }))}
                    style={`width: 100%; height: 36px; padding: 0 12px; border: 1px solid ${T.border}; border-radius: 8px; font-size: 13px; background: ${T.surfaceSec}; color: ${T.textPrimary}; box-sizing: border-box;`}
                  />
                </div>
              </div>

              <Show when={syncStatus()}>
                {(status) => (
                  <div style={`font-size: 12px; color: ${T.textSecondary}; line-height: 1.6;`}>
                    Status: {status().phase}
                    {status().lastSuccessAt
                      ? ` · Last success: ${new Date(status().lastSuccessAt ?? 0).toLocaleString()}`
                      : ''}
                    {status().lastError ? ` · Error: ${status().lastError}` : ''}
                  </div>
                )}
              </Show>

              <Show when={syncMessage()}>
                <div style={`font-size: 12px; color: ${T.textPrimary};`}>{syncMessage()}</div>
              </Show>

              <div style="display: flex; flex-wrap: gap: 10px;">
                <button
                  type="button"
                  disabled={syncBusy()}
                  onClick={() => saveWebDavConfig()}
                  style={`height: 36px; padding: 0 16px; border: none; border-radius: 8px; background: ${T.accent}; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600; opacity: ${syncBusy() ? 0.6 : 1};`}
                >
                  Save config
                </button>
                <button
                  type="button"
                  disabled={syncBusy()}
                  onClick={() => testConnection()}
                  style={`height: 36px; padding: 0 16px; border: 1px solid ${T.border}; border-radius: 8px; background: ${T.surface}; color: ${T.accent}; cursor: pointer; font-size: 12px; font-weight: 600; opacity: ${syncBusy() ? 0.6 : 1};`}
                >
                  Test connection
                </button>
                <button
                  type="button"
                  disabled={syncBusy()}
                  onClick={() => runSync('SYNC_NOW')}
                  style={`height: 36px; padding: 0 16px; border: none; border-radius: 8px; background: #059669; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600; opacity: ${syncBusy() ? 0.6 : 1};`}
                >
                  Sync now
                </button>
                <button
                  type="button"
                  disabled={syncBusy()}
                  onClick={() => runSync('SYNC_PUSH')}
                  style={`height: 36px; padding: 0 16px; border: 1px solid ${T.border}; border-radius: 8px; background: ${T.surface}; cursor: pointer; font-size: 12px; font-weight: 600; opacity: ${syncBusy() ? 0.6 : 1};`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  disabled={syncBusy()}
                  onClick={() => runSync('SYNC_PULL')}
                  style={`height: 36px; padding: 0 16px; border: 1px solid ${T.border}; border-radius: 8px; background: ${T.surface}; cursor: pointer; font-size: 12px; font-weight: 600; opacity: ${syncBusy() ? 0.6 : 1};`}
                >
                  Download
                </button>
              </div>
            </div>
          </Show>

          {/* ── Privacy section ──────────────────────────────────────────────── */}
          <Show when={activeSection() === 'privacy'}>
            <h1
              style={`font-size: 34px; font-weight: 700; color: ${T.textPrimary}; margin: 0 0 8px;`}
            >
              Privacy
            </h1>
            <p style={`font-size: 14px; color: ${T.textSecondary}; margin: 0 0 28px;`}>
              Data is stored locally in your browser. Optional WebDAV sync sends a JSON snapshot to
              a server you configure — credentials never leave this device except to authenticate
              with your server.
            </p>

            <div
              style={`background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 10px; padding: 24px; max-width: 480px; font-size: 13px; color: ${T.textSecondary}; line-height: 1.6;`}
            >
              KaTab does not use Google or Microsoft account sync. Configure WebDAV under the Sync
              tab to back up and sync across your own devices. If two devices edit the same item,
              resolve conflicts from the new tab page banner.
            </div>
          </Show>
        </main>
      </div>
    </div>
  )
}

const root = document.getElementById('app')
if (!root) throw new Error('Root element #app not found')

render(() => <OptionsApp />, root)
