// Telegram CloudStorage wrapper — persistent key-value storage synced across devices
// Pattern: identical in tg-numbers and tg-dots

const KEYS = {
  ANIMATIONS: 'animations',
  TUTORIAL: 'tutorial',
  RETURNING: 'returning',
  PREMIUM: 'premium',
  // Add game-specific keys here, e.g.:
  // CONFIRM_MOVE: 'confirm_move',
  // SKETCH_MODE: 'sketch_mode',
  // CAPTURE_STYLE: 'capture_style',
}

function cloud() {
  return window.Telegram?.WebApp?.CloudStorage
}

function get(key) {
  return new Promise(resolve => {
    const c = cloud()
    if (!c) return resolve(null)
    c.getItem(key, (err, val) => resolve(err || !val ? null : val))
  })
}

function set(key, value) {
  return new Promise(resolve => {
    const c = cloud()
    if (!c) return resolve()
    c.setItem(key, String(value), () => resolve())
  })
}

function remove(key) {
  return new Promise(resolve => {
    const c = cloud()
    if (!c) return resolve()
    c.removeItem(key, () => resolve())
  })
}

// --- Public API ---

export async function getAnimations() {
  const val = await get(KEYS.ANIMATIONS)
  return val !== '0'
}

export async function setAnimations(on) {
  await set(KEYS.ANIMATIONS, on ? '1' : '0')
}

export async function getTutorialState() {
  const val = await get(KEYS.TUTORIAL)
  if (!val) return {}
  try { return JSON.parse(val) } catch { return {} }
}

export async function setTutorialShown(key) {
  const state = await getTutorialState()
  state[key] = true
  await set(KEYS.TUTORIAL, JSON.stringify(state))
}

export async function resetTutorials() {
  await remove(KEYS.TUTORIAL)
}

export async function getPremium() {
  const val = await get(KEYS.PREMIUM)
  return val === '1'
}

export async function setPremium(val) {
  await set(KEYS.PREMIUM, val ? '1' : '0')
}

export async function checkFirstSession() {
  const val = await get(KEYS.RETURNING)
  if (val) return false
  await set(KEYS.RETURNING, '1')
  return true
}

// --- Online games persistence (pattern from tg-dots) ---
// Stores active/finished online games in CloudStorage for reconnection

export async function saveOnlineGame(game) {
  const games = await loadOnlineGamesRaw()
  const idx = games.findIndex(g => g.code === game.code)
  const entry = { ...game, ts: Date.now() }
  if (idx >= 0) games[idx] = entry; else games.push(entry)
  await set('online_games', JSON.stringify(games))
}

export async function loadOnlineGames() {
  const games = await loadOnlineGamesRaw()
  return games.filter(g => g.status === 'active').sort((a, b) => (b.ts || 0) - (a.ts || 0))
}

export async function deleteOnlineGame(code) {
  const games = await loadOnlineGamesRaw()
  await set('online_games', JSON.stringify(games.filter(g => g.code !== code)))
}

async function loadOnlineGamesRaw() {
  const val = await get('online_games')
  if (!val) return []
  try { const arr = JSON.parse(val); return Array.isArray(arr) ? arr : [] } catch { return [] }
}

// Export helpers for game-specific storage
export { get, set, remove, KEYS }
