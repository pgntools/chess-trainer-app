import { configDefaults } from 'vitest/config'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  /*
    The footer shows the app version. Reading it from package.json here — and
    exposing it as a compile-time constant rather than importing package.json
    into the client bundle — means the CTA-5 release automation's `version`
    bump reaches the UI with no code change. Vitest honours `define` too, so
    tests see the same value.
  */
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  /*
    The app is published as a GitHub Pages *project* site at
    https://kantorv.github.io/chess-trainer-app/, so every asset URL and the
    router basename have to carry that sub-path. Vite rewrites `/src/...` and
    the hashed asset links in index.html against this at build time; in dev
    (and under Vitest) it stays `/`. `src/App.tsx` feeds the same value to
    react-router as `import.meta.env.BASE_URL`.
  */
  base: '/chess-trainer-app/',
  plugins: [react()],
  /*
    The Library indexes an upload in a module worker
    (`src/lib/collectionIndex.worker.ts`), which loads the opening book's five
    shards with dynamic `import()`. Vite's default worker format, `iife`,
    cannot code-split, so the worker is built as an ES module — which a
    `{ type: "module" }` worker is anyway.
  */
  worker: { format: 'es' },
  test: {
    // `e2e/` is Playwright's (CTA-116): a real browser over the production
    // build, run by `yarn test:a11y` — not Vitest's.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    /*
      Vitest's default is 5s per test, which the heavier screen suites (the
      v2 boards, `views/main/Sidebar`, the Library's) sit close to under full
      parallelism — not always the same one, which is the tell that it is
      scheduling rather than a hang.

      Raised rather than papered over per-file: the tests are not wrong and the
      work is real, so the honest fix is to stop asserting that a render
      finishes in five seconds on a loaded machine. A genuine hang still fails,
      three times slower. The two tests that walk the 7,859-node one-tree
      example repertoire carry their own longer timeouts, in place, where the reason is.
    */
    testTimeout: 20000,
    /*
      The suite in three groups (CTA-123), each run on its own —
      `yarn test:unit`, `yarn test:ui`, `yarn test:gallery` — and each its own
      job in CI. The boundaries are file names, so no test moves to join one:

      - `unit`: every `*.test.ts` — the pure logic and the stores; none renders.
      - `ui`: every `*.test.tsx` — components, blocks and screens on jsdom.
      - `gallery`: every `*.matrix.test.tsx` — the gallery's axe matrix, every
        page under every theme (`src/test/galleryMatrix/`). Some 35 minutes
        of tests, so it is not in the pull-request gate: `.github/workflows/
        nightly.yml` runs it nightly and on demand.

      `yarn test:run` is the gate — `unit` and `ui`. `scripts/check-test-groups.js`
      asserts every test file under `src/` is in exactly one group.
    */
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.ts'] } },
      {
        extends: true,
        test: { name: 'ui', include: ['src/**/*.test.tsx'], exclude: [...configDefaults.exclude, 'src/**/*.matrix.test.tsx'] },
      },
      { extends: true, test: { name: 'gallery', include: ['src/**/*.matrix.test.tsx'] } },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        // The bootstrap: nothing renders it, and a test that did would only be
        // asserting that React mounts.
        'src/main.tsx',
        // Type-only modules — they emit no runtime code, so v8 scores them 0%
        // however well the types are used, a number no test can move.
        'src/**/*.d.ts',
      ],
    },
  },
})
