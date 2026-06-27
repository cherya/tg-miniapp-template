import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

// Read bot config from wrangler.json so main.jsx can redirect non-Telegram visitors
const wrangler = JSON.parse(readFileSync('./wrangler.json', 'utf8'))
const vars = wrangler.vars || {}

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __BOT_USERNAME__: JSON.stringify(vars.BOT_USERNAME || 'my_game_bot'),
    __APP_SHORT_NAME__: JSON.stringify(vars.APP_SHORT_NAME || 'play'),
  },
})
