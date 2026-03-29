// Lightweight analytics — fire-and-forget events to Cloudflare Analytics Engine

const sessionStart = Date.now()

function getInitData() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : ''
}

export function track(event, props = {}) {
  try {
    fetch('/api/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': getInitData(),
      },
      body: JSON.stringify({ event, props }),
    }).catch(() => {})
  } catch {
    // silently ignore
  }
}

// Send session_end on page unload via sendBeacon (reliable on close)
// sendBeacon doesn't support custom headers, so include initData in body
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      const duration = Math.round((Date.now() - sessionStart) / 1000)
      const data = JSON.stringify({ event: 'session_end', props: { duration }, initData: getInitData() })
      navigator.sendBeacon?.('/api/event', new Blob([data], { type: 'application/json' }))
    }
  })
}
