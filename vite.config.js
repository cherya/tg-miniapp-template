import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
})
