# Telegram Mini App Game Template

Production-ready starter template for Telegram Mini App games. Extracted from two production games (tg-numbers, tg-dots) — all shared infrastructure is included and battle-tested.

## What's Inside

**Frontend (Preact + Vite)**
- `src/main.jsx` — Telegram WebApp init (fullscreen, orientation lock, theme colors, auth validation)
- `src/app.jsx` — Hash-based navigation, settings screen, premium purchase, offline detection, back button management
- `src/avatar.jsx` — Avatar component with premium golden badge
- `src/storage.js` — Telegram CloudStorage wrapper (animations, tutorials, premium cache, online games)
- `src/api.js` — Authenticated API client with error tracking
- `src/analytics.js` — Fire-and-forget event tracking + session_end on app close
- `src/i18n.js` — Client-side translations (14 languages, RTL support)
- `src/index.css` — Full shared CSS (menu, settings, lobby, rules, more-games, avatars, toggles, tooltips, offline banner)

**Backend (Cloudflare Workers + D1)**
- `src/worker.js` — API routing, Telegram initData HMAC-SHA256 verification, analytics handler, premium invoice
- `src/bot-handler.js` — Bot webhook: /start, /terms, /support, /paysupport, payments (pre-checkout + successful_payment)
- `src/server-i18n.js` — Server-side translations (14 languages)
- `schema.sql` — D1 tables: users, daily_results, rooms


## Architecture

```
User opens t.me/bot/play
    │
    ▼
index.html loads telegram-web-app.js SDK
    │
    ▼
main.jsx
    ├─ tg.ready() + tg.expand() + tg.requestFullscreen()
    ├─ lockOrientation, setHeaderColor, setBottomBarColor
    ├─ POST /api/validate (sends X-Telegram-Init-Data header)
    └─ render <App> on success
        │
        ▼
app.jsx — hash-based router
    ├─ menu        (main menu, buttons, build badge)
    ├─ settings    (language, animations, premium, add-to-home)
    ├─ rules       (scrollable rules sections)
    ├─ more-games  (cross-promotion tiles)
    ├─ game        (YOUR game screen — placeholder)
    ├─ online-lobby (YOUR multiplayer lobby — placeholder)
    ├─ online-game (YOUR online game — placeholder)
    └─ gameover    (YOUR result screen — placeholder)
```


## Telegram safe areas & scrolling (IMPORTANT — read before styling)

Telegram's webview overlays its own UI (the **Close** button + **⋮** menu at the top, and the home indicator at the bottom) and runs on notched devices. If you ignore this, your content slides **under** that system UI. There are **two distinct inset sets and you must honor both** — they stack:

- `tg.safeAreaInset` — device hardware insets (notch, rounded corners, home bar).
- `tg.contentSafeAreaInset` — space taken by **Telegram's own** UI inside the webview.

Telegram clients do **not** reliably inject these as CSS variables, so the template populates them from the JS API and keeps them live on the `safeAreaChanged` / `contentSafeAreaChanged` events. See `setupSafeArea()` in `src/main.jsx`, which writes all eight CSS vars:

```
--tg-safe-area-inset-{top,bottom,left,right}
--tg-content-safe-area-inset-{top,bottom,left,right}
```

`#game-root` in `src/index.css` pads all four sides with `safe + content` for that side. **Every top-level screen must be rendered inside `#game-root`** — if you render bare markup (e.g. `<div>…</div>`) you bypass this and content goes under the system UI. Apply the bottom inset per-screen with `padding-bottom: max(20px, calc(var(--tg-safe-area-inset-bottom,0px) + var(--tg-content-safe-area-inset-bottom,0px)))`.

**Scrolling:** `html, body, #app` are `height:100%; overflow:hidden` — the page itself never scrolls. Any long/scrollable content must live in a flex child with **`flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch`**. The `min-height:0` is mandatory: without it a flex item grows past the viewport and nothing scrolls. `tg.disableVerticalSwipes()` (called in `main.jsx`) is what lets inner elements scroll without the swipe closing the app.

## Setup (step by step)

### 1. Create Telegram Bot

