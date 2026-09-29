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
| **Automated audits** | [axe-core](https://github.com/dequelabs/axe-core)'s WCAG 2.0 / 2.1 / 2.2 A and AA rules run over **every gallery demo** — every base component, pattern and block, under every theme, both colour schemes and both text directions — and over **every screen** in its main states (CTA-109: the Lobby, Play, Masked Pieces, each Settings tab and its dialogs; CTA-113: Saved analyses as rows, cards and empty, the Analysis Board and its settings, the repertoires' list, upload, settings and player, the Library home, a collection, the upload and its import popup, a Library game and an unreadable one, the Openings explorer, Home). A violation fails the test. | `src/design-system/gallery/everyTheme.test.tsx`, `src/views/dev/design/Main.test.tsx`, the screens' tests (`LibraryAccessibility.test.tsx`, `RepertoireAccessibility.test.tsx`, …), through `expectNoAxeViolations` (`src/test/axe.ts`) |
| **Colour contrast** | Every theme, light and dark: body and secondary text on every surface (4.5:1); each palette colour's text on it — a contained button, a chip (4.5:1); the status colours and the accent as text (4.5:1); the keyboard focus ring and a form control's border against every surface (3:1). jsdom paints nothing, so axe's own contrast rule is off in the tests and this test measures the theme tokens instead. | `src/design-system/themes/contrast.test.ts` |
| **Accessible names** | Every control is named: an icon-only button by its `label`, a dialog by its `title`, a field by its `label`, a table by an `ariaLabel` or a `caption`, a tree, a list of choices and a progress bar by their labels, a row's checkbox by its row ("Pick game 12"). The props are **required by the types** — leaving one out does not compile. | `tsc -b`; each component's test asks for it by role and name |
| **Live regions** | A one-line outcome is a `status` (read when the reader is idle), an error an `alert` (read at once); so is a snackbar, by its severity. A store being read is a `status`, a table being read is `aria-busy`, a busy button is `aria-busy`; a progress bar is named and reports its value (`aria-valuenow`) or none while indeterminate. Decorative spinners are hidden. | `src/design-system/components/a11y.test.tsx` and the components' own tests |
| **Keyboard** | Everything interactive is reachable and operable by keyboard, with a visible focus ring from the theme (2 px; 3 px in the high-contrast theme). A data table's sort buttons, picks, row links, row actions and pager take the keyboard, and a row that only has a click opens with Enter or Space. The tree view follows [WAI-ARIA's tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/): one tab stop, ↑ / ↓ / Home / End, → / ← to open, close and step in and out (mirrored under RTL). A dialog keeps the focus inside while open and gives it back to what opened it. Nothing traps the focus. | `userEvent` keyboard tests: `a11y.test.tsx`, `DataTable.test.tsx`, `TreeView.test.tsx`, `FolderTree.test.tsx`; on the migrated screens (CTA-109), the Lobby's table (sort, picks, select-all, row actions, pages), the new-game form, the Engine tab, the mask editor, the Settings tab strip, Export and the Import dialog, and the Lobby's and Replay's dialogs giving the focus back; (CTA-113) the saved lists' view switch, picks and menus, the Library's folder chevrons, a collection's sort, picks and delete dialog, the Book list, the boards' header switches, Home's cards |
| **Target size** | An icon button is never under 24 × 24 CSS px (WCAG 2.5.8); MUI's other controls are larger by default. | `src/design-system/theme/accessibility.test.tsx` |
| **Reduced motion** | When the reader's system asks for reduced motion (`prefers-reduced-motion: reduce`), MUI's transitions and ripples are off, and every board — the game boards, the position editor, the list previews — moves its pieces without animation, and the eval bar and the engine lines' chevrons stop sliding (CTA-113). Without that setting nothing changes. | `accessibility.test.tsx`, `AppThemeWithLang.test.tsx`, `views/shared/boardColors.test.tsx`, `views/board/boards.test.tsx`, `views/shared/EvalBar.test.tsx` |
| **Language and direction** | `<html lang>` and `dir` follow the reader's language; the board never mirrors. | `AppThemeWithLang.test.tsx` |
| **Page structure** (CTA-112) | Every route has its own page title, in the reader's language, the open record's name first ("Carlsen games — Collection — Chess Trainer App"). The shell's landmarks: the banner (the header), the named navigation (the sidebar — a valid list at every depth), **one `main`** named by the page, the named complementary side panel, the footer. **"Skip to main content"** is the first stop of the tab order, shown when focused. **One `h1`** per page — the screen's visible title, or the shell's, out of sight; a bold subtitle is a paragraph, not a heading, and a section's title a level below it. A **move to another screen** takes the focus to its heading, which a screen reader reads; a first load, a query string (`?move=`, `?sort=`) or a move within a screen (a Settings tab, the next Library game) leaves the focus alone. A **tab panel is named by its tab** — on every board and in every `PanelTabs` host. | `src/routes.test.tsx` (every route's title), `views/main/pageStructure.test.tsx` (the title, the landmarks, the skip link, the `h1`, the focus; axe's page-structure rules), `src/pageOutline.test.tsx` (each migrated screen's outline under the real shell), `views/main/Sidebar.test.tsx`, `views/board/boards.test.tsx` |
| **Navigation hints** (CTA-112) | A tree and an interactive table say how they are worked: a short `hint`, read with them by a screen reader (`aria-describedby`) — the tree's arrow keys, a table's sort buttons and picks. Required by the types wherever there is something to explain. | `tsc -b` (`@ts-expect-error` cases in `TreeView.test.tsx`, `DataTable.test.tsx`); axe on their demos |
| **Screen readers** (CTA-112) | A person walks each migrated screen with a screen reader — Orca with Firefox at least, NVDA or VoiceOver where one is to hand, in English and Hebrew — against a script of what should be heard: the title, the landmarks, the headings, every control's name and state, tables, tab panels, dialogs, live announcements, SAN and numbers read left to right. | The protocol, [`docs/design/screen-reader-testing.md`](docs/design/screen-reader-testing.md); what was heard, [`docs/design/screen-reader-results.md`](docs/design/screen-reader-results.md) — run with every module's migration ([`migration.md`](docs/design/migration.md) §5) |

### Token changes the baseline made

Where a theme failed AA, the smallest token change fixed it — each listed in
[`docs/design/README.md`](docs/design/README.md#accessibility-token-changes-cta-111).
The default theme's look changed only where it failed.

## Known gaps

| Gap | Why | Plan |
| --- | --- | --- |
| **The game boards are drag-only** (WCAG 2.5.7, Dragging Movements): no board moves a piece on a click, and there is no keyboard move entry, no spoken moves and no way to read the position. Each piece is a `role="button"` with no name (axe `aria-command-name`, react-chessboard's drag handles). | Accessible play is its own design problem, modelled on lichess's screen-reader mode. | A separate **board accessibility** Story: click-to-move, keyboard (SAN) move entry, move announcements, a position reader. |
| **The board's coordinates** are under 4.5:1 on their squares in the default, brown and green themes (2.30, 2.30 and 2.84:1). | The traditional board look: each coordinate is written in the other square's colour. | The **high-contrast** theme writes them at AA (`contrast.test.ts` measures both, so the numbers here stay true). |
| **An engine line's last move is cut by the panel's edge**: the pinned lines (`BestVariations`) run on past the panel's width, and the move the edge cuts shows 16–23 px of itself (WCAG 2.5.8, found by CTA-113's browser pass). | The line is one clipped row; which move is cut depends on the panel's width. | With the board core's next change: stop the line at the last whole move (measured), or let it wrap. |
| **The sidebar is not on the design system** — it is audited on every page (`pageStructure.test.tsx`, `pageOutline.test.tsx`), but its rows are MUI list atoms, not `TreeView`. | `TreeView`'s keys are a tree's (one tab stop, the arrows); the sidebar's are a page's links, and its Settings foot is pinned. CTA-113 kept its behaviour exactly ([`migration.md`](docs/design/migration.md#44-left-hand-written-and-why)). | Kept; revisit if the shell's navigation changes. |
| **The CTA-113 screen-reader pass is not yet run**: scripts for every migrated screen are ready ([the protocol §3](docs/design/screen-reader-testing.md)), the results rows empty. The first pass (CTA-112) passed informally, its reader and versions unrecorded. | A person has to listen; automation cannot. | The maintainer runs §3's CTA-113 scripts — Orca with Firefox at least, in English and Hebrew — and fills [the results](docs/design/screen-reader-results.md); an issue found is fixed or listed here. |
| **What needs a real browser**: colour contrast of what is actually painted (translucent layers, a board's arrows), the size of targets inside MUI's own components (a chip's delete icon is under 24 px and relies on WCAG's spacing exception), zoom and reflow. | jsdom lays nothing out. | A browser pass with axe (contrast and target size on) when a screen migrates — CTA-109 ran one over Engine and Settings in every theme, scheme and language ([`docs/design/migration.md`](docs/design/migration.md#47-the-browser-pass)) — and the screen-reader pass beside it ([the protocol](docs/design/screen-reader-testing.md)). |
| **Four lint rules are disabled on their line**, each with its reason: `jsx-a11y/no-autofocus` on the first field of three dialogs (`CommentDialog`, `FolderNameDialog`, `SaveAnalysisDialog` — WAI-ARIA's dialog pattern moves the focus into the dialog) and on `SearchField`'s opt-in `autoFocus`. | Intentional. | Kept; a new one needs its own reason. |

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
