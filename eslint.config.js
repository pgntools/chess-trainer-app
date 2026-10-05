import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
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

/**
 * **The MUI lock** (CTA-116): the MUI atoms the design system wraps, and what
 * to use instead. `src/views/` and `src/blocks/` build from the design
 * system's tiers, so a screen or a block that imports one of these has
 * quietly gone round it — its own dialog stack, its own table, a tooltip with
 * no name — and the accessibility the tiers carry (CTA-111) goes with it.
 *
 * Only the design system itself (`src/design-system/`) wraps them. The
 * deliberate exceptions — a job no component does yet — stay where they are
 * with a per-line disable that carries its reason, and are counted in
 * `docs/design/migration.md` §4.4 (`src/views/boundary.test.ts` holds the two
 * lists to each other). Confirmed against `docs/design/sections/` and
 * `migration.md` §3.
 *
 * `DialogContentText` is deliberately **not** locked: it is a dialog body's
 * secondary text (a `ConfirmDialog`'s own `message` is one), not a dialog.
 */
const MUI_LOCK = [
  {
    atoms: ['Dialog', 'DialogTitle', 'DialogContent', 'DialogActions'],
    use: 'BaseDialog, ConfirmDialog, DeleteManyDialog, FormDialog, ProgressDialog or FullScreenDialog (design-system/components/dialogs)',
  },
  {
    atoms: [
      'Table',
      'TableHead',
      'TableBody',
      'TableRow',
      'TableCell',
      'TableContainer',
      'TableFooter',
      'TableSortLabel',
      'TablePagination',
    ],
    use: 'DataTable (design-system/patterns/tables), or a block over it',
  },
  { atoms: ['Tabs', 'Tab'], use: 'PanelTabs (design-system/components/tabs)' },
  { atoms: ['Switch'], use: 'SwitchField (design-system/components/forms)' },
  {
    atoms: ['Snackbar', 'SnackbarContent'],
    use: 'useSnackbar() (design-system/components/feedback)',
  },
  { atoms: ['Alert', 'AlertTitle'], use: 'InlineAlert (design-system/components/feedback)' },
  {
    atoms: ['Tooltip'],
    use: 'IconAction (an icon button) or HintButton (a text button) (design-system/components/toolbars)',
  },
  {
    atoms: ['ToggleButtonGroup', 'ToggleButton'],
    use: 'SideToggle or ViewToggle (design-system/components/forms, .../toolbars)',
  },
  { atoms: ['Breadcrumbs'], use: 'Breadcrumbs (design-system/components/navigation)' },
  {
    atoms: ['Menu', 'MenuItem'],
    use: 'AnchoredMenu or ContextMenu (design-system/components/menus)',
  },
  { atoms: ['Pagination'], use: 'TablePager (design-system/components/tables)' },
  { atoms: ['Slider'], use: 'SliderField (design-system/components/forms)' },
  {
    atoms: ['Autocomplete'],
    use: 'SelectAutocomplete or ChipsAutocomplete (design-system/components/autocompletes)',
  },
]

const muiLockMessage = (atoms, use) =>
  `${atoms.join(' / ')}: use ${use} instead — src/views/ and src/blocks/ build from the design system, not from the MUI atoms it wraps (docs/design/hierarchy.md, "The import rules"; docs/design/migration.md §3 says what replaced each). A job no component does yet is a deliberate exception: disable this line with its reason and list it in migration.md §4.4.`

/** `import { Dialog } from "@mui/material"` — the barrel. */
const MUI_LOCK_PATHS = MUI_LOCK.map(({ atoms, use }) => ({
  name: '@mui/material',
  importNames: atoms,
  message: muiLockMessage(atoms, use),
}))

/** `import Dialog from "@mui/material/Dialog"` — the atom's own module. */
const MUI_LOCK_PATTERNS = MUI_LOCK.map(({ atoms, use }) => ({
  regex: `^@mui/material/(${atoms.join('|')})$`,
  message: muiLockMessage(atoms, use),
}))

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
      // The accessibility baseline (CTA-111, ACCESSIBILITY.md): WCAG 2.2 AA
      // for the app's UI. A finding whose fix belongs to a later migration is
      // disabled on its line with the reason; ACCESSIBILITY.md counts them.
      jsxA11y.flatConfigs.recommended,
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
    // A screen builds from the design system, blocks and the board's pieces —
    // not from the MUI atoms the design system wraps (CTA-116, MUI_LOCK).
    // Nothing else of a screen is restricted, so this entry is the lock alone.
    // The MDX editor (src/mdxEditor/, CTA-137) is screens too, in a folder of its own.
    files: ['src/views/**/*.{ts,tsx}', 'src/mdxEditor/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: MUI_LOCK_PATHS, patterns: MUI_LOCK_PATTERNS }],
    },
  },
  {
    // A block is presentational: its rows, state and callbacks arrive as
    // props, so it runs in the gallery on fixtures. It never reads a screen,
    // a store, IndexedDB or the router — and, like a screen, builds from the
    // design system rather than the MUI atoms it wraps (CTA-116). This entry
    // replaces any earlier one for its files, so it holds all three.
    files: ['src/blocks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'react-router', message: BLOCK_ROUTER_MESSAGE }, ...MUI_LOCK_PATHS],
          patterns: [
            ...MUI_LOCK_PATTERNS,
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
