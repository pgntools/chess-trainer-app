# The screen-reader pass — the manual testing protocol

The automated checks ([`ACCESSIBILITY.md`](../../ACCESSIBILITY.md#what-is-covered-and-how-it-is-checked))
prove that every control has a name, every state an attribute, every page one
`main` and one `h1`. They cannot prove that a person listening to the page can
use it: that the names make sense read aloud and out of their visual context,
that the order is the order of the task, that an announcement comes when it
should and not twice. This pass is how that is checked (CTA-112). A person
runs it at a screen reader, screen by screen, and writes what they heard in
[`screen-reader-results.md`](./screen-reader-results.md).

**When.** Every module's migration onto the design system runs it over the
screens it migrated, after the browser pass
([`migration.md`](./migration.md) §5); so does a change to the app shell
(`views/main/`) or to a pattern's keyboard. A finding is fixed in that
change, or listed in `ACCESSIBILITY.md`'s known gaps with its plan.

**What it does not cover.** Playing on a board: the boards are drag-only,
their pieces unnamed, until the board accessibility Story. A pass notes what a
board says (its eval, its captured pieces) and moves on.

---

## 1. The readers

At least **Orca with Firefox on Linux** — the maintainer's machine — and, where
one is to hand, **NVDA** on Windows or **VoiceOver** on macOS: the three
readers people actually use on the three systems, each with the browser it is
best with. Record the versions in the results file.

| Reader | System | Browser | Get it | Turn it on / off |
| --- | --- | --- | --- | --- |
| **Orca** | Linux (GNOME) | Firefox | `sudo apt install orca` (Debian, Ubuntu); Settings → Accessibility → Screen Reader | Super + Alt + S |
| **NVDA** | Windows | Firefox or Chrome | [nvaccess.org](https://www.nvaccess.org/download/), free | Ctrl + Alt + N / NVDA + Q |
| **VoiceOver** | macOS | Safari | built in | Cmd + F5 |

Each has a **modifier** its commands use: Orca's is Insert (desktop layout) or
Caps Lock (laptop layout), NVDA's Insert or Caps Lock, VoiceOver's
**VO** = Control + Option. Each has a **learn mode** that names any key you
press without acting on it — Orca + H, NVDA + 1, VO + K — the quickest way to
confirm a key below on your version.

### 1.1 Setting up

- **Run the app**: `yarn dev` in the worktree (the port is `.jst/bootstrap.sh`'s,
  printed when it runs) or `yarn build && yarn preview` for the shipped build.
  Use a fresh browser profile, or clear the site's data first, so the stores
  are empty; then seed what a script asks for through the app itself.
- **Speech**: a voice for English **and one for Hebrew** — eSpeak NG has both
  (Orca's default through speech-dispatcher; NVDA ships it); on macOS add the
  Hebrew voice (Carmit) in System Settings → Accessibility → Spoken Content.
  Turn on the reader's **automatic language switching** (NVDA: Speech
  settings; Orca: Voice settings; VoiceOver follows the page's `lang`), so
  `<html lang="he">` is read in Hebrew.
- **Punctuation** at *some* (NVDA, Orca) — SAN's `+`, `#` and `x` should be
  heard; at *none* a check disappears from a move.
- **Safari**: Settings → Advanced → *Press Tab to highlight each item on a
  webpage*, or Tab skips links.
- **Firefox**: nothing to set.

### 1.2 The keys this protocol uses

Browse mode (the reader walks the page) is the default in a page; focus mode
(keys go to the control) comes on in a field, a tab strip, a tree or a table's
controls, and the reader says so. A table of the commands, by what they do:

| To | Orca | NVDA | VoiceOver |
| --- | --- | --- | --- |
| Hear the page title | Alt + Tab away and back (Orca reads the window title); Where Am I | NVDA + T | VO + F2 |
| Next / previous landmark | M / Shift + M | D / Shift + D | VO + U → Landmarks |
| Next / previous heading | H / Shift + H (1–6 by level) | H / Shift + H (1–6) | VO + Cmd + H / VO + U → Headings |
| A list of the headings, landmarks, links | (walk them with H / M) | NVDA + F7 | VO + U (the rotor) |
| Next table, then move by cell | T; Alt + Shift + arrows | T; Ctrl + Alt + arrows | VO + U → Tables; VO + arrows |
| Next form field / button / link | F / B / K | F / B / K | VO + Cmd + J (controls), Tab |
| Switch browse / focus mode | Orca + A | NVDA + Space | (VoiceOver has no modes; VO + Shift + ↓ to interact) |
| Read from here | Orca + ↓ (say all) | NVDA + ↓ | VO + A |
| Stop speech | Ctrl | Ctrl | Ctrl |

## 2. What to check on every screen

Arrive at the screen **the way a reader would**: from the sidebar or the
landing page with the keyboard, not by typing its URL (a URL is a first load,
which is announced differently — check that once too). Then walk it with the
keys above, and for each point below write *pass* or what was heard.

1. **The page title.** Arriving says it: the focus lands on the page's
   heading, which the reader reads — "Lobby, heading level 1". The title
   command gives "Lobby — chessapp.dev"; with a record open its name
   comes first ("Export — Settings — chessapp.dev").
2. **The skip link.** From the top of a freshly loaded page, the first Tab
   lands on "Skip to main content", shown on screen; Enter moves into the
   screen, and the next Tab reaches its first control — not the header.
3. **The landmarks**, in order: banner (the header), navigation "Main
   navigation" (the sidebar), main (named by the page — "Lobby"),
   complementary "Side panel" (the right-hand panel, where the screen has
   one), content info (the footer). One main; nothing outside a landmark but
   the skip link.
4. **The headings.** One level 1, the screen's name; below it a level 2 per
   section (the side panel's title, a table's section), never a level skipped.
   Nothing that is just bold text announced as a heading.
5. **Every control's name, role and state**: a button says what it does and
   to what ("Continue the game Human – Stockfish level 5 of 2026-09-20"),
   a toggle whether it is pressed, a checkbox whether it is checked (or
   *partially* — the select-all), a disabled control that it is unavailable,
   a slider its value, a field its label and — while wrong — its error.
   Icon-only buttons are named by their words, never "button".
6. **Tables**: entering one reads its name, its size and its **hint**
   ("Sort by a column from its header button. Tick a row's box to pick it.").
   Moving by cell reads each column's header. A sort button says its
   column and, once sorted, "sorted ascending / descending". A pick checkbox
   is named by its row. The pager's buttons and its "rows per page" are named.
7. **Tabs**: the strip is a tab list with its name, each tab says "tab, 2 of 4,
   selected"; entering the content below says "Moves, tab panel" — the panel
   named by its tab. Arrow keys move between the tabs.
8. **Trees** (the design gallery's menu, a folder tree): entering reads the
   tree's name and its **hint** ("Up and down arrows to move, right to open,
   left to close, Enter to go."); each row its level, and whether it is open.
   Under Hebrew, left opens and right closes.
9. **Dialogs**: opening one reads its title and moves the focus inside; Tab
   stays inside; Escape (or Cancel) closes it and the focus is back on the
   control that opened it.
10. **Live announcements**: an outcome is read once, when it happens, without
    moving the focus — "Downloaded chess-trainer-….zip", a snackbar; an
    error at once; a progress bar its name and value as it moves; "Reading
    your saved games…" while a store is read. Nothing is read twice.
11. **Hebrew**: switch the language (the header's language button). The words
    are read in Hebrew, and the page is right to left; **SAN, numbers, dates,
    Elo and FENs are read left to right** and as they are written ("e4",
    "Nf3", "2026-09-20"), not reversed or mispronounced as Hebrew words.
    Player and collection names in Latin letters are read in the Latin voice
    where the reader switches by script — note it where it does not.
12. **Reduced motion and zoom** are the browser pass's, not this one's.

## 3. The screens' scripts

What a reader should hear on each migrated screen. Each line is a step: the
key or the action, then **what should be announced**. Record a difference as
an issue, with what *was* heard.

### 3.1 The Lobby — `/engine/games`

Seed: play two moves on Play with Engine, then a masked game on Masked
Pieces, so the table has two rows.

1. From the sidebar (Engine → Lobby, Enter): **"Lobby, heading level 1"**.
   Title command: **"Lobby — chessapp.dev"**.
2. D / M through the landmarks: banner; navigation "Main navigation"; main
   "Lobby"; complementary "Side panel"; content info.
3. H through the headings: **"Lobby", level 1**; **"New game", level 2** (in
   the side panel). No other.
4. In main, Tab: the filters — **"Your side"**, its three toggle buttons
   (**"All", pressed**); **"Opening"**, a pop-up list; then **"Delete picked
   (0)"** (whether it is offered or unavailable at none — note which).
5. T: **"Your games", table**, its rows and columns counted, then the hint
   **"Sort by a column from its header button. Tick a row's box to pick it."**
6. Tab to the column headers: **"Select all the games the table shows,
   checkbox, not checked"**; **"White, button"** … **"Date, button, sorted
   descending"**. Enter on "White": the table re-sorts; the button says
   **sorted ascending**.
7. Into a row: **"Pick the game Human – Stockfish level 5 of …, checkbox"**;
   Space ticks it, and **"Delete picked (1)"** becomes available.
8. At the row's end: **"Analyse the game …, link"** and **"Continue the game …,
   link"** (none on a finished game). The masked row's Masked column says
   **"Masked"**.
9. Tab on to the pager: **"Rows per page, 50"**, the page buttons named.
10. **Delete picked (1)**, Enter: a dialog, **"Delete the picked game?"**, the
    focus inside; Escape: back on **"Delete picked (1)"**.
11. The side panel: the tab list **"New game"**, **"Game, tab, 1 of 2,
    selected"**; entering its content: **"Game, tab panel"**. Its fields:
    **"Play as"** (White / Black, pressed state), the engine's settings
    (sliders with their values — "Strength, Level 5 (≈1500 Elo)"),
    **"Variations, checkbox"**, **"Start, link"**.
12. → to **"Board editor, tab"**, Enter: **"Board editor, tab panel"**; the
    editor's own tabs and fields named. (Its board is a board: drag-only.)
13. Empty store (clear the site's data): **"No saved games yet. …"** in the
    table, read as one cell.

### 3.2 Play with Engine — `/engine/play`

From the Lobby's **Start**.

1. **"Play with Engine, heading level 1"**; title **"Play with Engine —
   chessapp.dev"**.
2. Landmarks: banner; navigation; main "Play with Engine" (the board);
   complementary "Side panel" (the panel); content info.
3. In main: the evaluation bar — **"Evaluation"** and its value; the
   captured strips — **"Captured by White"**, **"Captured by Black"**. The
   board itself: drag-only (a known gap — note, do not file).
4. The side panel's header: **"Back to the Lobby, link"**, the side toggle
   (**"White" / "Black", pressed**), **Play** (pressed or not), **"Replay —
   start over"**, **"Resign"**, **"Engine, switch, on"**.
5. The engine's lines (when on): each line's moves as buttons, **read left to
   right** ("e4 e5 Nf3"); the score (**"+0.3"**).
6. The tab list: **"Moves, tab, selected"**; its panel **"Moves, tab
   panel"**. The move list: each move a button, the current one marked
   current. → to **"Engine, tab"**: **"Engine, tab panel"**, the settings as
   in the Lobby.
7. The board controls: first / previous / next / last and flip, each named.
8. **Resign**, Enter: **"Resign this game?"** dialog; Escape returns the focus
   to Resign. Confirm: the footer says **"You resigned · 0-1"** (or 1-0),
   read as a status, and **"Open in analysis"** appears.
9. While the engine thinks, what is announced — note it (Play's spinner is a
   known gap: an unnamed progress bar).

### 3.3 Masked Pieces — `/engine/masked`

1. **"Masked Pieces, heading level 1"**; title **"Masked Pieces — Chess
   Trainer App"**.
2. As Play with Engine, plus the tab **"Masking"**: its panel **"Masking, tab
   panel"**; the presets (**"Masking policy"**, toggle buttons —
   **"Non-pawns as pawns", pressed**); each piece's select (**"Queen, Drawn as, Pawn"** — the
   row's colour said); **"Hide masked pieces in the notation, switch, on"**
   with its explanation; **"Show the engine's best lines, switch, off"**.
3. With notation hidden, a knight's move in the move list is read as
   coordinates (**"g1f3"**), never "Nf3".

### 3.4 Settings — `/settings/export`, `import`, `storage`, `appearance`

From the sidebar's Settings folder (pinned at its foot).

1. **Export**: **"Settings, heading level 1"**; title **"Export — Settings —
   chessapp.dev"**; main named **"Export — Settings"**. The tab list
   **"Settings"**: **"Export, tab, 1 of 4, selected"** — the tabs are links, so
   the reader may say "link" too; note which. Entering the content: **"Export,
   tab panel"**; the intro; the four categories as checkboxes (**"Collections,
   checkbox, checked"** …) and **"Include the 5 shipped collections"**;
   **"Export, button"**. Export: **"Exporting…"**, then **"Downloaded …zip."**,
   each read once as a status.
2. Tab to another tab and Enter (**Import**): the focus stays on the tab — no
   jump to the heading, this is the same screen; the title becomes **"Import —
   Settings — …"**. **"Choose a .zip, button"**. Choose an Export's zip: the
   dialog **"Import ….zip"** reads its title, the focus inside; each clashing
   folder's choice (**Merge / Override / Skip**) a radio group with its help;
   Import: the progress bar **"Import progress"** with its value; then the
   report, read as a status. A file that is not a zip: the dialog **"This file
   cannot be imported"** and its reason.
3. **Storage**: two headings level 2, **"Browser storage"** and **"Your
   data"**, each over a table of that name (no hint — nothing to sort);
   cells read with their column headers.
4. **Appearance**: **"Theme"**, a radio group, the current theme checked;
   choosing one says so and changes nothing else.

### 3.5 The gallery — `/dev/design` (dev server only)

Its patterns and blocks, each on its page, the way a screen would use them:

1. The menu: **"Components, tree"** and its hint; ↓ / ↑ / → / ← as §2.8;
   Enter opens a page — the focus stays in the menu (the same screen).
2. **DataTable** and the blocks' tables (**PlayedGamesTable**,
   **StorageTable**): §2.6 on the demos.
3. **TreeView** and **FolderTree**: §2.8, in English and in Hebrew.
4. **PanelTabs**' *Each tab naming its panel* demo: §2.7.
5. The dialogs (**ImportDialog**, **IncompatibleImportDialog**,
   `DeleteManyDialog`): §2.9.

### 3.6 Home — `/` (CTA-113)

1. **"Get started, heading level 1"**; title **"Home — chessapp.dev"**.
2. H: a **level 2** heading per section (Engine, Analysis Board, Openings,
   Repertoires, Library, Settings …), in the sidebar's order.
3. Tab through the cards: each **a link named by its screen** ("Lobby,
   link", "Analysis Board, link" — which goes to the saved list), in reading
   order; the icon is not read.
4. Header: **"Toggle light and dark mode, button"**; Space switches the
   scheme, the focus stays on it. The language select names itself.

### 3.7 Saved analyses — `/tools/analysis/saved` (CTA-113)

Seed: save two analyses, one in a folder.

1. **"Saved analyses, heading level 1"**; the count read under it.
2. Tab: the header's actions (**"New"** …); the select-all **"Select all …,
   checkbox"**; the view switch — **"List, toggle button, pressed"**, its
   neighbours by the arrow keys ("Compact cards", "Cards").
3. A folder row: **"Open ‹folder›, button"**, then its actions, each named
   by the folder ("Rename ‹folder›" …).
4. A record row: **"Select ‹name›, checkbox"**, **"Open ‹name›, link"**,
   **"Settings of ‹name›, link"**. Tick two: the chip **"2 selected"**, its
   Delete clears them ("Clear the selection").
5. Delete the picks: **"Delete 2 analyses?"** dialog; the red confirm is
   the last stop; Escape returns the focus.
6. Inside a folder: the breadcrumb **"Saved analyses, link"**, then the
   folder's name as the current page.
7. With more than 25: the pager **"Analyses per page, 50"**, its buttons named.
8. The side panel: **"New analysis"**, level 2; the position editor's fields,
   the FEN and PGN boxes named, **Start**.

### 3.8 The Analysis Board — `/tools/analysis` (CTA-113)

1. **"Analysis Board, heading level 1"** (out of sight; the shell's).
2. The panel: **"Board panel, tab list"**; each tab named, the selected one
   said; its panel **"‹tab›, tab panel"**.
3. H: the engine's lines and the open tab each a **level 2** heading
   (visually hidden).
4. Header: **"Save, button"** (with changes over a saved record, **pressed**
   while the changes strip is open — never "pressed" on a new board, whose
   Save opens a dialog), **Play** (named, pressed or not), the saved list's
   link, **"Engine, switch, on"**.
5. While Play thinks: the spinner is named, and the thinking line is read
   once as a status.
6. The Load tab: **"Choose a .pgn file"**, the paste box named, **Load**;
   a text of several games opens **"… games"** dialog with Merge / Save as
   collection named; its progress named with a value.
7. The Engine tab: every slider named with its value; the Arrows tab: the
   switch and the width source radios named as a group.
8. The Export tab: **FEN**, **PGN** as copy fields, each **"Copy …"**
   button saying **"Copied"** after.
9. The move list: right-click (or the menu key) on a move opens a menu of
   named items; *Delete from here* asks in a dialog whose confirm is red.
10. `/tools/analysis/saved/<id>/settings`: the screen's title, **level 1**;
    a level 2 per section; the switches and side toggle named; Save.

### 3.9 Repertoires — `/repertoires`, `/repertoires/new`, `/repertoires/<id>` (CTA-113)

1. The list: **"Repertoires, heading level 1"**; as Saved analyses (§3.7),
   each row's controls named by the repertoire — **"Open Caro-Kann, link"**,
   **"Games of Caro-Kann, button, menu, collapsed"**; Enter opens a menu of
   two games, Escape closes it back onto the button.
2. `/repertoires/new`: **"Add a repertoire, heading level 1"**, the panel's
   level 2; the file button and paste box named; a text of several games
   offers **Merge** / **Split** as named choices.
3. The player: its title as the **level 1** heading; header — the back
   link (named by where it goes), **Save** (pressed while the strip is open),
   **Autoplay** (pressed state), the Games menu; the tabs as §3.8.
4. The Settings tab: **"Autoplay, switch"**, the side toggle **"White",
   "Black"** with its pressed state.
5. `/repertoires/<id>/settings`: level 1 over **"General", "Board", "Folder"**
   (level 2); the folder choice is **a list of buttons, the chosen one
   "current"**; Save from the keyboard.
6. A game (`/…/games/end`): the score read as a status after each verdict.

### 3.10 The Library — `/library` (CTA-113)

Seed: a folder "Openings" holding one upload.

1. **"Library, heading level 1"**; the count under it.
2. Tab: **"New folder"**, **"Add collection"**, the words box **"Filter by
   name"** (its clear button named once there are words).
3. T: **"Collections, table"**, then the hint **"Tab through each row's
   chevron, which opens or closes a folder, its link and its actions. Sort by
   a column from its header button."** The headers **"Name, button, sorted
   ascending"**, "Games", "Added".
4. A folder row: **"Open Openings, button, collapsed"**; Enter: **expanded**,
   its collections appear under it. Its actions, each named by the folder:
   "Add a collection here", "New sub-folder", "Download", "Rename", "Move
   to…", "Delete".
5. A collection row: its name **a link**; its actions "Download ‹name›",
   "Move ‹name› to…", "Delete ‹name›". Delete asks: **"Delete ‹name›?"**, a
   red confirm; Escape returns the focus.
6. Built-in: its chevron and its only action, Download; its collections
   download only.

### 3.11 A collection — `/library/<collection>` (CTA-113)

1. **"‹collection›, heading level 1"** (a Hebrew name read in Hebrew); the
   count (**"3 games"**, **"2 of 3 games"** under a filter).
2. Header: **"All collections, link"**; **"Add games"** (an upload's);
   the chip **"N selected"** once something is picked; **"Download selected
   as one PGN"**, **"Delete selected games from the collection"** (an
   upload's), **"Analyse"** — each unavailable at none.
3. **"Filter games"**, a search box.
4. T: **"Games, table"**, the hint **"Sort by a column from its header
   button. Tick a row's box to pick it."**; the header's **"Select all games
   shown by the filters, checkbox"**, then "#", "White", "Elo", … "Moves"
   as sort buttons, **"Date … sorted descending"** at the start.
5. A row: **"Select ‹White› – ‹Black›, checkbox"**; the White cell a link
   named **"‹White› – ‹Black›"**; SAN-free cells; the result and date read
   left to right. An unreadable game's `#` says **"This game could not be
   read …"**.
6. Analyse: a status snackbar **"N games added to Saved analyses, in
   “…”."** with an **"Open folder, link"**.
7. The side panel: **"Filters", level 2**; **"Player"** (a combo box whose
   names become chips), **"Played as"** (All / White / Black toggle buttons,
   unavailable until a player is chosen), **"Opening moves"** with reset /
   back / flip named, **"Save tree as PGN"**; then Opening, Event, From /
   To, Result — each named.
8. Save tree as PGN: a dialog, the radios **"No" / "Add tags"** grouped
   under **"The games' counts"**, the two boxes named with their help.

### 3.12 Adding a collection — `/library/new` (CTA-113)

1. **"Add a collection, heading level 1"**; the name, the folder list, the
   file button and the paste box named.
2. Paste three games, **Save**: **"Import options"** dialog — the file line,
   the summary, **"Minimum Elo" / "Maximum Elo"** sliders with values, the
   dates, **"Player"**; the count **"3 of 3 games will be imported"** read
   as a status as the filters change.
3. **Import**: the dialog becomes a progress dialog, its bar named by the
   title with a value, the caption **"Checking games… N of M"**; Cancel
   named (unavailable while writing).
4. An error: read as an alert inside the dialog.

### 3.13 A Library game — `/library/<collection>/<n>` (CTA-113)

1. **"Game n of m …"** in the header; the board's plates name each player.
2. Header: **"Back to ‹collection›, link"**, **"Previous game, link"**,
   **"Next game, link"** (unavailable at the ends), **Save** (pressed while
   the changes strip is open), Play, **"Engine, switch"**.
3. The Moves tab: **"Next-move arrows, switch"** above the move list.
4. An unreadable game: the words and **"Back to ‹collection›, link"**.

### 3.14 The Openings explorer — `/openings` (CTA-113)

1. **"Openings explorer, heading level 1"** (the shell's).
2. Header: the current opening and its ECO link; **"Open on the Analysis
   Board — …, button"**, **"Play from here, button"**, Play, **"Engine,
   switch"**.
3. The Book tab: the help line, then **"Book moves, list, N items"**; each
   row a button read **"e4 King's Pawn Game B00"** (SAN and code left to
   right under Hebrew). Tabbing onto a row redraws its arrow (a sighted
   check); Enter plays it and the list changes.
4. Out of the book: **"No known continuations from here."**

## 4. Recording

One row per screen × reader × browser × language in
[`screen-reader-results.md`](./screen-reader-results.md): **pass**, or the
issue — what was expected, what was heard, the step. Then, for each issue:
fix it in the change that found it (with a test that would have caught it,
where jsdom can), or list it in `ACCESSIBILITY.md`'s known gaps with its plan
and link the row to it.
