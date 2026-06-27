// Main app component — hash-based navigation with restorable screens
// Pattern: both tg-numbers and tg-dots use identical navigation + settings + premium flow
import { useState, useEffect } from 'preact/hooks'
import { getAnimations, setAnimations, getPremium, setPremium as savePremium } from './storage.js'
import { getUser, buyPremium } from './api.js'
import { track } from './analytics.js'
import { t, getCurrentLang, setLang, LANGUAGES } from './i18n.js'

// Screens that survive page refresh (saved in location.hash)
// Game screens (game, online-game, gameover) should NOT be restorable — redirect to menu
const RESTORABLE = new Set(['menu', 'settings', 'rules', 'more-games'])

function readScreenFromHash() {
  const h = location.hash.slice(1)
  return RESTORABLE.has(h) ? h : 'menu'
}

export function App({ userId, startParam }) {
  const [screen, __setScreen] = useState(() => {
    // Deep linking: startParam can route to a specific screen
    // e.g. startParam = 'ABCDE' → multiplayer lobby with room code
    // e.g. startParam = 'daily' → daily challenge
    if (startParam) {
      // TODO: handle deep links for your game
      // if (startParam === 'daily') return 'daily-intro'
      // if (/^[A-Z0-9]{5}$/.test(startParam)) return 'online-lobby'
    }
    return readScreenFromHash()
  })

  const setScreen = (next) => {
    location.hash = next === 'menu' ? '' : next
    __setScreen(next)
  }

  const [animations, setAnimationsState] = useState(true)
  const [premium, setPremiumState] = useState(0)
  const [offline, setOffline] = useState(!navigator.onLine)

  // --- Offline detection ---
  useEffect(() => {
    const goOff = () => setOffline(true)
    const goOn = () => setOffline(false)
    window.addEventListener('offline', goOff)
    window.addEventListener('online', goOn)
    return () => {
      window.removeEventListener('offline', goOff)
      window.removeEventListener('online', goOn)
    }
  }, [])

  // --- Load settings from CloudStorage ---
  useEffect(() => {
    getAnimations().then(setAnimationsState)
    // Show SettingsButton in Telegram header
    const sb = window.Telegram?.WebApp?.SettingsButton
    if (sb) {
      sb.show()
      sb.onClick(() => setScreen('settings'))
    }
  }, [])

  // --- Load premium: cache-first, then sync with server ---
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

  // --- BackButton: centralized per screen ---
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const bb = tg?.BackButton
    if (!bb) return

    if (screen === 'menu') {
      bb.hide()
      return
    }

    // Some screens manage their own back button (e.g. online-lobby)
    // if (screen === 'online-lobby') return

    bb.show()
    const handler = () => {
      // For game screens, show confirmation popup before leaving
      if (screen === 'game' || screen === 'online-game') {
        if (tg?.showPopup) {
          tg.showPopup({
            title: t('end_game') || 'End Game',
            message: t('confirm_end') || 'End the game?',
            buttons: [
              { id: 'end', type: 'destructive', text: t('end_game') || 'End' },
              { id: 'cancel', type: 'cancel' },
            ]
          }, (id) => { if (id === 'end') setScreen('menu') })
        } else {
          setScreen('menu')
        }
      } else {
        setScreen('menu')
      }
    }

    bb.onClick(handler)
    return () => bb.offClick(handler)
  }, [screen])

  // --- Closing confirmation for active game screens ---
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const isGameScreen = screen === 'game' || screen === 'online-game'
    if (isGameScreen) {
      tg?.enableClosingConfirmation?.()
    } else {
      tg?.disableClosingConfirmation?.()
    }
  }, [screen])

  function toggleAnimations() {
    const next = !animations
    setAnimationsState(next)
    setAnimations(next)
  }

  async function handleBuyPremium(onStatus) {
    try {
      track('premium_invoice_open')
      const { url } = await buyPremium()
      window.Telegram?.WebApp?.openInvoice?.(url, (status) => {
        if (status === 'paid') {
          track('premium_buy', { premium: premium + 1 })
          setPremiumState(p => p + 1)
          savePremium(true)
        }
        onStatus?.(status)
      })
    } catch {}
  }

  const offlineBanner = offline && (
    <div class="offline-banner">
      <svg class="offline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 12.86a10 10 0 0 1 5.17-2.86"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
      {t('offline')}
    </div>
  )

  // --- Screen routing ---

  // TODO: Add your game screens here
  // if (screen === 'game') {
  //   return <>{offlineBanner}<YourGameScreen onResult={...} onMenu={() => setScreen('menu')} /></>
  // }
  // if (screen === 'online-lobby') {
  //   return <>{offlineBanner}<YourLobby joinCode={startParam} onStart={...} onCancel={() => setScreen('menu')} /></>
  // }
  // if (screen === 'online-game') { ... }
  // if (screen === 'gameover') { ... }

  if (screen === 'rules') {
    return (
      <div id="game-root">
        {offlineBanner}
        <div class="menu rules-screen">
          <div class="menu-subtitle">{t('rules')}</div>
          <div class="rules-list">
            {/* TODO: Add your game rules sections */}
            <div class="rules-section">
              <div class="rules-heading">{t('rules_goal') || 'Goal'}</div>
              <p>{t('rules_goal_text') || 'Describe your game goal here.'}</p>
            </div>
            <div class="rules-section">
              <div class="rules-heading">{t('rules_how') || 'How to Play'}</div>
              <p>{t('rules_how_text') || 'Describe how to play here.'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'settings') {
    return <SettingsScreen
      offlineBanner={offlineBanner}
      animations={animations}
      toggleAnimations={toggleAnimations}
      premium={premium}
      onBuyPremium={handleBuyPremium}
      onBack={() => setScreen('menu')}
    />
  }

  if (screen === 'more-games') {
    return (
      <div id="game-root">
        {offlineBanner}
        <div class="menu more-games-screen">
          <div class="menu-subtitle">{t('more_games')}</div>
          <div class="more-games-grid">
            {/* TODO: Add your other games here */}
            <a class="more-games-tile" href="https://t.me/numbers_match_bot/play" target="_blank" rel="noopener">
              <div class="more-games-tile-preview">
                <span class="more-games-tile-title">NUM8ER5</span>
              </div>
              <div class="more-games-tile-info">
                <span class="more-games-tile-name">{t('numbers_name') || 'Numbers'}</span>
                <span class="more-games-tile-desc">{t('numbers_desc') || 'Match pairs of numbers to clear the board'}</span>
              </div>
            </a>
            <a class="more-games-tile" href="https://t.me/game_dots_bot/play" target="_blank" rel="noopener">
              <div class="more-games-tile-preview">
                <span class="more-games-tile-title">D.TS</span>
              </div>
              <div class="more-games-tile-info">
                <span class="more-games-tile-name">{t('dots_name') || 'Dots'}</span>
                <span class="more-games-tile-desc">{t('dots_desc') || 'Classic strategy game'}</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // --- Main menu ---
  return (
    <div id="game-root">
      {offlineBanner}
      <div class="menu">
        {/* TODO: Replace with your game title */}
        <div class="menu-title">MY GAME</div>
        <div class="menu-buttons">
          <button class="menu-btn menu-btn-primary" onClick={() => setScreen('game')}>
            {t('play')}
          </button>
          {/* TODO: Uncomment for multiplayer */}
          {/* <button class="menu-btn menu-btn-primary" onClick={() => setScreen('online-lobby')}>
            {t('play_online')}
          </button> */}
          <button class="menu-btn menu-btn-secondary" onClick={() => setScreen('settings')}>
            {t('settings')}
          </button>
          <button class="menu-btn menu-btn-more-games" onClick={() => setScreen('more-games')}>
            {t('more_games')}
          </button>
        </div>
        <div class="menu-rules-link" onClick={() => setScreen('rules')}>{t('rules')}</div>
        <div class="build-badge">{typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : ''}</div>
      </div>
    </div>
  )
}

function SettingsScreen({ offlineBanner, animations, toggleAnimations, premium, onBuyPremium, onBack }) {
  const tgApp = window.Telegram?.WebApp
  const [lang, setLangState] = useState(getCurrentLang())
  const [homeStatus, setHomeStatus] = useState(null)
  const [buyEmoji, setBuyEmoji] = useState(null)
  const [showPremiumHint, setShowPremiumHint] = useState(false)

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
      {offlineBanner}
      <div class="menu settings-screen">
        <div class="settings-top">
          <div class="menu-subtitle">{t('settings')}</div>
          <div class="settings-list">
            <div class="settings-row">
              <span class="settings-label">{t('language')}</span>
              <select class="settings-lang-select" value={lang} onChange={e => { setLang(e.target.value); setLangState(e.target.value) }}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
            <div class="settings-row" onClick={toggleAnimations}>
              <span class="settings-label">{t('animations')}</span>
              <div class={`toggle${animations ? ' toggle-on' : ''}`}>
                <div class="toggle-knob" />
              </div>
            </div>
            {/* TODO: Add game-specific settings here (e.g. sketch mode, confirm move, etc.) */}
          </div>
        </div>
        <div class="settings-bottom">
          {showPremiumHint && <div class="tooltip-overlay" onClick={() => setShowPremiumHint(false)} />}
          <div class="settings-premium-row">
            <button class="menu-btn settings-premium-btn" onClick={() => {
              setBuyEmoji(null)
              onBuyPremium((status) => {
                if (status === 'cancelled' || status === 'failed') {
                  setBuyEmoji(String.fromCodePoint(0x1F97A))
                  setTimeout(() => setBuyEmoji(null), 2000)
                }
              })
            }}>
              <span class="premium-emoji" key={buyEmoji || (premium > 0 ? 'crown' : 'star')}>
                {buyEmoji || (premium > 0 ? String.fromCodePoint(0x1F451) : String.fromCodePoint(0x2B50))}
              </span>
              {' '}
              {premium > 0
                ? `${t('settings.premiumUser')}${premium > 1 ? ` x${premium}` : ''}`
                : t('settings.buyPremium')}
            </button>
            <span class="hint-btn" onClick={() => setShowPremiumHint(!showPremiumHint)}>
              ?
              {showPremiumHint && <span class="tooltip">{t('settings.premiumHint')}</span>}
            </span>
          </div>
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
