// Client-side i18n — all translations in one file
// Language detected from Telegram WebApp user.language_code

const strings = {
  en: {
    play: 'Play',
    settings: 'Settings',
    menu: 'Menu',
    language: 'Language',
    animations: 'Animations',
    add_to_home: 'Add to Home Screen',
    added_to_home: 'Added to Home Screen',
    reset_tutorials: 'Reset tutorials',
    reset_progress: 'Reset progress',
    reset: 'Reset',
    'settings.buyPremium': 'Buy Premium',
    'settings.premiumUser': 'Premium User',
    connection_error: 'Connection error',
    // Add game-specific keys here
  },
  ru: {
    play: 'Играть',
    settings: 'Настройки',
    menu: 'Меню',
    language: 'Язык',
    animations: 'Анимации',
    add_to_home: 'На главный экран',
    added_to_home: 'Добавлено',
    reset_tutorials: 'Сбросить обучение',
    reset_progress: 'Сбросить прогресс',
    reset: 'Сбросить',
    'settings.buyPremium': 'Купить Премиум',
    'settings.premiumUser': 'Премиум',
    connection_error: 'Ошибка соединения',
  },
  // Add more languages
}

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  // Add more
]

let currentLang = 'en'

// Detect language from Telegram
try {
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code?.slice(0, 2)
  if (tgLang && strings[tgLang]) currentLang = tgLang
} catch {}

export function t(key, params = {}) {
  let s = strings[currentLang]?.[key] || strings.en[key] || key
  for (const [k, v] of Object.entries(params)) {
    s = s.replace(`{${k}}`, v)
  }
  return s
}

export function getCurrentLang() { return currentLang }

export function setLang(code) {
  if (strings[code]) currentLang = code
}
