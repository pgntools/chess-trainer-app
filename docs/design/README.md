# MUI components per module — the design-system inventory

A preliminary inventory for an MUI-based design system (CTA-106). Today most
complex UI pieces — compositions of atomic MUI components — are written from
scratch in each view, each with its own tests, so similar things end up
different. These docs only **document what exists**. A follow-up will analyse
them and plan the design system. Nothing under `src/` changed for them.

Inventory taken on 2026-09-27, against `development` at `4a56477` (CTA-105
merged).

The design system's foundation followed it (CTA-107): the layer, the theme
registry and the dev gallery, below. The inventory is unchanged; the section
components it points at are the follow-up.

## The layers

The design system lives in **`src/design-system/`**, a folder with a lint
boundary rather than a workspace package: `yarn lint` fails if a file in it
imports from `src/views/` or `src/lib/` (`eslint.config.js`,
`src/design-system/boundary.test.ts`). It knows no chess screen, no store and
no route. Everything above it depends on it, never the reverse:

```
tokens            src/design-system/themes/          a theme is data: palettes, typography, shape,
  │                                                  overrides and the chess tokens; the registry
  ▼
theme             src/design-system/theme/           buildTheme(theme, mode, direction) → the MUI
  │                                                  theme; useChessTokens / chessTokensOf; the RTL cache
  ▼
components        src/design-system/components/      one folder per MAIN section, generic MUI
  │                 <section>/index.ts               compositions and their variations
  ▼
views/shared      src/views/shared/                  the chess-aware pieces (folders, saved lists,
  │                                                  PGN input), later rebuilt on the parts above
  ▼
screens           src/views/<module>/                compose all of the above
```

`src/theme/` is the app's wiring of it: `AppThemeWithLang` builds the
reader's theme (`buildTheme(…, "both", direction, locale)`) and owns the
choice (`themeChoice.ts`, `localStorage` key `chessapp.theme`), the colour
scheme and the direction; `ForceLTR` keeps the board unmirrored.

### Themes

A theme is a `ThemeDefinition` (`themes/types.ts`):
`{ id, labelKey, light, dark, typography, shape, overrides, chess }`.

- `light` / `dark` are the two colour schemes' palettes. The app builds both
  as CSS variables and the header's switch picks one, so every theme has
  both; light and dark are never a theme of their own.
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

`buildTheme(theme, mode, direction, ...locales)` takes `mode` `"both"` (the
app's: CSS variables, both schemes, switched by `data-mui-color-scheme`) or
`"light"` / `"dark"` (one fixed scheme and no variables — a theme that can sit
inside the app's, as the gallery's preview does).

### Adding things

| To add | Do |
| --- | --- |
| **A theme** | A file beside `themes/default.ts` exporting a `ThemeDefinition` (start from a copy of the default; every `chess` group is required), an entry in `themes` in `themes/registry.ts`, and its name `appearance.themes.<id>` in `en.ts` and `he.ts`. No component changes: Settings → Appearance and the gallery list the registry. Never rename an `id` — it is what the reader's choice is stored as. |
| **A section** | A folder under `components/` with an `index.ts` (the section's public surface) and an entry in `SECTIONS` (`components/sections.ts`), which orders the gallery. |
| **A component** | A folder in its section — `Foo/Foo.tsx`, `Foo/Foo.test.tsx`, `Foo/Foo.gallery.tsx`, `Foo/index.ts` — and a re-export from the section's `index.ts`. **Screens import only from a section's `index.ts`.** It takes props, reads the theme, and knows no screen, store or route. |
| **A variation** | One more entry in the component's `Foo.gallery.tsx` `demos` (`{ name, render }`), and whatever prop it needs — optional, its absence today's behaviour. |

### The gallery

`/dev/design` — **dev-only**, behind the Development section
([`chessboard.md`](../../.claude/rules/chessboard.md) §9.5): its nav folder
and entry are spreads gated on `import.meta.env.DEV`, its route a
`React.lazy` import in `App.tsx`'s `devRoutes`, so a production build has no
chunk of it. It finds every `components/**/*.gallery.tsx` with
`import.meta.glob` (`gallery/discover.ts`) — a gallery module default-exports
`{ section, title, demos }` and needs no registration — groups the demos by
section, and previews them under a theme, light / dark and LTR / RTL switch of
its own, which changes the preview only. Each section ships a placeholder demo
of plain MUI atoms until its components land.

After `yarn build`, `grep -r -e "/dev/design" -e "design-gallery" -e
"DesignGallery" -e ".gallery" dist/` finds nothing (the nav's two label
strings, `nav.folders.development` and `nav.designSystem`, are in the shipped
catalogs, as every nav label must be).

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