Go to [@BotFather](https://t.me/BotFather), create a new bot. Save the bot token.

### 2. Clone and Install

```bash
git clone <this-repo> my-game
cd my-game
npm install
```

### 3. Create Cloudflare D1 Database

```bash
npx wrangler d1 create my-game-db
```

Copy the database_id from the output.

### 4. Configure wrangler.json

Update these fields:
- `name` — your project name (e.g. "tg-chess")
- `routes[0].pattern` — your domain (e.g. "chess.example.com")
- `analytics_engine_datasets[0].dataset` — your dataset name
- `vars.BOT_USERNAME` — your bot username (without @)
- `vars.APP_SHORT_NAME` — your bot's web app short name (usually "play")
- `vars.APP_DOMAIN` — full URL of your app (e.g. "https://chess.example.com")
- `vars.PREMIUM_PRICE` — price in Telegram Stars (default "100")
- `vars.ADMIN_CHAT_ID` — your Telegram user ID (for support messages)
- `d1_databases[0].database_name` — same as step 3
- `d1_databases[0].database_id` — from step 3 output

### 5. Set Up Domain (Cloudflare)

You need a domain on Cloudflare (free plan works). Two options:

**Option A: Subdomain of your existing domain**
1. Domain must already be on Cloudflare (DNS managed by CF)
2. The `routes[0].pattern` in wrangler.json handles it — CF Workers creates the DNS record automatically on deploy

**Option B: Free subdomain via workers.dev**
1. Remove the `routes` array from wrangler.json entirely
2. Your app will be available at `https://<name>.<your-account>.workers.dev`
3. Set `vars.APP_DOMAIN` to this URL

### 6. Cloudflare API Token

See [CF-TOKENS.md](~/CF-TOKENS.md) for token management (creating, scoping, rotating).

For this project, the token needs permissions: Workers Scripts, D1, Account Analytics. If using a custom domain — also Zone DNS Edit.

### 7. Store Secrets

```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
```

Enter your bot token and a random string for webhook secret.

### 8. Create Tables

```bash
npx wrangler d1 execute my-game-db --remote --file schema.sql
```

### 9. Set Bot Webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/api/bot" \
  -d "secret_token=<WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","pre_checkout_query"]'
```

### 10. Register Bot Commands

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands":[
    {"command":"start","description":"Start the game"},
    {"command":"terms","description":"Terms and conditions"},
    {"command":"support","description":"Contact support"},
    {"command":"paysupport","description":"Payment support"}
  ]}'
```

### 11. Run Dev Server

```bash
npm run dev
```

### 12. Deploy

**Recommended: auto-deploy via GitHub**

1. Push your repo to GitHub
2. Go to https://dash.cloudflare.com → Workers & Pages → your worker → Settings → Builds
3. Connect GitHub repository
4. Set build command: `npm run build`
5. Set deploy command: `npx wrangler deploy`
6. Now every push to `main` triggers build + deploy automatically

**Manual deploy (one-off):**

```bash
npm run build && npx wrangler deploy
```

**Never use `wrangler deploy` from CI/local as the primary deploy method** — connect GitHub and let CF build on push.


## How to Build Your Game

### Step 1: Game Title and Branding

In `src/app.jsx`:
- Replace `MY GAME` in the menu title
- Add your custom title component (see LogoDot in tg-dots for animated title example)

In `src/bot-handler.js`:
- Update the photo URL and web_app URL in `sendWelcome()`
- Add `public/preview.png` for the bot welcome photo

In `src/server-i18n.js`:
- Update `welcome_caption` for all 14 languages

### Step 2: Game Engine

Create `src/game/engine.js` — your pure game logic. This should be framework-agnostic:
- State machine (e.g. `createGame()`, `placeMove()`, `isGameOver()`)
- No DOM/Canvas/Preact dependencies — pure functions
- Deterministic: same inputs = same outputs (important for multiplayer fairness)
- Export a seeded PRNG if your game needs randomness (Mulberry32 works well)

### Step 3: Game Renderer

