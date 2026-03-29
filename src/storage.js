// Telegram CloudStorage wrapper — persistent key-value storage synced across devices

const KEYS = {
  ANIMATIONS: 'animations',
  TUTORIAL: 'tutorial',
  RETURNING: 'returning',
  PREMIUM: 'premium',
  // Add game-specific keys here
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

// Export helpers for game-specific storage
export { get, set, remove, KEYS }
