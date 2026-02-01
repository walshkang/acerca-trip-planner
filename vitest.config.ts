import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