Create `src/game/renderer.js` — Canvas rendering:
- `createRenderer(canvas)` → returns `{ render(state), resize(), screenToGrid(x,y) }`
- Use `requestAnimationFrame` for smooth game loops
- Read theme colors from CSS variables (see tg-numbers/renderer.js for palette example)
- Handle device pixel ratio for crisp rendering

### Step 4: Game Screen

Create `src/game/GameScreen.jsx` — Preact component:
- Mount canvas in a `.game-canvas-wrap` div (CSS already styled)
- Initialize engine + renderer in `useEffect`
- Handle touch/click input → convert to game coordinates via renderer.screenToGrid()
- Call `setScreen('gameover')` when game ends, passing result data

Wire it up in `src/app.jsx`:
```javascript
// In the screen routing section:
if (screen === 'game') {
  return <GameScreen
    onResult={(result) => { setGameResult(result); setScreen('gameover') }}
    onMenu={() => setScreen('menu')}
  />
}
```

### Step 5: Game Result Screen

Create `src/game/GameOverScreen.jsx`:
- Display scores, winner, move count
- "Play Again" and "Menu" buttons
- Use `.game-result-title`, `.game-result-scores` CSS classes

### Step 6: Rules

In `src/app.jsx`, fill in the rules screen with your game's rules.
In `src/i18n.js`, add translated rule text keys for all languages.

### Step 7: Game-Specific Settings

Add toggles in the settings screen (in `src/app.jsx` SettingsScreen):
```jsx
<div class="settings-row" onClick={toggleMyOption}>
  <span class="settings-label">{t('my_option')}</span>
  <div class={`toggle${myOption ? ' toggle-on' : ''}`}>
    <div class="toggle-knob" />
  </div>
</div>
```

Add storage functions in `src/storage.js`:
```javascript
export async function getMyOption() {
  const val = await get('my_option')
  return val !== '0' // default true
}
export async function setMyOption(on) {
  await set('my_option', on ? '1' : '0')
}
```


## Adding Multiplayer

**ALWAYS use WebRTC P2P for multiplayer.** Server-based polling wastes HTTP requests, adds latency, and scales poorly. The server should ONLY handle signaling (room creation, SDP offer/answer exchange, ICE candidates). All game data flows directly between players via WebRTC DataChannel.

### Architecture

```
Player A                    Server (D1)                   Player B
   │                            │                            │
   ├─ POST /signal/create ─────►│                            │
   │◄── room code ──────────────┤                            │
   │                            │◄── POST /signal/join ──────┤
   │                            │─── host info ─────────────►│
   ├─ POST /signal/offer ──────►│                            │
   │                            │─── offer ─────────────────►│
   │                            │◄── POST /signal/answer ────┤
   │◄── answer ─────────────────┤                            │
   │        (ICE candidates exchanged similarly)             │
   │                            │                            │
   │◄═══════════ WebRTC DataChannel (P2P) ══════════════════►│
   │         game moves, state, chat — NO server             │
```

After WebRTC connects, the server is no longer involved in gameplay. This minimizes HTTP requests and gives the lowest possible latency.

### Implementation

1. Create `src/game/signaling-handler.js` (server — D1-backed):

```javascript
export async function handleSignaling(request, env, pathname) {
  // POST /api/signal/create     — host creates room, gets 5-char code
  // POST /api/signal/join       — guest joins, receives host info
  // POST /api/signal/offer      — host sends SDP offer
  // POST /api/signal/answer     — guest sends SDP answer
  // POST /api/signal/candidates — both send ICE candidates
  // GET  /api/signal/state      — poll for opponent's offer/answer/candidates
  // POST /api/signal/reconnect  — clear signaling state for ICE restart
  // POST /api/signal/invite     — generate shareable inline invite
}
```

2. Create `src/game/webrtc.js` (client — P2P wrapper):

```javascript
export function createPeerConnection() {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  })
  // Host: createDataChannel('game', { ordered: true })
  // Guest: listen for ondatachannel
  // ICE gathering with 3s timeout
  // Message send/receive via JSON
  return { pc, send, onMessage, close }
}
```

