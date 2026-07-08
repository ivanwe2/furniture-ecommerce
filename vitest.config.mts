import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // CONVENTIONS §8: pure logic tests co-located in src/lib. The template's
    // tests/int/*.int.spec.ts needs a live Payload + D1 binding, so it is not
    // part of the CI gate; e2e (Playwright) is deferred per CONVENTIONS §8.
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
