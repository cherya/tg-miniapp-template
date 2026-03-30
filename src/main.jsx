import { render } from 'preact'
import { App } from './app.jsx'
import { track } from './analytics.js'
import { checkFirstSession } from './storage.js'
import { t } from './i18n.js'
import './index.css'

const tg = window.Telegram?.WebApp

if (!tg?.initData) {
  showError(t('open_in_telegram') || 'Open in Telegram')
} else {
  tg.ready()
  tg.expand()
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes()
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (isMobile && tg.requestFullscreen) tg.requestFullscreen()
  tg.setHeaderColor(tg.themeParams?.bg_color || '#1a1a2e')
  tg.setBottomBarColor?.(tg.themeParams?.secondary_bg_color || '#151535')

  const sec = tg.themeParams?.secondary_bg_color || '#252552'
  document.documentElement.style.setProperty('--panel-border', sec)

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
      render(<App userId={data.user?.id} />, document.getElementById('app'))
    } else {
      track('auth_error')
      showError(t('auth_failed') || 'Auth failed')
    }
  } catch {
    track('auth_error', { error: 'connection' })
    showError(t('connection_error') || 'Connection error')
  }
}

function showError(msg) {
  document.getElementById('app').innerHTML =
    `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--tg-theme-hint-color,#9ca3af);font-size:18px;text-align:center;padding:32px">${msg}</div>`
}