3. Create `src/game/signal-api.js` (client signaling API):
```javascript
import { post, get } from '../api.js'
export const signalCreate = (gridSize) => post('', '/api/signal/create', { gridSize })
export const signalJoin = (code) => post('', '/api/signal/join', { code })
export const signalOffer = (code, offer) => post('', '/api/signal/offer', { code, offer })
export const signalAnswer = (code, answer) => post('', '/api/signal/answer', { code, answer })
export const signalCandidates = (code, candidates) => post('', '/api/signal/candidates', { code, candidates })
export const signalState = (code) => get('', `/api/signal/state?code=${code}`)
```

4. Add `signaling` table to `schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS signaling (
  code TEXT PRIMARY KEY,
  host_id TEXT, host_name TEXT, host_photo TEXT, host_premium INTEGER DEFAULT 0,
  guest_id TEXT, guest_name TEXT, guest_photo TEXT, guest_premium INTEGER DEFAULT 0,
  offer TEXT, answer TEXT,
  host_candidates TEXT, guest_candidates TEXT,
  grid_size TEXT, status TEXT NOT NULL DEFAULT 'waiting',
  created_at INTEGER NOT NULL
);
```

5. Wire up in `src/worker.js`:
```javascript
import { handleSignaling } from './game/signaling-handler.js'
// In fetch handler:
if (url.pathname.startsWith('/api/signal/')) return handleSignaling(request, env, url.pathname)
```

6. Create `src/game/OnlineLobby.jsx` — room create/join UI
7. Create `src/game/reconnect.js` — orchestrates WebRTC connection flow with ICE restart on timeout

### Room code generation (shared pattern)

```javascript
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O/0, I/1, L
function generateCode() {
  let code = ''
  for (let i = 0; i < 5; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)]
  return code
}
```

### Deep linking for invites

Invite links use Telegram's `startapp` parameter:
```
https://t.me/{BOT_USERNAME}/{APP_SHORT_NAME}?startapp={ROOM_CODE}
```

The template already extracts `startParam` in `main.jsx` and passes it to `App`. Handle it in your lobby screen to auto-join.


## Adding Daily Challenges

Pattern from tg-numbers:

1. Create `src/daily-handler.js`:
```javascript
// GET  /api/daily/info  — today/yesterday leaderboards, check if already played
// POST /api/daily/start — get today's config (seed, modifiers)
// POST /api/daily/finish — record completion (time_ms, status)
// POST /api/daily/invite — share result
```

2. Daily determinism: generate seed from date string:
```javascript
function dateSeed(dateStr) {
  let h = 0
  for (const c of dateStr) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return h >>> 0
}
// Same date → same seed → same grid for all players
```

3. The `daily_results` table in schema.sql is already set up with UNIQUE(user_id, date).


## Adding Notifications

Pattern from tg-numbers (daily reminders):

1. Add cron trigger to `wrangler.json`:
```json
"triggers": { "crons": ["0 18 * * *"] }
```

2. Add `scheduled` handler to worker.js:
```javascript
export default {
  async fetch(request, env) { /* ... */ },
  async scheduled(event, env) {
    await sendReminders(env)
  }
}
```

3. Add columns to users table:
```sql
ALTER TABLE users ADD COLUMN write_access INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN last_notified_date TEXT;
ALTER TABLE users ADD COLUMN last_seen INTEGER;
```

4. Rate limiting: Telegram allows 30 messages/second per bot. Chunk messages in batches of 25 with 1.1s sleep between batches.


## Principles

### Minimize HTTP Requests

Every HTTP request to the server costs latency and CF Workers invocations. Before adding a new API endpoint or request, ask:

