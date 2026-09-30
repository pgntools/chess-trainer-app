---
paths:
  - "src/design-system/**"
  - "src/blocks/**"
  - "src/views/dev/design/**"
  - "docs/design/**"
---

# The design system and the component hierarchy

Loaded whenever you work in `src/design-system/`, `src/blocks/`, the gallery's
route or `docs/design/`. The full reference is
[`docs/design/hierarchy.md`](../../docs/design/hierarchy.md) (the layers, the
decision rule, the import rules, the folder layout, the workflow) and
[`docs/design/README.md`](../../docs/design/README.md) (themes, the base
component rules, the gallery, the section docs). This file is what a session
must not get wrong.

## 1. The five layers

| Layer | Folder | Knows the domain | Reads stores / routes |
| --- | --- | --- | --- |
| Screens | `src/views/<module>/` | yes | **yes — the only one** |
| Blocks | `src/blocks/<family>/<Block>/` | yes — `src/lib/`'s types and pure helpers | no |
| Patterns | `src/design-system/patterns/<section>/<Pattern>/` | no | no |
| Base components | `src/design-system/components/<section>/<Component>/` | no | no (`useTableUrlState` alone reads the URL) |
| MUI atoms | `@mui/material` | — | — |

**Where does it go?** First yes wins:

1. Reads a store, a route or global state → **screen** (split its
   presentational part out as a block).
2. Needs a domain type or a `src/lib/` helper → **block** — even if one
   screen alone uses it, when it is complex.
3. Composes several base components, no domain → **pattern**.
4. Wraps one MUI job, no domain → **base component**.

