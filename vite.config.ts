import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `/sb` proxies to a local Supabase stack so the dev server works behind a single forwarded port.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/sb': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/sb/, ''),
      },
    },
  },
})
