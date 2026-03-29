import { handleBotWebhook } from './bot-handler.js'
import { serverT } from './server-i18n.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Game-specific API routes go here:
    // if (url.pathname.startsWith('/api/mp/')) return handleMp(request, env, url.pathname)
    // if (url.pathname.startsWith('/api/daily')) return handleDaily(request, env, url.pathname)

    if (url.pathname === '/api/user' && request.method === 'GET') {
      return handleGetUser(request, env)
    }

    if (url.pathname === '/api/premium/buy' && request.method === 'POST') {
      return handlePremiumBuy(request, env)
    }

    if (url.pathname === '/api/bot' && request.method === 'POST') {
      return handleBotWebhook(request, env)
    }

    if (url.pathname === '/api/validate' && request.method === 'POST') {
      return handleValidate(request, env)
    }

    if (url.pathname === '/api/event' && request.method === 'POST') {
      return handleEvent(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}

// --- Auth ---

async function authenticateUser(request, env) {
  const initData = request.headers.get('X-Telegram-Init-Data')
  if (!initData) return null
  return verifyAndParseUser(initData, env.BOT_TOKEN)
}

// --- User endpoint ---

async function handleGetUser(request, env) {
  const headers = { 'Content-Type': 'application/json' }
  const user = await authenticateUser(request, env)
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers })
  const row = await env.DB.prepare('SELECT premium FROM users WHERE id = ?').bind(user.id).first()
  return new Response(JSON.stringify({ premium: row?.premium || 0 }), { status: 200, headers })
}

// --- Premium purchase ---

const PREMIUM_PRICE = 100

async function handlePremiumBuy(request, env) {
  const headers = { 'Content-Type': 'application/json' }
  const user = await authenticateUser(request, env)
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers })

  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: serverT(user.lang, 'invoice_title'),
      description: serverT(user.lang, 'invoice_desc'),
      payload: `premium_${user.id}`,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: 'Premium Status', amount: PREMIUM_PRICE }],
      // photo_url: 'https://my-game.example.com/premium.jpg',
    }),
  })

  const data = await res.json()
  if (!data.ok) return new Response(JSON.stringify({ error: data.description || 'telegram error' }), { status: 502, headers })
  return new Response(JSON.stringify({ url: data.result }), { status: 200, headers })
}

// --- Validate (auth check) ---

async function handleValidate(request, env) {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const initData = request.headers.get('X-Telegram-Init-Data')
    if (!initData) return new Response(JSON.stringify({ ok: false }), { status: 401, headers })
    const user = await verifyAndParseUser(initData, env.BOT_TOKEN)
    if (!user) return new Response(JSON.stringify({ ok: false }), { status: 401, headers })
    return new Response(JSON.stringify({ ok: true, user: { id: user.id, name: user.name, photoUrl: user.photoUrl } }), { status: 200, headers })
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers })
  }
}

// --- Analytics ---

const DOUBLE_KEYS = ['level', 'score', 'duration', 'elapsed', 'progress', 'premium']
const BLOB_KEYS = ['mode', 'error', 'path']

async function handleEvent(request, env) {
  try {
    const { event, props = {}, initData: bodyInitData } = await request.json()
    if (!event || !env.ANALYTICS) return new Response('ok', { status: 200 })

    const initData = request.headers.get('X-Telegram-Init-Data') || bodyInitData || ''
    const user = initData ? await verifyAndParseUser(initData, env.BOT_TOKEN) : null
    if (!user) return new Response('ok', { status: 200 })
    const userId = String(user.id)

    const doubles = []
    for (const key of DOUBLE_KEYS) {
      if (props[key] !== undefined) doubles.push(props[key])
      else break
    }

    const blobs = [userId]
    for (const key of BLOB_KEYS) {
      if (props[key] !== undefined) blobs.push(String(props[key]))
    }

    env.ANALYTICS.writeDataPoint({ indexes: [event], blobs, doubles })
    return new Response('ok', { status: 200 })
  } catch {
    return new Response('ok', { status: 200 })
  }
}

// --- Telegram initData verification ---

export async function verifyAndParseUser(initData, botToken) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  params.delete('hash')
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

  const enc = new TextEncoder()
  const secretKey = await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const secretHash = await crypto.subtle.sign('HMAC', secretKey, enc.encode(botToken))
  const signingKey = await crypto.subtle.importKey('raw', secretHash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', signingKey, enc.encode(dataCheckString))

  const computedHash = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('')
  if (computedHash !== hash) return null

  const userStr = params.get('user')
  if (!userStr) return null

  try {
    const u = JSON.parse(userStr)
    return {
      id: String(u.id || ''),
      name: u.first_name || u.last_name || (u.username ? '@' + u.username : String(u.id || '')),
      photoUrl: (u.photo_url || '').replace('/320/', '/160/'),
      lang: u.language_code || 'en',
    }
  } catch {
    return null
  }
}
