// Main app component — replace with your game
import { useState, useEffect } from 'preact/hooks'
import { getAnimations, setAnimations, getPremium, setPremium as savePremium } from './storage.js'
import { getUser, buyPremium } from './api.js'
import { track } from './analytics.js'
import { t, getCurrentLang, setLang, LANGUAGES } from './i18n.js'

export function App({ userId }) {
  const [screen, setScreen] = useState('menu')
  const [animations, setAnimationsState] = useState(true)
  const [premium, setPremiumState] = useState(0)
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline) }
  }, [])

  // Load settings
  useEffect(() => {
    getAnimations().then(setAnimationsState)
  }, [])

  // Load premium: cache first, then sync with server
  useEffect(() => {
    getPremium().then(cached => {
      if (cached) setPremiumState(1)
      getUser().then(data => {
        if (data?.premium != null) {
          setPremiumState(data.premium)
          savePremium(data.premium > 0)
        }
      }).catch(() => {})
    })
  }, [])

  function toggleAnimations() {
    const next = !animations
    setAnimationsState(next)
    setAnimations(next)
  }

  async function handleBuyPremium(onStatus) {
    try {
      track('premium_invoice_open')
      const { url } = await buyPremium()
      const tg = window.Telegram?.WebApp
      tg?.openInvoice?.(url, (status) => {
        if (status === 'paid') {
          track('premium_buy', { premium: premium + 1 })
          setPremiumState(p => p + 1)
          savePremium(true)
        }
        onStatus?.(status)
      })
    } catch {}
  }

  if (screen === 'settings') {
    return <SettingsScreen
      animations={animations}
      toggleAnimations={toggleAnimations}
      premium={premium}
      onBuyPremium={handleBuyPremium}
      onBack={() => setScreen('menu')}
    />
  }

  const offlineBanner = offline ? <div class="offline-banner">{t('offline') || 'Offline'}</div> : null

  // Main menu — replace with your game
  return (
    <div id="game-root">
      {offlineBanner}
      <div class="menu">
        <div class="menu-subtitle">My Game</div>
        <div class="menu-buttons">
          <button class="menu-btn menu-btn-primary" onClick={() => {/* start game */}}>
            {t('play')}
          </button>
          <button class="menu-btn menu-btn-secondary" onClick={() => setScreen('settings')}>
            {t('settings')}
          </button>
        </div>
        <div class="build-badge">{typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : ''}</div>
      </div>
    </div>
  )
}

function SettingsScreen({ animations, toggleAnimations, premium, onBuyPremium, onBack }) {
  const tgApp = window.Telegram?.WebApp
  const [homeStatus, setHomeStatus] = useState(null)
  const [buyEmoji, setBuyEmoji] = useState(null)

  useEffect(() => {
    if (tgApp?.checkHomeScreenStatus) {
      tgApp.checkHomeScreenStatus((status) => setHomeStatus(status))
    } else {
      setHomeStatus('unsupported')
    }
    const onAdded = () => setHomeStatus('added')
    tgApp?.onEvent?.('homeScreenAdded', onAdded)
    return () => tgApp?.offEvent?.('homeScreenAdded', onAdded)
  }, [])

  // BackButton
  useEffect(() => {
    const bb = tgApp?.BackButton
    if (!bb) return
    bb.show()
    bb.onClick(onBack)
    return () => { bb.offClick(onBack); bb.hide() }
  }, [onBack])

  return (
    <div id="game-root">
      <div class="menu settings-screen">
        <div class="settings-top">
          <div class="menu-subtitle">{t('settings')}</div>
          <div class="settings-list">
            <div class="settings-row" onClick={toggleAnimations}>
              <span class="settings-label">{t('animations')}</span>
              <div class={`toggle${animations ? ' toggle-on' : ''}`}>
                <div class="toggle-knob" />
              </div>
            </div>
            <div class="settings-row">
              <span class="settings-label">{t('language')}</span>
              <select class="settings-lang-select" value={getCurrentLang()} onChange={e => setLang(e.target.value)}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div class="settings-bottom">
          <button class="menu-btn settings-premium-btn" onClick={() => {
            setBuyEmoji(null)
            onBuyPremium((status) => {
              if (status === 'cancelled' || status === 'failed') {
                setBuyEmoji('🥺')
                setTimeout(() => setBuyEmoji(null), 2000)
              }
            })
          }}>
            <span class="premium-emoji" key={buyEmoji || (premium > 0 ? 'crown' : 'star')}>
              {buyEmoji || (premium > 0 ? '👑' : '⭐')}
            </span>
            {' '}
            {premium > 0
              ? `${t('settings.premiumUser')}${premium > 1 ? ` x${premium}` : ''}`
              : t('settings.buyPremium')}
          </button>
          {tgApp?.addToHomeScreen && homeStatus && homeStatus !== 'added' && homeStatus !== 'unsupported' && (
            <button class="menu-btn menu-btn-secondary settings-home-btn" onClick={() => tgApp.addToHomeScreen()}>
              {t('add_to_home')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
