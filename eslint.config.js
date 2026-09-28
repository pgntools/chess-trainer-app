import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/** The design system's own boundary (CTA-107, extended to blocks by CTA-110). */
const DESIGN_SYSTEM_BOUNDARY = {
  regex: '^\\.{1,2}/(.*/)?(views|lib|blocks)(/.*)?$',
  message:
    'src/design-system/ is a separate layer: it must not import from src/views/, src/lib/ or src/blocks/ (docs/design/hierarchy.md, "The import rules").',
}

const BLOCK_ROUTER_MESSAGE =
  'src/blocks/ is presentational: it must not import react-router — a link arrives as a LinkTarget prop, a route change as a callback (docs/design/hierarchy.md, "Blocks are presentational").'

export default defineConfig([
  // `docs/vendor/**` is upstream source vendored verbatim for reference (see
  // docs/vendor/react-chessboard/README.md). It is never built or imported —
  // the story files even import from the upstream repo's own `src/`, which
  // does not exist here — so linting it only adds ~94 findings we would never
  // act on. tsc already skips it: every tsconfig project includes only `src`.
  // `coverage` is what `npx vitest run --coverage` writes — generated output,
  // like `dist`, never hand-edited.
  globalIgnores(['dist', 'docs/vendor', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // The component hierarchy's import rules (CTA-107, CTA-110) — MUI atoms →
  // base components → patterns → blocks → screens, each tier importing only
  // the tiers below it. docs/design/hierarchy.md is the reference. A later
  // `no-restricted-imports` entry replaces an earlier one for the files both
  // match (flat config does not merge a rule's options), so the base tier's
  // entry repeats the design system's pattern beside its own.
  {
    // The design system knows no chess screen, no store, no route and no
    // block: nothing in it reaches into `src/views/`, `src/lib/` or
    // `src/blocks/`. Everything above depends on it, never the reverse.
    files: ['src/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [DESIGN_SYSTEM_BOUNDARY] }],
    },
  },
  {
    // A base component is one MUI job; a pattern is composed of base
    // components, so the base tier never imports a pattern.
    files: ['src/design-system/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            DESIGN_SYSTEM_BOUNDARY,
            {
              regex: '^\\.{1,2}/(.*/)?patterns(/.*)?$',
              message:
                'src/design-system/components/ is the base tier: it must not import a pattern from src/design-system/patterns/ (docs/design/hierarchy.md, "The import rules").',
            },
          ],
        },
      ],
    },
  },
  {
    // A block is presentational: its rows, state and callbacks arrive as
    // props, so it runs in the gallery on fixtures. It never reads a screen,
    // a store, IndexedDB or the router.
    files: ['src/blocks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'react-router', message: BLOCK_ROUTER_MESSAGE }],
          patterns: [
            {
              regex: '^\\.{1,2}/(.*/)?views(/.*)?$',
              message:
                'src/blocks/ must not import from src/views/: a screen composes blocks, never the reverse (docs/design/hierarchy.md, "The import rules").',
            },
            {
              regex: '^\\.{1,2}/(.*/)?lib/(idb[^/]*|[^/]*Store|[^/]*Db)(\\.ts)?$',
              message:
                'src/blocks/ is presentational: it must not import a store or database module (src/lib/*Store.ts, *Db.ts, idb*.ts) — its rows arrive as props (docs/design/hierarchy.md, "Blocks are presentational").',
            },
            { regex: '^react-router(-dom)?/', message: BLOCK_ROUTER_MESSAGE },
          ],
        },
      ],
    },
  },
])
