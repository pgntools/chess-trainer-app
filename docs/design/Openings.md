# Openings — the Openings explorer's panel

`src/views/openings/`: the Openings explorer (`/openings`) — a full analysis
board with eco.json's continuations beside it and a hand-off to the Analysis
Board. It keeps nothing, so it has no list, no folders and no dialogs of its
own. The module's reference is
[`.claude/rules/openings-explorer.md`](../../.claude/rules/openings-explorer.md).
Template and families: [`README.md`](./README.md).

**Nearly all of its panel is borrowed**, and documented where it lives:

| Tab / piece | Component | Doc |
| --- | --- | --- |
| The skeleton, pinned variations, status row, board controls | `BoardPanel` | [`Shared.md`](./Shared.md#boardpanel) |
| The opening line and its ECO chip | `CurrentOpening` | [`Shared.md`](./Shared.md#currentopening) |
| Moves, Map, the comment block, the next-moves bar | the explorer's parts | [`Shared.md`](./Shared.md#the-explorers-chrome--viewsexplorer), [`Analyses.md`](./Analyses.md#nextmovesbar) |
| Load (with the inline merge-only choice, `MergeSplitChoice`) | `AnalysisLoad` | [`Analyses.md`](./Analyses.md#analysisload) |
| Export | `AnalysisExport` | [`Analyses.md`](./Analyses.md#analysisexport) |
| Engine | `AnalysisSettings` | [`Analyses.md`](./Analyses.md#analysissettings) |
| Play, Play's status line | `PlayToggleButton`, `EngineThinking` | [`Analyses.md`](./Analyses.md#playtogglebutton) |

---

### OpeningsBoard header

- **Name and location** — inline in `OpeningsBoard`, `src/views/openings/OpeningsBoard.tsx:166-217`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Tooltip, IconButton, FormControlLabel, Switch (+ `CurrentOpening`, `PlayToggleButton`)
- **What it does** — The current opening, then **Analysis** (the whole tree handed to the Analysis Board as location state, the position as `?at=`), **Play from here** (`/engine/play?fen=`), Play, and the engine switch.
- **API** — inline in `OpeningsBoard` (the `header` slot).
- **Used by** — `OpeningsBoard`.
- **Tests** — `openings/OpeningsBoard.test.tsx` (`openings-open-analysis`, `openings-play-from-here`, `openings-play`), `board/boards.test.tsx` (`openings-setting-engine`); the current-opening line is covered by `shared/CurrentOpening.test.tsx`, not here.
- **Styling** — the opening in a growing box (`flexGrow: 1 minWidth: 0`); icon buttons `size="small" flexShrink: 0` with tooltips and `aria-label`s; the switch `small`, `FormControlLabel marginInlineEnd: 0`.
- **Similar elsewhere** — the other board headers ([toolbar / action bar](./Shared.md#toolbar--action-bar)). This one has no Save, no back and no settings; its two hand-offs are icon buttons where Play with Engine's and the Library game's are text buttons (*Open in analysis*).
- **Verdict** — module-specific but needs design consistency — the hand-off to the Analysis Board is an icon here and a labelled button on the other two screens.

### Moves-tab arrows switch

- **Name and location** — inline in `OpeningsBoard`, `src/views/openings/OpeningsBoard.tsx:243-257`
- **Family** — form / settings group
- **MUI atoms** — FormControlLabel, Switch
- **What it does** — The tree's next-move arrows on / off, above the move list (the book's arrows stay: the book is the screen's point).
- **API** — inline in `OpeningsBoard`.
- **Used by** — `OpeningsBoard`.
- **Tests** — none asserts it by id (`openings-arrows`).
- **Styling** — `Switch size="small"`, `FormControlLabel m: 0 px: 1` — identical to the Library game's Moves tab.
- **Similar elsewhere** — the Library game's (identical), Play with Engine's (Engine tab), the Analysis Board's (its own tab).
- **Verdict** — module-specific but needs design consistency — one setting, three homes across the boards.

### OpeningBookList

- **Name and location** — `OpeningBookList`, `src/views/openings/OpeningBookList.tsx`
- **Family** — list
- **MUI atoms** — Box, Typography, List, ListItemButton, ListItemText, Chip
- **What it does** — The Book tab: every move eco.json names from the position on screen, with the opening it leads to and its ECO code; a click plays it, the pointer tells the screen which row it is over (its arrow recolours). An empty line when the book knows no continuation.
- **API** — `moves: KnownMoveOpening[]`, `onPlay(san)`, `onHover(move | null)`.
- **Used by** — `OpeningsBoard` (Book tab).
- **Tests** — `openings/OpeningsBoard.test.tsx` (`openings-book`, `openings-book-move-*`), `board/boards.test.tsx`; the empty line is not asserted.
- **Styling** — `grid gap: 0.5`; a `caption text.secondary px: 1` help line; `List dense disablePadding`, rows `borderRadius: 0.5`; SAN as the primary and the opening's name as the secondary text, each in a `span dir="ltr"`; the ECO `Chip size="small" dir="ltr"`.
- **Similar elsewhere** — the Library filter board's continuation list (SAN tokens, counts, a result bar) and `NextMovesBar` (SAN tokens, two per row) — [list](./Shared.md#list). The ECO chip here is not a link; `CurrentOpening`'s is.
- **Verdict** — module-specific but needs design consistency — the three continuation lists should share a row design (SAN token, secondary facts, an optional bar).

---

## Left out, and why

| What | Why |
| --- | --- |
| `openings/Main.tsx` | Layout-only wrapper. |
| `openingArrows.ts` | Pure — joins the arrows drawn on the board (out of scope). |
| The Map tab, the square | The explorer's drawing and the board — out of scope. |
| The footer (`explorer.annotations`, `EngineThinking`, `explorer.nextMoves`) | Borrowed — see the table above. |

---

## Consistency notes

- **toolbar / action bar** — the header follows the board-header pattern
  (opening first, small icon buttons, the engine switch last) but is the only
  one without Save, back or settings, and its Analysis hand-off is an icon
  where the Library game's and Play with Engine's are labelled buttons.
- **form / settings group** — the Moves-tab arrows switch is the Library
  game's, byte for byte; the Analysis Board and Play with Engine put the same
  setting in other tabs.
- **list** — the Book tab is the one continuation list built on MUI `List`;
  the Library's is a CSS grid of `ButtonBase` tokens, `NextMovesBar` another
  grid. Its ECO chip is not clickable, unlike `CurrentOpening`'s a few pixels
  above it.
- **tabs** — `BoardPanel`'s strip, as on every board: Book · Moves · Map ·
  Load · Export · Engine.
