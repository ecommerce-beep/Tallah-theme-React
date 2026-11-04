import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // One React for the app and the engine, as in vite.config.ts: a test that renders a real
  // engine provider otherwise gets the engine's own copy (null hooks) when it is linked.
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    // Only the engine's Vite plugin serves this; tests get the locale files directly.
    alias: {
      'virtual:twilight/theme-translations': fileURLToPath(
        new URL('./tests/stubs/theme-translations.ts', import.meta.url)
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.tsx'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // The default 5s is too tight when every worker is busy: the style tests compile
    // Sass + Tailwind per test and the layout tests import the whole engine, and under
    // load they took 6-11s (passing alone in <4s). Only the budget grows, not the checks.
    testTimeout: 20_000,
    // `beforeAll` hooks that compile Sass + Tailwind (tests/styles) passed the default 10s under load.
    hookTimeout: 30_000,
    server: {
      deps: {
        // Vite resolves the extensionless imports in twilight-components-react's dist; Node's ESM rejects them.
        inline: ['@salla.sa/twilight-theme-engine'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['app/**/*.{ts,tsx}'],
      exclude: ['app/**/*.d.ts'],
    },
    reporters: ['default', 'json'],
    outputFile: './coverage/test-results.json',
  },
});
