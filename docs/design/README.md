# MUI components per module — the design-system inventory

A preliminary inventory for an MUI-based design system (CTA-106). Today most
complex UI pieces — compositions of atomic MUI components — are written from
scratch in each view, each with its own tests, so similar things end up
different. These docs only **document what exists**. A follow-up will analyse
them and plan the design system. Nothing under `src/` changed for them.

Inventory taken on 2026-09-27, against `development` at `4a56477` (CTA-105
merged).

The design system's foundation followed it (CTA-107): the layer, the theme
registry and the dev gallery, below. Then its twelve sections were filled
(CTA-108): base components and their variations, each documented in
[`sections/`](#the-sections), and three more themes. The inventory is
unchanged — each section doc names the entries its components are meant to
replace; moving the screens onto them is a follow-up per module.

## The layers

**The reference is [`hierarchy.md`](./hierarchy.md)** (CTA-110): the five
layers, what belongs in each, the rule for where a new component goes, the
import rules, the folder layout and the build-standalone-first workflow.

```
screens           src/views/<module>/                read stores and routes, hold state, compose blocks
  ▲
blocks            src/blocks/<family>/<Block>/       complex, DOMAIN-aware, presentational: data and
  ▲                                                  callbacks as props, built on fixtures in the gallery
patterns          src/design-system/patterns/        complex, GENERIC compositions of base components
  ▲                 <section>/index.ts               (DataTable, TreeView)
base components   src/design-system/components/      one folder per MAIN section, small generic
  ▲                 <section>/index.ts               components and their variations
MUI atoms         @mui/material                      Button, Table, Dialog …
```

Under all of them, the design system's tokens and theme:

```
tokens            src/design-system/themes/          a theme is data: palettes, typography, shape,
  │                                                  overrides and the chess tokens; the registry
  ▼
theme             src/design-system/theme/           buildTheme(theme, mode, direction) → the MUI
                                                     theme; useChessTokens / chessTokensOf; the RTL cache
```

The design system (`src/design-system/`: tokens, theme, base components,
patterns, the gallery) is a folder with a lint boundary rather than a
workspace package: `yarn lint` fails if a file in it imports from
`src/views/`, `src/lib/` or `src/blocks/`, if a base component imports a
pattern, and if a block imports a screen, a store or database module or the
router (`eslint.config.js`; `src/design-system/boundary.test.ts`,
`src/blocks/boundary.test.ts`). It knows no chess screen, no store and no
route. Everything above it depends on it, never the reverse.
`src/views/shared/`'s chess-aware compositions are blocks in all but name
and move into `src/blocks/` as their modules migrate
([`hierarchy.md`](./hierarchy.md#where-srcviewsshared-fits)).

`src/theme/` is the app's wiring of it: `AppThemeWithLang` builds the
reader's theme (`buildTheme(…, "both", direction, { reducedMotion, localization })`) and owns the
choice (`themeChoice.ts`, `localStorage` key `chessapp.theme`), the colour
scheme and the direction; `ForceLTR` keeps the board unmirrored.

### Themes

A theme is a `ThemeDefinition` (`themes/types.ts`):
`{ id, labelKey, light, dark, focusRingWidth, typography, shape, overrides, chess }`.

- `light` / `dark` are the two colour schemes' palettes. The app builds both
  as CSS variables and the header's switch picks one, so every theme has
  both; light and dark are never a theme of their own. Each palette **must**
  carry the accessibility baseline's two colours (CTA-111): `focusRing` (the
  keyboard focus ring) and `controlBorder` (an outlined field's resting
  border), both at 3:1 or better on every background — and every theme sets
  `contrastThreshold: 4.5`, so MUI picks a button's text colour at AA.
- `focusRingWidth` is the ring's thickness (2 px; 3 in the high-contrast
  theme). `buildTheme` draws the ring on every MUI button, the slider's thumb
  and — through `theme.mixins.focusRing` — anything else a component makes
  focusable, lays the 24 px icon-button floor and the control border over
  every theme (`theme/accessibility.ts`), and with `reducedMotion` turns every
  transition and ripple off. A theme tunes them only through these tokens;
  `MuiButtonBase`, `MuiIconButton`, `MuiSlider` and `MuiOutlinedInput` are the
  baseline's, never a theme's override.
- `chess` is **every colour drawn on or over a board** — squares and
  coordinates, the last-move fill, the arrow palettes, the required / untagged
  / play-chance arrows, the book arrows, the move marks' tones, the promotion
  scrim, the map's dots, the filter board's result bars. Declared on MUI's
  `Theme` by module augmentation (`theme/augment.ts`), read through
  `useChessTokens()` / `chessTokensOf(theme)`, never as CSS variables
  ([`chessboard.md`](../../.claude/rules/chessboard.md) §3.6).
- The **default** theme (`themes/default.ts`) is the look the app had before
  themes existed, ported value for value, and react-chessboard's own board
  colours. Any stored choice that is not registered falls back to it.
  Its `chess` tokens are their own MUI-free module (`themes/defaultChess.ts`):
  the one thing `src/lib/` imports from the design system, for the
  default-valued constants (`LAST_MOVE_HIGHLIGHT`, the book arrows), without
  pulling MUI into the collection-index worker.

The registered themes, in the order Settings → Appearance lists them:

| Id | Name | File | What it is |
| --- | --- | --- | --- |
| `default` | Default | `themes/default.ts` | The app's look before themes, unchanged; react-chessboard's board. |
| `brown` | Brown | `themes/brown.ts` | Calm, lichess-like (CTA-108): warm off-white / near-black pages, one blue accent, square-ish corners; lichess's brown board, highlight and arrow brushes. Its squares equal the default's (react-chessboard's defaults *are* lichess's brown) — its board differs in the arrows, book arrows, result bars and map dots. |
| `green` | Green | `themes/green.ts` | Bold, chess.com-like (CTA-108): the green board, the yellow highlight, green / blue / red arrows, move-classification tones, heavy headings and chunky buttons. |
| `high-contrast` | High contrast | `themes/highContrast.ts` | WCAG AA or better in both schemes (`themes/themes.test.ts` measures text, status colours, dividers, move marks, coordinates and result bars), a 3 px focus ring in the text colour, strong borders; a board told apart by lightness — its coordinates at AA, the one theme that writes them so — and drawn over in the Okabe–Ito palette. |

The two sites that inspired `brown` and `green` are named only in the files'
comments: another site's brand is never a theme's id or shown name.
`themes/overrides.ts` holds the override helpers the themes after the default
share (the selected nav row's tint, a palette colour read through the CSS
variables when there are any).

`buildTheme(theme, mode, direction, { reducedMotion?, localization? })` takes
`mode` `"both"` (the app's: CSS variables, both schemes, switched by
`data-mui-color-scheme`) or `"light"` / `"dark"` (one fixed scheme and no
variables — a theme that can sit inside the app's, as the gallery's preview
does); `reducedMotion` is the reader's system setting
(`usePrefersReducedMotion`), `localization` MUI's locale bundles.

#### Accessibility token changes (CTA-111)

`themes/contrast.test.ts` measures every theme in light and dark against
WCAG 2.2 AA ([`ACCESSIBILITY.md`](../../ACCESSIBILITY.md)). Where one failed,
the smallest token change fixed it — a colour darkened (light schemes) or
lightened (dark schemes) along its own hue just until it passed 4.5:1 on
every surface (the page, the paper, the sunken rail), and nothing else
touched:

| Theme · scheme | Token | Was | Now | Why |
| --- | --- | --- | --- | --- |
| default · light | `text.secondary` | `#667085` | `#646e83` | 4.43:1 on the page |
| default · light | `error.main` | MUI's `#d32f2f` | `#d22c2c` | 4.43:1 as text on the page |
| default · light | `warning.main` | MUI's `#ed6c02` | `#b45202` | 2.77:1 as text on the page; white on it 3.12:1 |
| default · light | `info.main` | MUI's `#0288d1` | `#0273b1` | 3.43:1 as text on the page; white on it 3.86:1 |
| brown · light | `text.secondary` | `#6b6b6b` | `#6a6a6a` | 4.48:1 on the page |
| brown · light | `primary.main` | `#1b78d0` | `#186cbc` | 3.81:1 as text (a link, a text button) on the page |
| brown · light | `error.main` | MUI's `#d32f2f` | `#cb2b2b` | 4.18:1 as text on the page |
| brown · light | `warning.main` | MUI's `#ed6c02` | `#ae4f01` | 2.62:1 as text on the page |
| brown · light | `info.main` | MUI's `#0288d1` | `#0270ac` | 3.25:1 as text on the page |
| brown · light | `success.main` | MUI's `#2e7d32` | `#2d7931` | 4.31:1 as text on the page |
| brown · dark | `error.main` | MUI's `#f44336` | `#f55145` | 4.19:1 as text on the paper |
| green · light | `primary.main` | `#5d9948` | `#4a7939` | white on it 3.43:1; 3.03:1 as text on the page |
| green · light | `error.main` | MUI's `#d32f2f` | `#d12c2c` | 4.40:1 as text on the page |
| green · light | `warning.main` | MUI's `#ed6c02` | `#b35102` | 2.75:1 as text on the page |
| green · light | `info.main` | MUI's `#0288d1` | `#0273b1` | 3.41:1 as text on the page |
| green · dark | `error.main` | MUI's `#f44336` | `#f6675d` | 3.65:1 as text on the page |
| every theme · both | `contrastThreshold` | MUI's 3 | 4.5 | MUI chose white text at 3:1 (the dark schemes' error buttons 3.68:1, brown dark's primary 3.27:1); now a button's text is picked at AA |
| every theme · both | `focusRing`, `controlBorder` | — (MUI's outlined border is 1.6:1) | the theme's accent (the text colour in high contrast); a 3:1 grey of the theme's own hue | new tokens: a focus ring and a control border at 3:1 |

The board's coordinates are measured too: the high-contrast theme writes them
at AA; the default, brown and green themes keep the traditional look (2.30,
2.30 and 2.84:1) — a known gap, recorded in `ACCESSIBILITY.md`, not changed.

### Adding things

| To add | Do |
| --- | --- |
| **A theme** | A file beside `themes/default.ts` exporting a `ThemeDefinition` (start from a copy of the default; every `chess` group, `focusRingWidth` and each palette's `focusRing` and `controlBorder` are required), an entry in `themes` in `themes/registry.ts`, and its name `appearance.themes.<id>` in `en.ts` and `he.ts`. `themes/contrast.test.ts` then measures it against AA — fix what it reports with the smallest token change. No component changes: Settings → Appearance and the gallery list the registry. Never rename an `id` — it is what the reader's choice is stored as. |
| **A section** | A folder under `components/` with an `index.ts` (the section's public surface) and an entry in `SECTIONS` (`components/sections.ts`), which orders the gallery. A pattern section is the same under `patterns/` and `PATTERN_SECTIONS`; a block family an entry in `BLOCK_FAMILIES` (`src/blocks/families.ts`). |
| **A component** | A folder in its section — `Foo/Foo.tsx`, `Foo/Foo.test.tsx`, `Foo/Foo.gallery.tsx`, `Foo/index.ts` — and a re-export from the section's `index.ts`. **Screens import only from a section's `index.ts`.** It follows [the component rules](#the-component-rules), and its section doc (`sections/<section>.md`) gets an entry. |
| **A pattern or a block** | [`hierarchy.md`](./hierarchy.md#the-folder-layout) — the same four files (a block adds `fixtures.ts`), in its pattern section or block family. |
| **A variation** | One more entry in the component's `Foo.gallery.tsx` `demos` (`{ name, render }`), and whatever prop it needs — optional, its absence today's behaviour. |

### The gallery

`/dev/design/…` — **dev-only**, behind the Development section
([`chessboard.md`](../../.claude/rules/chessboard.md) §9.5): its nav folder
and entry are spreads gated on `import.meta.env.DEV`, its route a
`React.lazy` import in `routes.tsx`'s `devRoutes`, so a production build has no
chunk of it. Its route (`/dev/design/*`, one splat route, so moving between
pages keeps the gallery and its switches mounted) carries
`handle: FULL_WIDTH_ROUTE` (`views/main/routeHandle.ts`), so the shell gives
it the whole body — no board square, no right-hand panel.

**One catalogue of every tier, one page per component** (CTA-110): the menu
down the gallery's left is a collapsible tree — the `TreeView` pattern — of
**tier → section → component**: Base (`/dev/design/<section>/<Component>`),
Patterns (`/dev/design/patterns/<section>/<Pattern>`) and Blocks
(`/dev/design/blocks/<family>/<Block>`). The chain above the page on screen
opens with it; the reader opens and closes the rest. A section's own address
(`/dev/design/tables`, CTA-107's pages), `/dev/design` and an unknown page land
on a component's page. The gallery itself knows no route: the wrapper
(`views/dev/design/Main.tsx`) hands it the page from the URL and a
`sectionPath(page)`.

It finds every `components/**/*.gallery.tsx` and `patterns/**/*.gallery.tsx`
with `import.meta.glob` (`gallery/discover.ts`) — a gallery module
default-exports `{ section, title, demos }` and needs no registration; its
page is named by the folder it sits in. The design system may not import a
block, so the Blocks tier comes in as a prop: the wrapper globs
`src/blocks/**/*.gallery.tsx`, groups them by `BLOCK_FAMILIES` and passes
them as `tiers`. Each page previews the component's demos under a theme,
light / dark and LTR / RTL switch of its own, which changes the preview only.

A `*.gallery.tsx` default-exports data, so it declares no component of its
own (react-refresh's lint rule). A demo that must be live holds its state in
`gallery/WithState.tsx` and calls a hook through `gallery/WithHook.tsx`; a
dialog is shown open in the page with `gallery/DialogFrame.tsx` (portalled
into a transformed box, so several can be open at once, none trapping focus);
tables and cards borrow `gallery/demoTable.tsx` and `gallery/demoPreview.tsx`
(a preview board in the theme's own squares). `gallery/everyTheme.test.tsx`
renders every base and pattern page, and `views/dev/design/Main.test.tsx`
every block's page, under every theme, both schemes and both directions, and
fails on any console error.

After `yarn build`, `grep -r -e "/dev/design" -e "design-gallery" -e
"DesignGallery" -e ".gallery" -e "FolderTree" -e "PLAYED_ROWS" -e
"NON_PAWNS" -e "SHIPPED_OPTIONS" -e "gallery-" dist/` finds nothing (the nav's two label strings,
`nav.folders.development` and `nav.designSystem`, are in the shipped
catalogs, as every nav label must be).

## The component rules

Every component in `components/` (CTA-108) — and every pattern and block
(CTA-110) — checked where a check can be written (each tier's
`conventions.test.ts` over `src/test/tierConventions.ts`, the lint boundary):

- **It knows no screen.** Every word it shows arrives as a prop (screens pass
  `t(…)`), so no component adds a locale key; MUI's own words (a pager's
  arrows, "No options") come from the theme's locale bundle. The only
  character a component supplies is the en dash of an empty cell.
- **It takes a `testId`** and derives its parts' ids from it
  (`${testId}-confirm`, …) — on the **input** for a single control — so a
  screen's tests keep their ids when it migrates.
- **Colours, spacing, radius and typography come from the theme** — palette
  keys (`"error.main"`, `"divider"`), spacing units, typography variants,
  `alpha()` over a palette colour; never a colour literal. Every theme
  restyles it.
- **RTL-safe.** Logical properties (`paddingInlineStart`, `marginInlineEnd`,
  `borderInlineStart`, `textAlign: "end"`), never left / right. A token that
  must stay LTR (a number, a date, SAN, a FEN) takes `dir="ltr"`; a reader's
  words take `dir="auto"`. An arrow glyph that points somewhere is mirrored by
  an inline `transform` from `theme.direction` (the stylis plugin leaves inline
  styles alone). A portalled part (a dialog, a menu) carries the theme's
  direction as `dir`.
- **Variations are props** — a tone, a size, a density, an optional part —
  whose absence is the base; each has its own gallery demo.
- **Accessible** (CTA-111, [`hierarchy.md`](./hierarchy.md#accessibility)):
  its name is a required prop, its states are announced, the keyboard
  operates all of it, and its every demo passes axe.
- **A part that can go somewhere takes a `LinkTarget`** (`components/link.ts`):
  react-router's `Link` as `component` with its `to`, or an `href`. The design
  system imports no router of its own; `useTableUrlState` alone reads the URL,
  through react-router's `useSearchParams`.

## The sections

| Section | Components | Reference |
| --- | --- | --- |
| Dialogs | `BaseDialog`, `ConfirmDialog`, `DeleteManyDialog`, `FormDialog`, `ProgressDialog` + `useCancellableJob`, `FullScreenDialog` | [`sections/dialogs.md`](./sections/dialogs.md) |
| Tables | `TableFrame`, `SortHeaderCell`, `PickHeaderCell`, `PickCell`, `RowActionsCell`, `TablePager`, `EmptyTableRow`, `LoadingTableRow`, `NumberCell`, `DateCell`, `useTableUrlState` + `sortRows` | [`sections/tables.md`](./sections/tables.md) |
| Forms | `FieldLabel`, `SwitchField`, `CheckboxField`, `SideToggle`, `SliderField`, `SelectField`, `SearchField`, `DateRangeFields`, `FileInputButton`, `SettingsSection`, `SettingsFrame` + `useDraft` | [`sections/forms.md`](./sections/forms.md) |
| Autocompletes | `ChipsAutocomplete`, `SelectAutocomplete` | [`sections/autocompletes.md`](./sections/autocompletes.md) |
| Feedback | `SnackbarProvider` + `useSnackbar` (mounted once in `src/main.tsx`), `InlineAlert`, `FeedbackStrip`, `StatusText` | [`sections/feedback.md`](./sections/feedback.md) |
| States | `LoadingLine`, `LoadingSpinnerLine`, `EmptyState`, `MissState`, `ProgressLine` | [`sections/states.md`](./sections/states.md) |
| Toolbars | `IconAction`, `ToggleIconAction`, `ListScreenHeader`, `ActionBar` | [`sections/toolbars.md`](./sections/toolbars.md) |
| Navigation | `BackButton`, `Breadcrumbs`, `ExpandToggle` | [`sections/navigation.md`](./sections/navigation.md) |
| Tabs | `PanelTabs` | [`sections/tabs.md`](./sections/tabs.md) |
| Menus | `ContextMenu`, `AnchoredMenu` | [`sections/menus.md`](./sections/menus.md) |
| Lists | `RecordRow`, `FolderRow`, `PickerList` | [`sections/lists.md`](./sections/lists.md) |
| Cards | `CardGrid`, `RecordCard`, `FolderCard`, `IconCard` | [`sections/cards.md`](./sections/cards.md) |

The **patterns** (CTA-110), `src/design-system/patterns/`:

| Section | Patterns | Reference |
| --- | --- | --- |
| Tables | `DataTable` | [`sections/patterns/tables.md`](./sections/patterns/tables.md) |
| Trees | `TreeView` | [`sections/patterns/trees.md`](./sections/patterns/trees.md) |

The **blocks** (CTA-110), `src/blocks/`, are listed in
[`hierarchy.md`](./hierarchy.md#4-blocks--srcblocksfamilyblock).

## What is in scope

- **In**: every MUI composition that is shared, or complex enough to be worth
  sharing even if it is used once today: list screens, tables, cards, dialogs,
  forms and settings groups, toolbars, filter bars, empty / loading / error
  states, upload and import flows, and the board screens' **right-hand panel**
  UI (the `BoardPanel` skeleton, tabs, the Engine / Arrows / Load / Export tab
  bodies, the save dialogs, the changes strips).
- **Out**: the board square and everything drawn on it (the chessboard, arrows,
  pieces and piece masking, `EvalBar`, the `CapturedPieces` strips,
  `PlayerPlate`, `PromotionPicker`, `EngineBoardSquare`, `BoardShell`'s square),
  and the rendering of the move list, the variation tree and the map
  (`MoveList`, `VariationLine`, `NagGlyphs`, `TreeMoveList`, the map's SVG).
  The map's **chrome** (its toolbar and full-screen dialog) is in.
- **Not listed as entries**: trivial single-atom uses (a lone `Typography`
  or `Box`), the layout-only `…Main.tsx` route wrappers (each is
  `<Box data-testid="…-wrapper" sx={{ height: "100%" }}>`, 18 of them), and
  route components that render no MUI themselves (`PlayWithEngine.tsx`,
  `RepertoireGame.tsx`). Each module doc says what it left out and why.

## The per-component template

Every entry in every doc uses these ten fields, in this order, so the docs can
be compared side by side:

| Field | What goes there |
| --- | --- |
| **Name and location** | The component name and its file path, with the line when it is an inner component or an inline block. |
| **Family** | One of the families below. |
| **MUI atoms** | The MUI components it composes. Icons are named only when they carry meaning. |
| **What it does** | Its purpose and capabilities: sorting, pagination, selection, inline edit, keyboard, drag, … |
| **API** | Its props, or *inline in `<parent>`* when it is not a component of its own. |
| **Used by** | Every call site. |
| **Tests** | The test files that cover it. |
| **Styling** | Notable `sx`: spacing, sizes, colours, typography variants, hard-coded values, RTL handling (`paddingInlineStart` vs `paddingLeft`, `ForceLTR`, `dir="ltr"`). |
| **Similar elsewhere** | Look-alikes in other modules — the duplication candidates. |
| **Verdict** | **already shared**, **share candidate**, or **module-specific but needs design consistency** — with one line of why. |

## The families

`table` · `list` · `card grid` · `dialog` · `form / settings group` ·
`toolbar / action bar` · `filter bar` · `tabs` · `menu` ·
`empty / loading / error state` · `feedback (alert / snackbar)` ·
`navigation` · `other`

Each module doc ends with **Consistency notes**: for each family present in the
module, how it differs from the same family elsewhere.
[`Shared.md`](./Shared.md) ends with the cross-module comparisons, the four
tables first.

## The docs

144 entries in all — **38 already shared**, **55 share candidates**, **51
module-specific but needing design consistency**.

| Doc | Covers |
| --- | --- |
| [`Shared.md`](./Shared.md) | `src/views/shared/` (folders, saved-list pieces, `OptionSlider`, `CopyableValue`, `GameInfo`, the position editor's chrome, …), the `BoardPanel` skeleton, the non-tree chrome of `src/views/explorer/` (menu, dialogs, comment block, map toolbar), and the app shell (`src/views/main/`, `src/views/home/`, the header controls in `src/theme/`). **Module docs link here instead of repeating it**, and it carries the **cross-module comparisons** (the four tables, then every family). |
| [`Engine.md`](./Engine.md) | Play with Engine, Masked Pieces, the Lobby and its new-game form (`src/views/engine/`). |
| [`Library.md`](./Library.md) | The Library: the folder tree, a collection's table and filters, the upload and its import popup, a game's board panel (`src/views/library/`). |
| [`Analyses.md`](./Analyses.md) | The Analysis Board's panel, Saved analyses, the new-analysis form, the settings screen, and the board-panel pieces other boards borrow from `src/views/tools/analysis/`. |
| [`Repertoires.md`](./Repertoires.md) | The Repertoires list and folders, the upload and merge/split choice, the player's panel, the settings screen (`src/views/repertoires/`). |
| [`Openings.md`](./Openings.md) | The Openings explorer's panel and Book tab (`src/views/openings/`). |
| [`Settings.md`](./Settings.md) | Settings: Export, Import (and its two dialogs), Storage (`src/views/settings/`). |

## The MUI census

Per-component imports (`@mui/material/<Name>`) across `src/views`, non-test
files, counted on 2026-09-27 — 61 distinct atoms (plus `@mui/material/styles`
and the icons). The heaviest, by the number of files importing them:

| Atom | Files | Atom | Files | Atom | Files |
| --- | --- | --- | --- | --- | --- |
| Box | 94 | Dialog | 19 | CircularProgress | 6 |
| Typography | 69 | DialogTitle / Content / Actions | 18 each | Tabs / Tab | 5 each |
| Button | 43 | Alert | 17 | Card / CardActionArea | 5 each |
| Tooltip | 23 | Switch | 13 | Table + Head/Body/Row/Cell | 4 each |
| IconButton | 23 | ToggleButton | 11 | Slider / LinearProgress | 4 each |
| TextField | 20 | Checkbox | 11 | TableSortLabel / TableContainer | 3 each |
| FormControlLabel | 20 | ToggleButtonGroup | 10 | TablePagination / Snackbar / Menu / Autocomplete | 2 each |

In the JSX: **22 dialog compositions** (in 19 files), **56 `Tooltip`s and 52
`IconButton`s** (in 23 files each; nearly every icon button has its tooltip,
and a disabled one sits in a `<span>` so the tooltip still opens), **28
`FormControlLabel`s** over a `Switch`, `Checkbox` or `Radio` (23 `Switch`es),
**10 `ToggleButtonGroup`s** (8 of them a White / Black side choice), **25
`Alert`s**, **5 `Card` / `CardActionArea` grids**, and **4 table components**
(`PlayedGames`, `CollectionScreen`'s `CollectionTable`, `FolderTreeTable`,
`StorageTab`).

## The strongest duplication candidates

Ranked by how many near-copies exist today; each is detailed in the docs
named.

1. **The switch with a help caption** — 6 copies with small differences in
   size and test-id placement: `SwitchOption`, `SwitchSetting`, the Arrows tab,
   the analysis settings screen, the Masking tab (twice). [Shared.md →
   form / settings group](./Shared.md#form--settings-group).
2. **The list screen's top bar** — title, count caption, actions, a bottom
   divider — 5 screens, 3 spacing variants. [Shared.md → toolbar / action
   bar](./Shared.md#toolbar--action-bar).
3. **The White / Black toggle** — 8 `ToggleButtonGroup`s with 5 different
   `sx`. [Shared.md → form / settings group](./Shared.md#form--settings-group).
4. **The destructive confirm dialog** — 8 compositions, two button styles, two
   body styles, three "delete N picked" variants.
   [Shared.md → dialog](./Shared.md#dialog).
5. **The table's URL state** (sort / dir / page / rows, `setState`, `sortBy`,
   `defaultDirection`) — the same ~40 lines in three screens.
   [Shared.md → the four tables](./Shared.md#the-four-tables).
6. **The labelled slider row** — `OptionSlider` plus four inline copies of its
   label-and-value header (depth and move time, twice).
   [Shared.md → `OptionSlider`](./Shared.md#optionslider).
7. **The PGN input** (file pick, paste box, read button, problem `Alert`) —
   five screens, three paste-box sizes, two hidden-input techniques.
   [Shared.md → upload / import flows](./Shared.md#upload--import-flows).
8. **The indexing dialog** — `ImportOptionsDialog` and `MultiGameDialog` share
   the abort / progress / write-lock logic line for line.
   [Library.md](./Library.md#importoptionsdialog).
9. **Folder rows and cards** — the shared `SavedFolderRow` / `SavedFolderCard`
   beside `RepertoireFolderRow` / `RepertoireFolderCard`, which look different
   in two screens built to look the same. [Repertoires.md](./Repertoires.md#repertoirefolderrow--repertoirefoldercard).
10. **The "Start" footer** of the two Lobby forms — the same warning `Alert`,
    full-width large button and storage note. [Engine.md](./Engine.md#start-footer).
