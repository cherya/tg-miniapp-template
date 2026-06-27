import { render } from 'preact'
import { App } from './app.jsx'
import { track } from './analytics.js'
import { checkFirstSession } from './storage.js'
import { t } from './i18n.js'
import './index.css'

const tg = window.Telegram?.WebApp

if (!tg?.initData) {
  // Not inside Telegram — redirect to the bot
  const botUrl = `https://t.me/${__BOT_USERNAME__}/${__APP_SHORT_NAME__}`
  location.replace(botUrl)
} else {
  tg.ready()
  tg.expand()
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes()
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (isMobile && tg.requestFullscreen) tg.requestFullscreen()
  if (tg.lockOrientation) tg.lockOrientation()
  tg.setHeaderColor(tg.themeParams?.bg_color || '#1a1a2e')
  tg.setBottomBarColor?.(tg.themeParams?.secondary_bg_color || '#151535')

  const sec = tg.themeParams?.secondary_bg_color || '#252552'
  document.documentElement.style.setProperty('--panel-border', sec)

  setupSafeArea()
  validate()
}

async function validate() {
  try {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': tg.initData,
      },
    })
    const data = await res.json()
    if (data.ok) {
      checkFirstSession().then(isFirst => track('app_open', { is_first: isFirst ? 1 : 0 }))
      const startParam = tg.initDataUnsafe?.start_param || ''
      render(<App userId={data.user?.id} startParam={startParam} />, document.getElementById('app'))
    } else {
      track('auth_error')
      showError(t('auth_failed') || 'Auth failed')
    }
  } catch {
    track('auth_error', { error: 'connection' })
    showError(t('connection_error') || 'Connection error')
  }
}

// --- Telegram safe areas ---
// Telegram exposes TWO separate inset sets and BOTH must be honored, or content
// slides under the notch / under Telegram's own header bar (Close + ⋮ controls):
//   tg.safeAreaInset         — device hardware insets (notch, rounded corners, home bar)
//   tg.contentSafeAreaInset  — space taken by Telegram's UI *inside* the webview
// They stack (real inset = safeArea + contentSafeArea). Clients do NOT reliably
// inject these as CSS variables, so we mirror them into CSS vars from the JS API
// and keep them live via the change events. CSS then pads with them (see #game-root
// in index.css, which uses all four sides).
function setupSafeArea() {
  const apply = () => {
    const root = document.documentElement.style
    const sa = tg.safeAreaInset || {}
    const ca = tg.contentSafeAreaInset || {}
    const px = (v) => `${v || 0}px`
    root.setProperty('--tg-safe-area-inset-top', px(sa.top))
    root.setProperty('--tg-safe-area-inset-bottom', px(sa.bottom))
    root.setProperty('--tg-safe-area-inset-left', px(sa.left))
    root.setProperty('--tg-safe-area-inset-right', px(sa.right))
    root.setProperty('--tg-content-safe-area-inset-top', px(ca.top))
    root.setProperty('--tg-content-safe-area-inset-bottom', px(ca.bottom))
    root.setProperty('--tg-content-safe-area-inset-left', px(ca.left))
    root.setProperty('--tg-content-safe-area-inset-right', px(ca.right))
  }
  apply()
  tg.onEvent?.('safeAreaChanged', apply)
  tg.onEvent?.('contentSafeAreaChanged', apply)
}

function showError(msg) {
  document.getElementById('app').innerHTML =
    `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--tg-theme-hint-color,#9ca3af);font-size:18px;text-align:center;padding:32px">${msg}</div>`
}
