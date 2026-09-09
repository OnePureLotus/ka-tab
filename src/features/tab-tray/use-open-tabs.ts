import { createMemo } from 'solid-js'
import { tabTrayStore } from './store'
import { normalizeTrayUrl } from './utils'

export function useOpenTabUrlSet() {
  return createMemo(() => {
    const set = new Set<string>()
    for (const tab of tabTrayStore.openTabs) {
      const key = normalizeTrayUrl(tab.url)
      if (key) set.add(key)
    }
    return set
  })
}

export function useIsUrlOpen(url: () => string) {
  const openUrls = useOpenTabUrlSet()
  return createMemo(() => openUrls().has(normalizeTrayUrl(url())))
}
