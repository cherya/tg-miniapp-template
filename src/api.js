// API client — authenticated requests to game backend
import { track } from './analytics.js'

function getInitData() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : ''
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': getInitData(),
  }
}

async function request(url, opts) {
  const r = await fetch(url, opts)
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    if (r.status === 409) return body // conflict (e.g. already_played)
    track('api_error', { status: r.status, error: body.error || `HTTP ${r.status}`, path: url })
    throw Object.assign(new Error(body.error || `HTTP ${r.status}`), { status: r.status, body })
  }
  return r.json()
}

function post(base, path, body) {
  return request(base + path, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
}

function get(base, path) {
  return request(base + path, {
    headers: { 'X-Telegram-Init-Data': getInitData() },
  })
}

// --- User / Premium ---

export function getUser() {
  return request('/api/user', {
    headers: { 'X-Telegram-Init-Data': getInitData() },
  })
}

export function buyPremium() {
  return request('/api/premium/buy', {
    method: 'POST',
    headers: authHeaders(),
    body: '{}',
  })
}

// --- Export helpers for game-specific API modules ---
export { request, post, get, authHeaders, getInitData }
