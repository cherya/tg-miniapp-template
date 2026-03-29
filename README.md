# Telegram Mini App Game Template

Starter template for Telegram Mini App games with everything wired up:

- **Preact** — lightweight UI
- **Cloudflare Workers** — backend (auth, API, bot webhook)
- **Cloudflare D1** — SQLite database (users, rooms, daily results)
- **Cloudflare Analytics Engine** — event tracking
- **Telegram Stars** — in-app purchases (premium)
- **14 languages** — i18n on client and server

## What's included

| File | What it does |
|---|---|
| `src/worker.js` | API routing, Telegram auth (HMAC-SHA256), analytics, premium purchase |
| `src/bot-handler.js` | Bot webhook: /start, /terms, /support, payments |
| `src/main.jsx` | WebApp init, fullscreen, theming, validation |
| `src/app.jsx` | App shell with settings + premium button |
| `src/analytics.js` | Fire-and-forget event tracking + session_end on close |
| `src/storage.js` | CloudStorage wrapper (animations, tutorials, premium cache) |
| `src/api.js` | Authenticated API client with error tracking |
| `src/avatar.jsx` | Avatar component with premium badge |
| `src/i18n.js` | Client-side translations |
| `src/server-i18n.js` | Server-side translations (bot messages, invoices) |
| `schema.sql` | D1 tables: users, daily_results, rooms |

## Setup

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Create D1 database: `npx wrangler d1 create my-game-db`
3. Update `wrangler.json` with your domain, bot username, database ID
4. Store secrets:
   ```bash
   npx wrangler secret put BOT_TOKEN
   npx wrangler secret put WEBHOOK_SECRET
   ```
5. Create tables: `npx wrangler d1 execute my-game-db --remote --file schema.sql`
6. Set webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://my-game.example.com/api/bot" \
     -d "secret_token=<WEBHOOK_SECRET>" \
     -d 'allowed_updates=["message","pre_checkout_query"]'
   ```
7. Register bot commands:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
     -H "Content-Type: application/json" \
     -d '{"commands":[{"command":"start","description":"Start the game"},{"command":"terms","description":"Terms and conditions"},{"command":"support","description":"Contact support"},{"command":"paysupport","description":"Payment support"}]}'
   ```
8. `npm install && npm run dev`

## Deploy

Push to GitHub — auto-deploys via Cloudflare Pages, or:

```bash
npm run build
npx wrangler deploy
```

## Add your game

1. Replace `src/app.jsx` with your game screens
2. Add game engine, renderer, multiplayer handler as needed
3. Add game-specific keys to `src/i18n.js` and `src/server-i18n.js`
4. Update `schema.sql` rooms table for your game's multiplayer
5. Customize `src/index.css`
