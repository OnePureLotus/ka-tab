import { defineContentScript } from 'wxt/utils/define-content-script'
import { render } from 'solid-js/web'
import FloatingPanel from './FloatingPanel'
import { getSettings } from '@/shared/storage/client'
import { watchSettings } from '@/shared/messaging/storage-sync'

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    // Load settings and check if this domain is blocked
    let blockedDomains: string[] = []

    function isDomainBlocked(): boolean {
      const host = window.location.hostname.replace(/^www\./, '')
      return blockedDomains.some((d) => {
        const domain = d.replace(/^www\./, '')
        return host === domain || host.endsWith(`.${domain}`)
      })
    }

    const settings = await getSettings()
    blockedDomains = settings.blockedDomains ?? []

    // Watch for settings changes (e.g. user adds/removes a domain)
    watchSettings((updated) => {
      if (updated) blockedDomains = updated.blockedDomains ?? []
    })
    // Create Shadow DOM host
    const host = document.createElement('div')
    host.id = 'katab-content-root'
    host.style.cssText =
      'position: fixed; z-index: 2147483647; pointer-events: none; top: 0; left: 0; width: 0; height: 0;'
    document.body.appendChild(host)

    const shadow = host.attachShadow({ mode: 'open' })
    const container = document.createElement('div')
    shadow.appendChild(container)

    // ─── Floating KA button ───────────────────────────────────────────────────
    const btn = document.createElement('button')
    btn.style.cssText = `
      position: fixed;
      width: 44px;
      height: 32px;
      border-radius: 16px;
      background: #4f46e5;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      font-family: -apple-system, sans-serif;
      letter-spacing: 0.03em;
      display: none;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(0,0,0,0.22);
      z-index: 2147483647;
      pointer-events: auto;
      transition: transform 120ms, box-shadow 120ms;
    `
    btn.textContent = 'KA'
    shadow.appendChild(btn)

    // Panel container
    const panelContainer = document.createElement('div')
    panelContainer.style.cssText =
      'position: fixed; z-index: 2147483647; pointer-events: auto; display: none;'
    shadow.appendChild(panelContainer)

    let panelDispose: (() => void) | null = null
    let lastSelection = ''
    let lastSourceUrl = ''
    let lastSourceDomain = ''

    function showButton(x: number, y: number) {
      btn.style.display = 'flex'
      // Position button to the right of selection end, vertically centered
      btn.style.left = `${Math.min(x + 8, window.innerWidth - 60)}px`
      btn.style.top = `${y - 16}px`
    }

    function hideButton() {
      btn.style.display = 'none'
    }

    function showPanel() {
      panelContainer.style.display = 'block'

      // Position panel: prefer to the right of button, but clamp to viewport
      const btnLeft = parseInt(btn.style.left)
      const btnTop = parseInt(btn.style.top)
      const panelWidth = 330
      const panelLeft =
        btnLeft + 44 + 8 > window.innerWidth - panelWidth
          ? btnLeft - panelWidth - 8
          : btnLeft + 44 + 8
      const panelTop = Math.min(btnTop - 8, window.innerHeight - 290)

      panelContainer.style.left = `${Math.max(8, panelLeft)}px`
      panelContainer.style.top = `${Math.max(8, panelTop)}px`

      panelDispose = render(
        () => (
          <FloatingPanel
            selectedText={lastSelection}
            sourceUrl={lastSourceUrl}
            sourceDomain={lastSourceDomain}
            onClose={closePanel}
            onSaved={() => {
              closePanel()
              hideButton()
              showSavedToast()
            }}
          />
        ),
        panelContainer,
      )
    }

    function closePanel() {
      if (panelDispose) {
        panelDispose()
        panelDispose = null
      }
      panelContainer.style.display = 'none'
      panelContainer.innerHTML = ''
    }

    // ─── "Saved to Notes" toast ───────────────────────────────────────────────
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(16px);
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.14);
      padding: 10px 18px;
      display: none;
      align-items: center;
      gap: 10px;
      font-family: -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #111827;
      pointer-events: none;
      z-index: 2147483647;
      opacity: 0;
      transition: opacity 200ms, transform 200ms;
    `
    const checkDot = document.createElement('div')
    checkDot.style.cssText =
      'width: 20px; height: 20px; border-radius: 10px; background: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0;'
    checkDot.innerHTML =
      '<svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    const toastLabel = document.createElement('span')
    toastLabel.textContent = 'Saved to Notes'
    toast.appendChild(checkDot)
    toast.appendChild(toastLabel)
    shadow.appendChild(toast)

    let toastTimer: ReturnType<typeof setTimeout> | null = null
    function showSavedToast() {
      if (toastTimer) clearTimeout(toastTimer)
      toast.style.display = 'flex'
      requestAnimationFrame(() => {
        toast.style.opacity = '1'
        toast.style.transform = 'translateX(-50%) translateY(0)'
      })
      toastTimer = setTimeout(() => {
        toast.style.opacity = '0'
        toast.style.transform = 'translateX(-50%) translateY(8px)'
        setTimeout(() => {
          toast.style.display = 'none'
        }, 200)
      }, 2200)
    }

    // ─── Event Listeners ──────────────────────────────────────────────────────

    document.addEventListener('mouseup', (e) => {
      // Small delay to let selection finalize
      setTimeout(() => {
        if (isDomainBlocked()) return

        const selection = window.getSelection()
        const text = selection?.toString().trim() ?? ''
        if (text.length === 0) return

        lastSelection = text
        lastSourceUrl = window.location.href
        lastSourceDomain = window.location.hostname

        const range = selection?.getRangeAt(0)
        const rect = range?.getBoundingClientRect()
        if (rect) {
          showButton(rect.right, rect.bottom)
        } else {
          showButton(e.clientX, e.clientY)
        }
      }, 10)
    })

    document.addEventListener('mousedown', (e) => {
      // composedPath() correctly traverses into closed shadow DOM — check if the
      // event originated from inside our shadow root before hiding/closing.
      const path = e.composedPath()
      if (!path.includes(host)) {
        hideButton()
        closePanel()
      }
    })

    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      hideButton()
      showPanel()
    })

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.08)'
      btn.style.boxShadow = '0 10px 24px rgba(0,0,0,0.28)'
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)'
      btn.style.boxShadow = '0 8px 20px rgba(0,0,0,0.22)'
    })

    console.debug('[KaTab] Content script initialized')
  },
})
