import { createStore } from 'solid-js/store'
import type { Settings } from './types'
import { DEFAULT_SETTINGS } from './types'

const [settingsStore, setSettingsStore] = createStore<Settings>({ ...DEFAULT_SETTINGS })

export { settingsStore, setSettingsStore }
