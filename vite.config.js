import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // react-snap bundles Chromium ~69; transpile modern syntax (e.g. ?.) for prerender
    target: 'es2015',
  },
})
