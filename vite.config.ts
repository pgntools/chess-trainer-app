import { configDefaults } from 'vitest/config'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import { existsSync, readFileSync } from 'node:fs'
import pkg from './package.json' with { type: 'json' }
import { blogArticles } from './plugins/blogArticles.ts'

/** `BASE_PATH` as Vite's `base` — a leading and a trailing slash; unset or empty, the GitHub Pages project site's. */
const basePathOf = (value: string | undefined): string => {
  const trimmed = (value ?? '').trim().replace(/^\/+|\/+$/g, '')
  if (value === undefined || value.trim() === '') return '/chess-trainer-app/'
  return trimmed === '' ? '/' : `/${trimmed}/`
}

/**
 * The headers the Static Web Apps host sends with every response (CTA-154) —
 * read from the build's own `dist/staticwebapp.config.json`, so `vite preview`
 * of a `DEPLOY_TARGET=swa` build serves the page as chessapp.dev does: COOP /
 * COEP, so it is cross-origin isolated and the browser pass (`yarn test:a11y`)
 * runs it so. A GitHub Pages build writes no such file and gets none, like its host.
 */
const hostHeadersOf = (): Record<string, string> => {
  const file = 'dist/staticwebapp.config.json'
  if (!existsSync(file)) return {}
  return (JSON.parse(readFileSync(file, 'utf8')) as { globalHeaders?: Record<string, string> }).globalHeaders ?? {}
}

const mdxPlugin = mdx({ mdExtensions: [], include: /\.mdx$/, remarkPlugins: [remarkFrontmatter] })

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
    The sub-path the app is served under (CTA-136): `/chess-trainer-app/` for
    the GitHub Pages *project* site (https://kantorv.github.io/chess-trainer-app/,
    the default, so every local command and test is unchanged), `/` for Azure
    Static Web Apps on https://chessapp.dev/ — `BASE_PATH=/`, set by the
    `build-swa` workflow. Every asset URL and the router basename carry it:
    Vite rewrites `/src/...` and the hashed asset links in index.html against
    it at build time, and `src/App.tsx` feeds the same value to react-router
    as `import.meta.env.BASE_URL`. The base is baked into the build, so each
    host is its own build (`.github/workflows/build.yml`).
  */
  base: basePathOf(process.env.BASE_PATH),
  /*
    The front page at `/` is an MDX document (CTA-126,
    `src/views/home/content/`), compiled to a React component **at build time**
    by `@mdx-js/rollup` — no MDX compiler ships to the browser. It runs
    `enforce: 'pre'`, before the React plugin, so the JSX it emits is then
    transformed (and fast-refreshed in dev) like any `.tsx`: hence `.mdx` in
    the React plugin's `include`. Vitest uses this config, so a test imports a
    `.mdx` file exactly as the app does.

    **`.mdx` only.** The plugin compiles plain `.md` by default too, which
    would turn every doc under `docs/` a test reads as text (`?raw` — the tiers'
    conventions tests check each component's doc entry) into a component.

    **`?raw` stays text.** The plugin strips an id's query before matching, so
    `x.mdx?raw` — the dev-only MDX editor opening an article's source
    (`src/mdxEditor/client/articleSources.ts`) — would be compiled too;
    such an id is left to Vite, which makes it the file's text.

    **Frontmatter is read, never drawn** (CTA-135). An article starts with a
    `---` block of its metadata; `remark-frontmatter` parses it out of the
    document, so it renders nothing (unparsed, it would be a rule and a
    heading). The metadata itself reaches the app through `blogArticles`
    (`plugins/blogArticles.ts`): the Blog's manifest, `virtual:blog-articles`
    — every file's metadata checked, eager, and each body a lazy chunk.
  */
  plugins: [
    blogArticles({ dir: 'src/views/blog/articles' }),
    {
      enforce: 'pre',
      ...mdxPlugin,
      transform: (code: string, id: string) => (/[?&]raw\b/.test(id) ? undefined : mdxPlugin.transform(code, id)),
    },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  ],
  /*
    The Library indexes an upload in a module worker
    (`src/lib/collectionIndex.worker.ts`), which loads the opening book's five
    shards with dynamic `import()`. Vite's default worker format, `iife`,
    cannot code-split, so the worker is built as an ES module — which a
    `{ type: "module" }` worker is anyway.
  */
  worker: { format: 'es' },
  preview: { headers: hostHeadersOf() },
  test: {
    // `e2e/` is Playwright's (CTA-116): a real browser over the production
    // build, run by `yarn test:a11y` — not Vitest's.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    environment: 'jsdom',
    // The MDX editor is in the build only under `yarn mdx-editor:start`
    // (src/mdxEditor/enabled.ts); the tests run with it in, as that command does.
    env: { VITE_MDX_EDITOR: '1' },
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
