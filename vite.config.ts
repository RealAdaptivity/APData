import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// AP Data routes with the URL hash (#/codes/P0300), so the whole app is one
// index.html and a relative base works at any address: a GitHub Pages project
// URL (/APData/), a custom domain, or a subfolder.
const base = process.env.VITE_BASE_PATH || './'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
