import { faviconCacheStore } from '@/features/favicon/store'
import { resolveStoredFaviconUrl } from '@/features/favicon/utils'
import { getFaviconUrl } from '@/features/collections/utils'
import type { Component } from 'solid-js'
import { createEffect, createMemo, createSignal, on, Show } from 'solid-js'
import { getLetterAvatar } from '@/shared/utils/letterAvatar'
import { normalizeSiteUrl } from '@/shared/utils/site-url'

interface SiteFaviconProps {
  /** Stored favicon URL from the Site record */
  favicon: string
  /** Site URL — used to derive Google favicon if `favicon` is empty */
  url: string
  /** Used for letter-avatar fallback */
  title: string
  size?: number
}


/**
 * Displays the site's favicon with a letter-avatar fallback.
 * The `<img>` is only rendered when a favicon URL is available;
 * on load error it switches to the letter avatar.
 */
const SiteFavicon: Component<SiteFaviconProps> = (props) => {
  const [imgFailed, setImgFailed] = createSignal(false)

  const faviconSrc = createMemo(() => {
    void faviconCacheStore.revision
    void faviconCacheStore.loaded
    const key = normalizeSiteUrl(props.url)
    const cached = faviconCacheStore.byUrl[key]
    if (cached) return cached
    return resolveStoredFaviconUrl(props.favicon, props.url)
  })
  createEffect(
    on(
      faviconSrc,
      () => {
        setImgFailed(false)
      },
      { defer: true },
    ),
  )
  const size = () => props.size ?? 18
  const avatar = () => getLetterAvatar(props.title || props.url)
  const borderRadius = () => Math.round(size() * 0.28)

  return (
    <Show
      when={faviconSrc() && !imgFailed()}
      fallback={
        <div
          style={`width: ${size()}px; height: ${size()}px; border-radius: ${borderRadius()}px; background: ${avatar().color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: ${Math.round(size() * 0.55)}px; font-weight: 700; color: #fff;`}
        >
          {avatar().letter}
        </div>
      }
    >
      <img
        src={faviconSrc()}
        width={size()}
        height={size()}
        style={`border-radius: ${borderRadius()}px; flex-shrink: 0; object-fit: contain;`}
        alt=""
        onError={() => setImgFailed(true)}
      />
    </Show>
  )
}

export default SiteFavicon
