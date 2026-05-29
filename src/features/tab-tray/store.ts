import { createStore } from 'solid-js/store'
import type { TabTrayState } from './types'

const [tabTrayStore, setTabTrayStore] = createStore<TabTrayState>({
  openTabs: [],
  recentlyClosed: [],
  connected: false,
})

export { tabTrayStore, setTabTrayStore }