A generic piece a block needs is a **pattern first**, the block that pattern
over the app's data (`FolderTree` = `TreeView` over `GameFolder`s). The
design system can use a pattern (the gallery's menu is a `TreeView`); it can
never use a block.

## 2. The import rules — `yarn lint` enforces them

- `src/design-system/**` must not import `src/views/`, `src/lib/` or
  `src/blocks/`.
- `src/design-system/components/**` must not import
  `src/design-system/patterns/`.
- `src/blocks/**` must not import `src/views/`, a store or database module
  (`src/lib/*Store.ts`, `*Db.ts`, `idb*.ts`) or `react-router`.
- Screens import every tier — from a section's or family's **`index.ts`**,
  never deeper.

The rules are in `eslint.config.js`. A later `no-restricted-imports` entry
**replaces** an earlier one for files both match (flat config does not merge
a rule's options), so the base tier's entry repeats the design system's
pattern. A new rule gets a case in `src/design-system/boundary.test.ts` or
`src/blocks/boundary.test.ts`.

## 3. Blocks are presentational

Rows, sort / page / filter state, the selection and every callback arrive as
props; a link as a `LinkTarget`, a route change as a callback. A block's
`fixtures.ts` is typed with `src/lib/`'s own types and imported **only** by
its gallery and its test. Build it in the gallery on fixtures first — every
state (loading, empty, no match, one row, 10,000 rows, an unreadable row,
long names, RTL, every theme) — then wire the screen.

## 4. Every component, every tier

- A folder: `Foo.tsx`, `Foo.test.tsx`, `Foo.gallery.tsx`, `index.ts` (a block
  adds `fixtures.ts`), re-exported from its section's / family's `index.ts`
  (`export * from "./Foo";`). A pure helper may sit beside it
  (`columns.ts`, `treeNodes.ts`) so the `.tsx` exports components only
  (react-refresh's lint rule).
- Its words are props (a block may read the catalogs); it takes a `testId`
  and derives its parts' ids from it; colours only from the theme (no
  literal — watch demo `href`s like `#2025`, which read as hex); logical
  properties only; `dir="ltr"` on tokens, `dir="auto"` on a reader's words.
- One gallery demo per variation. A `*.gallery.tsx` default-exports
  `GalleryModule<S>` (`S`: `SectionId`, `PatternSectionId` or
  `BlockFamilyId`) and declares no component — live state goes through
  `gallery/WithState.tsx` / `WithHook.tsx`.
- `src/test/tierConventions.ts` checks all of this for each tier (each tier's
  `conventions.test.ts`).
- **Accessible — WCAG 2.2 AA** (CTA-111; [`hierarchy.md`](../../docs/design/hierarchy.md#accessibility),
  `ACCESSIBILITY.md`):
  - **named by a required prop** — `VisibleLabel` (`components/a11y.ts`) or
    `string`, never optional; a name that goes with an optional part is
    required with it (a union, as `DataTable`'s `rowActions` + `actionsLabel`);
    a `@ts-expect-error` case proves it;
  - **announced**: an outcome `role="status"`, an error `role="alert"`, a
    region being filled `aria-busy`, a progress bar named with its value; a
    spinner beside words `aria-hidden`;
  - **operable by keyboard**, no trap; a composite widget follows its WAI-ARIA
    pattern (`TreeView`: the tree's); a pointer-only shortcut is `aria-hidden`
    with `tabIndex={-1}` and has a keyboard way;
  - **explained** (CTA-112): a widget whose keys are not a page's carries a
    required `hint` read with it (`aria-describedby`, out of sight —
    `visuallyHidden` in `components/a11y.ts`): `TreeView` always, `DataTable`
    with a sort or picks; tabs name their panels (`PanelTabs`' `idPrefix` +
    `tabPanelProps`);
  - **the focus ring from the theme**: MUI's buttons draw it; anything else
    focusable spreads `theme.mixins.focusRing` under `&:focus-visible`;
  - **targets ≥ 24 px** (`MIN_TARGET_PX`) — never pad a control below it;
  - **motion through `theme.transitions`**, never a literal `transition`, so
    reduced motion stops it;
  - **tests ask by role and name** and drive the keyboard with `userEvent`.
- A theme's accessibility is tokens: each palette's `focusRing` and
  `controlBorder`, `focusRingWidth`, `contrastThreshold: 4.5`; `buildTheme`
  owns `MuiButtonBase`, `MuiIconButton`, `MuiSlider`, `MuiToggleButton` (its
  words `text.secondary`, CTA-109), `MuiOutlinedInput` and `MuiTypography`
  (a `subtitle1` / `subtitle2` is a `p`, not MUI's `h6` — CTA-112; a title
  that is a heading says so with `component="h2"`) (`theme/accessibility.ts`),
  so no theme overrides them.
  `themes/contrast.test.ts` measures every theme (through `themes/contrast.ts`,
  CTA-115) — fix a failure with the smallest token change and list it in
  `docs/design/README.md`.

## 5. The gallery

`/dev/design/…`, dev-only (`routes.tsx`'s `devRoutes`, one splat route
`/dev/design/*`). The menu is a `TreeView` of **tier → section → component**;
**every component is a page**: `/dev/design/<section>/<Component>`,
`/dev/design/patterns/<section>/<Pattern>`,
`/dev/design/blocks/<family>/<Block>` — named by the folder the gallery file
sits in. A bare section (`/dev/design/tables`) lands on its first component.
Base and Patterns are discovered in `gallery/discover.ts`; Blocks by the route
(`views/dev/design/Main.tsx`) and handed in as `tiers`. A new component, pattern
or block needs no registration beyond its section / family.

Tests: `gallery/DesignGallery.test.tsx` (pages, menu, switches),
`gallery/everyTheme.test.tsx` (every base and pattern page under every theme ×
scheme × direction, no console error and no axe violation —
`expectNoAxeViolations`, `src/test/axe.ts`; ~3 minutes on its own, a page
allowed `AXE_PAGE_TIMEOUT_MS`), `views/dev/design/Main.test.tsx` (the Blocks
tier, every block's page under every theme, axe too).

**Nothing of it ships**: after `yarn build`, grep `dist/` for `/dev/design`,
`design-gallery`, `DesignGallery`, `.gallery`, the blocks' names and their
fixtures' — nothing (the nav label keys excepted).

**The theme editor** (`/dev/theme-editor`, CTA-115) is the Development
section's second screen, behind the same gate (`views/dev/themeEditor/`):
every token of a theme in sections (a vertical `PanelTabs`, `sections.ts` —
one field per token, which `sections.test.ts` holds it to), a live preview
built like the gallery's, the contrast report, and saving by download only.
Grep `dist/` for `/dev/theme-editor`, `theme-editor`, `ThemeEditor`,
`themeDraft` and `themeSource` too — nothing.

## 6. Adding

**A component:** work down [`docs/design/adding-a-component.md`](../../docs/design/adding-a-component.md)
— one checklist, every tick naming its check or "by review"; the table below
is only the shape of each tier's entry. The tier's `conventions.test.ts` fails
a component with no entry in its doc.

| To add | Do |
| --- | --- |
| a base component | its folder in `components/<section>/`, the re-export, an entry in `docs/design/sections/<section>.md` |
| a pattern | its folder in `patterns/<section>/` (a new section: its folder, `index.ts`, an entry in `patterns/sections.ts`), the re-export, `docs/design/sections/patterns/<section>.md` |
| a block | its folder in `src/blocks/<family>/` with `fixtures.ts` (a new family: an entry in `blocks/families.ts`; its folder and `index.ts` with the first block), the re-export, a row in `hierarchy.md`'s Blocks table |
| a theme | `yarn theme:bootstrap --id <id> --name "<Name>" [--name-he …] [--from <theme>]` (scaffolds the file, registers it, names it in both catalogs; `--dry-run` first), then the theme editor (`/dev/theme-editor?theme=<id>`) → download `<camelId>.ts` → replace the file → `contrast.test.ts` and `yarn test:run` — [`CONTRIBUTING.md`](../../CONTRIBUTING.md#create-a-theme). The by-hand steps: [`docs/design/README.md`](../../docs/design/README.md#adding-things). A theme is **data** — its component knobs are values (`components`), and the script's and the editor's files both come from `themes/codegen.ts`; the contrast checks are `themes/contrast.ts`, shared by the test, the editor and the script. |
