import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },
  define: {
    // Match the Vite app config so source files that read APP_VERSION
    // (e.g. useUser.ts) compile under vitest too.
    APP_VERSION: JSON.stringify(process.env.npm_package_version ?? 'test')
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/save/setup.ts'],
    // Playwright owns tests/e2e — vitest must not try to import them.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**']
  }
})