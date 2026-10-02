# The front page

What `/` shows (CTA-126) is an **MDX document** — Markdown with the app's
components in it — compiled to a React component **at build time** by
`@mdx-js/rollup` (`vite.config.ts`). Customising the page is editing a file
here and rebuilding; nothing is fetched or compiled in the browser.

| File | What it is |
| --- | --- |
| `front-page.en.mdx` | the page in English |
| `front-page.he.mdx` | the page in Hebrew — keep it in step with the English |
| `index.ts` | the documents by language (`Record<AppLanguage, …>`: a language without a document is a compile error) |

## Writing the document

- **Markdown** is rendered in the theme's typography (`../frontPage/Prose.tsx`):
  `#` is the page's one `h1` — keep exactly one; `##` / `###` are its
  sections; a link to a path of the app (`[the Library](/library)`) is a
  router link. A comment is `{/* … */}` (HTML comments are not MDX).
- **The app's components** are available by name, with no `import`
  (`../frontPage/index.ts` maps them). An **address** is the one the screen
  shows in the address bar — copy it from there; the leading slash is
  optional.

| Component | Props | What it shows |
| --- | --- | --- |
| `<BoardRow>` | `columns?` (default: how many children) | the embeds inside it side by side, from the `sm` breakpoint up; one column below it |
| `<CollectionGameBoard />` | `game="/library/<collection>/<n>"`, `startMove?` | a Library game on a board the reader steps through, with a link to the Analysis Board |
| `<RepertoireBoard />` | `_id="/repertoires/<id>"`, `startMove?`, `fallback?: "e4-white" \| "caro-kann-black"` | a repertoire on a board facing its side, each branch's arrows as wide as the trainer's play chances, with a link to it |
| `<CollectionCard />` | `_id="/library/<collection>"`, `showGame?` (default 1), `startMove?`, `rows?` (default 8) | a collection across its row: its name and size, a board on game `showGame`, and a short table of its games — the page holding that game, with earlier / later — a row's click putting it on the board |
| `<InlinePgnGame />` | `pgn={…}`, `from?`, `to?`, `start?` (move numbers; `start` also a SAN line, into a side line), `fromPly?` / `toPly?` / `startPly?` (plies, which win), `variations?` (default on), `comments?`, `orientation?`, `caption?`, `game?` (which game of a PGN holding several, 1-based), `shapes?` (the comments' `[%cal]` arrows and `[%csl]` circles, default on) | an excerpt of a PGN — a window of its moves beside a board, side lines nested — one game as many times as a page likes, each board its own id; the Blog's *Games in an article* folder shows every prop |
| `<StoredGameEmbed />` | `reference="…"`, `startMove?` | any stored game by its `?game=` reference (`library/<c>/<n>`, `analysis/saved/<id>`, `play/games/<id>`) |
| `<NavCards />` | `headingLevel?: 2 \| 3` (default `2`) | every screen as a card, by section — built from `navTree()`, so a screen added to `navItems` appears with no edit here. Alone, it is the landing page as it was before CTA-126 |

**`startMove`** is where a board opens: a move number walks the mainline —
`"17"` (or `"17."`) is the position after White's 17th move, `"17..."` (or
`"...17"`) after Black's, `"0"` the start — or a line of SAN, numbered or
not (`"1. e4 c5 2. Nf3"`, `"e4 c5 Nf3"`), which may go into a side line.
Absent, the start. "Back to the start" on the board is the game's start.

**Whose data it is.** A shipped Library collection (`src/data/library/`) is
on every reader's device; an uploaded collection, a repertoire, a saved
analysis or a played game is on the device it was made on only. So an embed
of one of those shows "not here" to everyone else — except a
`<RepertoireBoard>` with a `fallback`, which shows that shipped sample
instead, marked as a sample. **The page's two repertoire addresses are
placeholders** (`REPLACE-WITH-A-REPERTOIRE-ID`): swap them in both documents.

**What it costs.** A Library embed reads its collection's PGN (and a card its
index too) — the Library's own lazy chunks, fetched once: the page as
shipped reads Fischer's and Capablanca's (~1.8 MB before compression). Each
board's id comes from what it shows, so embed each game, repertoire and
collection once on the page.

A name not in the map fails the page when it renders. A new component is a
line in `../frontPage/index.ts` and a row here.

- **Text in a component** (its buttons, captions, the samples' names) is the
  catalogs' (`home.*`, `demoBoard.*` in `src/locales/`), so it follows the
  language; the document's own prose is per document.

**The Blog** (`/blog`, `src/views/blog/`) renders its articles with the same
components, and its Components folder shows each of them on a page of its
own with its markup — the place to try a new view before it reaches this page.

Check a change with `npx vitest run src/views/home` (the page renders, one
`h1`, axe) and `yarn build`.
