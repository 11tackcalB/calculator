import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// During local development the Vite server plays the role the nginx
// container plays in Docker: it serves the UI and forwards /api to the gateway.
const gatewayUrl = process.env.GATEWAY_URL ?? 'http://localhost:8090'
const apiProxy = { '/api': { target: gatewayUrl, changeOrigin: true } }

export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true, proxy: apiProxy },
  preview: { port: 4174, strictPort: true, proxy: apiProxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}', 'src/**/*.d.ts'],
      reporter: ['text', 'html', 'json-summary'],
    },
  },
})
