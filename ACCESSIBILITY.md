# Accessibility

This app is for chess players, and chess players include blind and low-vision
players, colour-blind players, players who use only a keyboard and players
with motor impairments. It is also open source: people who extend it copy
what its design system does. So accessibility is built into the design
system, where every screen inherits it, and it is checked, so a change cannot
quietly take it away.

## The target

**[WCAG 2.2](https://www.w3.org/TR/WCAG22/), level AA**, for the app's UI.

The baseline (CTA-111) lives in the design system — the base components,
the patterns and the blocks ([`docs/design/hierarchy.md`](docs/design/hierarchy.md#accessibility))
— and in the themes. Screens reach it as they migrate onto the design system
(CTA-109, then each module). Accessible **play** on the board is a separate
piece of work (see [the known gaps](#known-gaps)).

## What is covered, and how it is checked

| Area | What the app does | Checked by |
| --- | --- | --- |
| **Lint** | [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)'s recommended rules over every `.ts` / `.tsx` file. It sees plain DOM elements (`<div onClick>`, `<img>`, `autoFocus`); MUI's components are covered by the checks below. | `yarn lint` |
| **Automated audits** | [axe-core](https://github.com/dequelabs/axe-core)'s WCAG 2.0 / 2.1 / 2.2 A and AA rules run over **every gallery demo** — every base component, pattern and block, under every theme, both colour schemes and both text directions — and over **the migrated screens** in their main states (CTA-109: the Lobby with games and empty, a game in progress and a finished one, Masked Pieces' Masking tab, each Settings tab, both import dialogs, the import report). A violation fails the test. | `src/design-system/gallery/everyTheme.test.tsx`, `src/views/dev/design/Main.test.tsx`, the Engine and Settings screens' tests, through `expectNoAxeViolations` (`src/test/axe.ts`) |
| **Colour contrast** | Every theme, light and dark: body and secondary text on every surface (4.5:1); each palette colour's text on it — a contained button, a chip (4.5:1); the status colours and the accent as text (4.5:1); the keyboard focus ring and a form control's border against every surface (3:1). jsdom paints nothing, so axe's own contrast rule is off in the tests and this test measures the theme tokens instead. | `src/design-system/themes/contrast.test.ts` |
| **Accessible names** | Every control is named: an icon-only button by its `label`, a dialog by its `title`, a field by its `label`, a table by an `ariaLabel` or a `caption`, a tree, a list of choices and a progress bar by their labels, a row's checkbox by its row ("Pick game 12"). The props are **required by the types** — leaving one out does not compile. | `tsc -b`; each component's test asks for it by role and name |
| **Live regions** | A one-line outcome is a `status` (read when the reader is idle), an error an `alert` (read at once); so is a snackbar, by its severity. A store being read is a `status`, a table being read is `aria-busy`, a busy button is `aria-busy`; a progress bar is named and reports its value (`aria-valuenow`) or none while indeterminate. Decorative spinners are hidden. | `src/design-system/components/a11y.test.tsx` and the components' own tests |
| **Keyboard** | Everything interactive is reachable and operable by keyboard, with a visible focus ring from the theme (2 px; 3 px in the high-contrast theme). A data table's sort buttons, picks, row links, row actions and pager take the keyboard, and a row that only has a click opens with Enter or Space. The tree view follows [WAI-ARIA's tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/): one tab stop, ↑ / ↓ / Home / End, → / ← to open, close and step in and out (mirrored under RTL). A dialog keeps the focus inside while open and gives it back to what opened it. Nothing traps the focus. | `userEvent` keyboard tests: `a11y.test.tsx`, `DataTable.test.tsx`, `TreeView.test.tsx`, `FolderTree.test.tsx`; on the migrated screens (CTA-109), the Lobby's table (sort, picks, select-all, row actions, pages), the new-game form, the Engine tab, the mask editor, the Settings tab strip, Export and the Import dialog, and the Lobby's and Replay's dialogs giving the focus back |
| **Target size** | An icon button is never under 24 × 24 CSS px (WCAG 2.5.8); MUI's other controls are larger by default. | `src/design-system/theme/accessibility.test.tsx` |
| **Reduced motion** | When the reader's system asks for reduced motion (`prefers-reduced-motion: reduce`), MUI's transitions and ripples are off, and every board — the game boards, the position editor, the list previews — moves its pieces without animation. Without that setting nothing changes. | `accessibility.test.tsx`, `AppThemeWithLang.test.tsx`, `views/shared/boardColors.test.tsx`, `views/board/boards.test.tsx` |
| **Language and direction** | `<html lang>` and `dir` follow the reader's language; the board never mirrors. | `AppThemeWithLang.test.tsx` |

### Token changes the baseline made

Where a theme failed AA, the smallest token change fixed it — each listed in
[`docs/design/README.md`](docs/design/README.md#accessibility-token-changes-cta-111).
The default theme's look changed only where it failed.

## Known gaps

| Gap | Why | Plan |
| --- | --- | --- |
| **The game boards are drag-only** (WCAG 2.5.7, Dragging Movements): no board moves a piece on a click, and there is no keyboard move entry, no spoken moves and no way to read the position. Each piece is a `role="button"` with no name (axe `aria-command-name`, react-chessboard's drag handles). | Accessible play is its own design problem, modelled on lichess's screen-reader mode. | A separate **board accessibility** Story: click-to-move, keyboard (SAN) move entry, move announcements, a position reader. |
| **The board's coordinates** are under 4.5:1 on their squares in the default, brown and green themes (2.30, 2.30 and 2.84:1). | The traditional board look: each coordinate is written in the other square's colour. | The **high-contrast** theme writes them at AA (`contrast.test.ts` measures both, so the numbers here stay true). |
| **Screens not yet on the design system** are not audited by axe, and some of their own transitions (the eval bar, the folder table, the engine lines) ignore reduced motion. | The baseline is the design system's; screens inherit it as they migrate. | Engine and Settings are migrated and audited (CTA-109, [`docs/design/migration.md`](docs/design/migration.md)); each module's migration after it. |
| **Play's thinking spinners** — `PlayToggleButton` and `EngineThinking` (`views/tools/analysis/`), on Play with Engine, Masked Pieces and every board with Play — are progress bars with no name while the engine thinks (axe: `aria-progressbar-name`). | Borrowed by the Engine screens, owned by the Analysis module; CTA-109 changed only Engine and Settings. | The Analysis module's migration: name them, or hide them beside their words. |
| **The sidebar nests a list item in a list item** in an open folder (axe `listitem`; React warns on every page). | Found by CTA-109's browser pass; the shell (`views/main/Sidebar.tsx`) was not part of the pilot. | The Shared + shell migration — the sidebar onto `TreeView`. |
| **The pinned engine lines' targets** are small — a move 17 px tall, the block's toggle 22 px (WCAG 2.5.8) — and a secondary line is 3.65:1 under brown, dark. | `BestVariations` is the board core's; found by CTA-109's browser pass. | With the board core's move onto the design system. |
| **The board panel's and the new-game form's tab panels** are `role="tabpanel"` with no `aria-labelledby` back to their tab. | `PanelTabs` gives its tabs no ids to point at; `BoardPanel` is the board core's. | A `PanelTabs` prop for the panels' ids, with `BoardPanel`'s migration. |
| **What needs a real browser**: colour contrast of what is actually painted (translucent layers, a board's arrows), the size of targets inside MUI's own components (a chip's delete icon is under 24 px and relies on WCAG's spacing exception), zoom and reflow. | jsdom lays nothing out. | A browser pass with axe (contrast and target size on) when a screen migrates — CTA-109 ran one over Engine and Settings in every theme, scheme and language ([`docs/design/migration.md`](docs/design/migration.md#47-the-browser-pass)); a screen reader pass is still to come. |
| **Five lint rules are disabled on their line**, each with its reason: `jsx-a11y/no-autofocus` on the first field of four dialogs (`CommentDialog`, `RepertoireFolderDialogs`, `FolderNameDialog`, `SaveAnalysisDialog` — WAI-ARIA's dialog pattern moves the focus into the dialog) and on `SearchField`'s opt-in `autoFocus`. | Intentional. | Kept; a new one needs its own reason. |

## Reporting a problem

Open a [GitHub issue](https://github.com/pgntools/chess-trainer-app/issues/new)
with the **`accessibility`** label. Say what you were doing, what you
expected and what happened, and — if you can — your browser, your assistive
technology (screen reader, magnifier, switch access, voice control) and the
app's theme and language. A barrier that stops you using a screen is a bug,
not a feature request.

## For contributors

- Build a component in the design system, in the gallery, first — the axe
  check and the contrast test then cover it in every theme
  ([`docs/design/hierarchy.md`](docs/design/hierarchy.md#accessibility)).
- Name every control through its component's props; the types insist.
- In tests, **find things by role and name** (`getByRole("button", { name })`,
  `getByLabelText`) and drive them with `userEvent`'s keyboard — a test that
  can find a control that way is a test that a screen reader can find it too.
  A screen test can assert the whole render with `await expectNoAxeViolations()`
  (`src/test/axe.ts`).
- Never write a colour literal: add or use a theme token, which the contrast
  test measures.
