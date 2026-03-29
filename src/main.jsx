// Entry point — Telegram WebApp initialization + auth
import { render } from 'preact'
import { App } from './app.jsx'
import { track } from './analytics.js'
import { checkFirstSession } from './storage.js'
import { t } from './i18n.js'
import './index.css'

const tg = window.Telegram?.WebApp

if (tg?.initData) {
  tg.ready()
  tg.expand()
  tg.requestFullscreen?.()
  tg.disableVerticalSwipes?.()
  tg.lockOrientation?.('portrait')
  tg.setHeaderColor?.(tg.themeParams?.bg_color || '#1a1a2e')
  tg.setBottomBarColor?.(tg.themeParams?.bg_color || '#1a1a2e')

  // Validate user
  fetch('/api/validate', {
    method: 'POST',
    headers: { 'X-Telegram-Init-Data': tg.initData },
  }).then(async r => {
    if (!r.ok) {
      document.getElementById('app').textContent = t('auth_error') || 'Auth failed'
      track('auth_error')
      return
    }
    const data = await r.json()
    const isFirst = await checkFirstSession()
    track('app_open', { is_first: isFirst ? 1 : 0 })
    render(<App userId={data.user.id} />, document.getElementById('app'))
  }).catch(() => {
    document.getElementById('app').textContent = t('connection_error') || 'Connection error'
    track('auth_error', { error: 'connection' })
  })
} else {
  document.getElementById('app').textContent = 'Open in Telegram'
}
