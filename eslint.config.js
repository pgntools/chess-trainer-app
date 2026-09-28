import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

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
  {
    // The design system (CTA-107) is a layer of its own: it knows no chess
    // screen, no store and no route, so nothing in it may reach into
    // `src/views/` or `src/lib/`. The screens depend on it, never the reverse.
    files: ['src/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.{1,2}/(.*/)?(views|lib)(/.*)?$',
              message:
                'src/design-system/ is a separate layer: it must not import from src/views/ or src/lib/ (docs/design/README.md, "The layers").',
            },
          ],
        },
      ],
    },
  },
])