- **Can this be done client-side?** CloudStorage, localStorage, and in-memory state avoid server round-trips entirely.
- **Can this be combined with an existing request?** Batch related data into one response (e.g. `/api/validate` already returns user info — don't make a separate `/api/user` call on startup).
- **Can this use P2P instead?** For multiplayer, WebRTC DataChannel moves game data off the server entirely. The server only handles signaling (5-8 requests to establish connection, then zero).
- **Is polling necessary?** Prefer event-driven (WebRTC messages, visibility change events) over periodic polling. If you must poll, use adaptive intervals (longer when idle, shorter at critical moments).

Examples of what NOT to do:
- Polling server every second for opponent moves (use WebRTC DataChannel)
- Separate API calls for user info, premium status, and settings (combine into one)
- Fetching translations from server (bundle in client code)
- Sending analytics synchronously and waiting for response (fire-and-forget)


## Key Patterns

### Authentication

Every API request includes `X-Telegram-Init-Data` header. The worker verifies it via HMAC-SHA256 double-hash:
1. HMAC("WebAppData", bot_token) → secret
2. HMAC(secret, data_check_string) → signature
3. Compare with hash from initData

This is already implemented in `worker.js:verifyAndParseUser()`.

### Premium (Telegram Stars)

Price is set to 100 Stars (XTR currency) in `worker.js`. Flow:
1. Client calls `buyPremium()` → POST /api/premium/buy
2. Server creates invoice via Telegram Bot API → returns URL
3. Client opens invoice with `tg.openInvoice(url, callback)`
4. On "paid": bot receives pre_checkout_query → bot-handler validates → successful_payment → DB updated
5. Client gets callback → updates local state + caches in CloudStorage

### Analytics

Events tracked to Cloudflare Analytics Engine:
- `app_open` (is_first: 0/1)
- `session_end` (duration in seconds)
- `premium_invoice_open`
- `premium_buy` (premium count)
- `auth_error`, `api_error`
- Add game-specific events: `game_start`, `game_end`, `level_complete`, etc.

### CloudStorage

Telegram CloudStorage is key-value, synced across devices. Use for:
- User preferences (animations, language, game-specific toggles)
- Tutorial state (which tutorials have been shown)
- Premium cache (avoid re-checking server on every load)
- Online game state (for reconnection)
- Game saves (compact encoding)

NOT for large data or leaderboards — use D1 for those.

### Navigation

Hash-based routing with two categories:
- **Restorable**: menu, settings, rules, more-games — survive page refresh
- **Non-restorable**: game, online-lobby, online-game, gameover — redirect to menu on refresh

Back button behavior:
- Hidden on menu screen
- Game screens: show confirmation popup before leaving
- Other screens: navigate back to menu

Closing confirmation: enabled during active game screens (prevents accidental app close).

### CSS Theming

All colors use Telegram CSS variables with fallbacks:
- `--tg-theme-bg-color` (#1a1a2e) — main background
- `--tg-theme-text-color` (#fff) — primary text
- `--tg-theme-button-color` (#7c3aed) — primary buttons
- `--tg-theme-button-text-color` (#fff) — button text
- `--tg-theme-hint-color` (#9ca3af) — secondary text, hints
- `--tg-theme-secondary-bg-color` (#252552) — cards, panels
- `--tg-theme-destructive-text-color` (#b91c1c) — errors, warnings
- `--panel-border` — set dynamically from secondary_bg_color
- `--tg-safe-area-inset-*` — notch/punch-hole safe areas

This means your game automatically adapts to the user's Telegram theme (dark/light).


## File-by-file Reference

- `index.html` — Entry point. Loads Telegram WebApp SDK, mounts app
- `vite.config.js` — Preact preset, injects `__COMMIT_HASH__`, `__BOT_USERNAME__`, `__APP_SHORT_NAME__` from wrangler.json
- `wrangler.json` — CF Workers config (domain, D1, Analytics, env vars)
- `schema.sql` — Database tables (users, daily_results, rooms)
- `package.json` — Deps: preact, vite, vitest, wrangler
- `src/main.jsx` — TG init, auth validation, renders App. Redirects to bot if opened outside Telegram
- `src/app.jsx` — Navigation, settings, premium, offline banner
- `src/worker.js` — API routing, auth, analytics, premium
- `src/bot-handler.js` — Bot webhook (commands, payments)
- `src/analytics.js` — Event tracking (fire-and-forget)
- `src/api.js` — Authenticated fetch wrapper
- `src/storage.js` — CloudStorage helpers
- `src/avatar.jsx` — Avatar with premium badge
- `src/i18n.js` — 14 languages, RTL support
- `src/server-i18n.js` — Server translations (bot messages, invoices)
- `src/index.css` — All shared styles
