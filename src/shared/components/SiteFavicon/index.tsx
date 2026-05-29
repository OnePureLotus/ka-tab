import type { Component } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import { getLetterAvatar } from '@/shared/utils/letterAvatar'

interface SiteFaviconProps {
  /** Stored favicon URL from the Site record */
  favicon: string
  /** Site URL — used to derive Google favicon if `favicon` is empty */
  url: string
  /** Used for letter-avatar fallback */
  title: string
  size?: number
}

function deriveFaviconUrl(favicon: string, url: string): string {
  if (favicon) return favicon
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

/**
 * Displays the site's favicon with a letter-avatar fallback.
 * The `<img>` is only rendered when a favicon URL is available;
 * on load error it switches to the letter avatar.
 */
const SiteFavicon: Component<SiteFaviconProps> = (props) => {
  const [imgFailed, setImgFailed] = createSignal(false)

  const faviconSrc = () => deriveFaviconUrl(props.favicon, props.url)
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
