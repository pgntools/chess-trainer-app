# What an MDX article can embed

Every page written in MDX (CTA-126) — the Blog's articles, and the one of them
the front page shows — is Markdown with the app's components in it, compiled
to a React component **at build time** by `@mdx-js/rollup` (`vite.config.ts`);
nothing is fetched or compiled in the browser.

| Where | What |
| --- | --- |
| `src/views/blog/articles/<path>.mdx` | an article — its frontmatter (`title`, `summary`, `order`, `date` …) then its document; `<path>.he.mdx` beside it when translated, its own title (a title alone shows over the English document) — `src/views/blog/articles/writing-an-article/guide.mdx` is the how-to |
| `src/views/blog/articles.ts` | the Blog's registry, built from the files' frontmatter (CTA-135, `plugins/blogArticles.ts`): the titles, the folders, the order |
| `src/views/home/frontPageArticle.ts` | **which article the front page shows** — one line |
| this folder | the components below, and `index.ts`, the map that gives them their names |

## Writing the document

- **Markdown** is rendered in the theme's typography (`Prose.tsx`): the page
  draws the article's title as its one `h1`, so the document starts at `##`;
  a link to a path of the app (`[the Library](/library)`) is a router link;
  a fenced block is code, pinned left to right. A comment is `{/* … */}`
  (HTML comments are not MDX).
- **The app's components** are available by name, with no `import`
  (`index.ts` maps them). An **address** is the one the screen shows in the
  address bar — copy it from there; the leading slash is optional.
- **One component, any source** (CTA-140): every table, `<InlinePgnGame>` and `<InlinePgnGameColumns>`
  read their games from `pgn={games}` — a PGN of the article's own — or
  from `src="<address>"`: a Library collection (`/library/<c>`) or one game
  of it (`/library/<c>/<n>`), a saved analysis
  (`/tools/analysis?analysis=<id>`), a played game (`/engine/play?saved=<id>`),
  a repertoire (`/repertoires/<id>`) — pasted as the address bar shows it,
  host and all. A Library source's names and results link into the Library
  (`playerLink`, `gameLink`, `teamLink`, on by default). **Only shipped
  data is everyone's**: a reader's analyses, played games, repertoires and
  uploaded collections are in their own browser, so an article naming one
  shows "not in this browser" to every other reader and on the published
  site. The `Collection…` components below are the older names of these,
  kept for the articles written with them (`MDX_ALIASES`).

| Component | Props | What it shows |
| --- | --- | --- |
| `<BoardRow>` | `columns?` (default: how many children) | the embeds inside it side by side, from the `sm` breakpoint up; one column below it |
| `<CollectionGameBoard />` | `game="/library/<collection>/<n>"`, `startMove?` | *an alias of `<StoredGameEmbed src>`* — a Library game on a board the reader steps through, with a link to the Analysis Board |
| `<RepertoireBoard />` | `_id="/repertoires/<id>"`, `startMove?`, `fallback?: "e4-white" \| "caro-kann-black"` | a repertoire on a board facing its side, each branch's arrows as wide as the trainer's play chances, with a link to it |
| `<CollectionCard />` | `_id="/library/<collection>"`, `showGame?` (default 1), `startMove?`, `rows?` (default 8) | a collection across its row: its name and size, a board on game `showGame`, and a short table of its games — the page holding that game, with earlier / later — a row's click putting it on the board |
| `<InlinePgnGame />` | `pgn={…}` or `src="<address>"` (a game, a collection with `game`, an analysis, a played game, a repertoire's tree), `from?`, `to?`, `start?` (move numbers; `start` also a SAN line, into a side line), `fromPly?` / `toPly?` / `startPly?` (plies, which win), `variations?` (default on), `comments?`, `orientation?`, `caption?`, `game?` (which game of a PGN holding several, 1-based), `shapes?` (the comments' `[%cal]` arrows and `[%csl]` circles, default on) | an excerpt of a PGN — a window of its moves beside a board, side lines nested — one game as many times as a page likes, each board its own id; the Blog's *Games in an article* folder shows every prop |
| `<InlinePgnGameColumns />` | the same props as `<InlinePgnGame>` | `<InlinePgnGame>` with its moves laid out as the Analysis Board's move list is (CTA-146): numbered pairs, number \| White \| Black, each side line a row under the pair it answers; the list stands no taller than the board and scrolls when the tree is longer, keeping the move on screen in view. A window opening on Black's move starts with an empty White cell. `<InlinePgnGame>` itself is unchanged; the Blog's *Games in an article* folder shows both |
| `<StoredGameEmbed />` | `src="<address>"` (a Library game, an analysis, a played game) or `reference="…"`, `startMove?` | any stored game by its `?game=` reference (`library/<c>/<n>`, `analysis/saved/<id>`, `play/games/<id>`) |
| `<SwissStandingsTable />` | `pgn={…}` or `src="/library/<c>"` (+ `playerLink?`, `gameLink?`) (the tournament's games, usually `import games from "./event.pgn?raw"`), `density?: "normal" \| "dense"` | a Swiss's standings (`src/blocks/tables/SwissStandingsTable`): a row per player ranked by points, Buchholz, then Sonneborn-Berger, a cell per round — read from the games' tags alone, named after their `Event`; a file of the top boards only is the standings of those games. The Blog's *Tournaments* folder shows it |
| `<RoundRobinCrossTable />` | `pgn={…}` or `src="/library/<c>"` (+ `playerLink?`, `gameLink?`), `density?` | a round robin's crosstable (`src/blocks/tables/RoundRobinCrossTable`): a row and a column per player ranked by points, then Sonneborn-Berger, each meeting's games in its cell — two in a double round robin. The Blog's *Tournaments* folder shows it, single and double |
| `<KnockoutBracket />` | `pgn={…}` (or `load`) or `src="/library/<c>"` (+ `playerLink?`, `gameLink?`), `losersFromRound?` (where a double elimination's losers' bracket starts — TWIC's `51`), `density?` | a knockout's bracket (`src/blocks/tables/KnockoutBracket`): a column per round, a box per match — `Round "R.G"` is round R, game G of its match, tiebreaks counted — the side that went through marked; a file whose games all name their teams is a team knockout, scored in legs with the board points beside them. The Blog's *Demo tables* folder shows a knockout, a double elimination and a team knockout |
| `<MatchTable />` | `pgn={…}` or `src="/library/<c>"` (+ `playerLink?`, `gameLink?`), `density?` | a match between two players (`src/blocks/tables/MatchTable`): two rows, a column per game, the score — every game a point, as its `Result` says; a PGN of more than two players says it is not a match |
| `<TeamStandingsTable />` | `src="/library/<c>"` (+ `teamLink?`, `gameLink?`), `pgn={…}` or `load={() => import("./big.pgn?raw")}`, `density?`, `rowsPerPage?` | a team tournament's standings (`src/blocks/tables/TeamStandingsTable`): its games name their teams (`WhiteTeam`, `BlackTeam`); a row per team, its flag where its players share a federation (an Olympiad's), each round's cell its board points in that match, ranked by match points (2 a win, 1 a draw), then board points |
| `<CollectionTournamentTable />` | `_id="/library/<collection>"`, `format?: "swiss" \| "roundRobin" \| "match"`, `playerLink?` / `gameLink?` (default on; `={false}` for text), `density?`, `rowsPerPage?` | *an alias of the table with `src`* — a **Library collection's** tournament table (CTA-128): read from its games' tags; each name a link to the collection filtered by that player, each result a link to its game on the Library's board (whose back returns to the article). The format: `format`, else the collection's tournament mark, else a Swiss. An upload shows on its own device only — *Writing an article → Demo tables → From a Library collection* uses the shipped Candidates 2026 |
| `<CollectionKnockoutBracket />` | `_id="/library/<collection>"`, `losersFromRound?`, `playerLink?` / `gameLink?` (default on), `density?` | *an alias of the table with `src`* — a **Library collection's** knockout bracket (CTA-128) — a team knockout too: each name a link to the collection filtered by that player (a team's, by all its players), each match's games under it as links to the Library's board (a team match's legs, each to its first board). *Demo tables → A knockout from the Library* uses the shipped Netherlands Championship and World Blitz Team 2026 |
| `<CollectionDoubleEliminationBracket />` | as above, `losersFromRound` `51` by default | the same for a double elimination: the winners' bracket over the losers'. *Demo tables → A double elimination from the Library* uses the shipped Esports World Cup play-in |
| `<CollectionTeamStandingsTable />` | `_id="/library/<collection>"`, `teamLink?` / `gameLink?` (default on), `density?`, `rowsPerPage?` | *an alias of the table with `src`* — a **Library collection's** team standings (CTA-128): each team a link to the collection filtered by its players, each round's match a link to its first board. *Demo tables → A team event from the Library* uses the shipped World Rapid Team 2026 |

**A large PGN** (CTA-128) — every tournament table takes `load={() => import("./event.pgn?raw")}` in place of `pgn={…}`: the file becomes a chunk of its own, fetched when the page opens, the table reading meanwhile. Use it for a file of a megabyte or more (the Olympiad article's 5 MB files). `rowsPerPage="25"` (or 50, 100, 250) pages any of the tables.
| `<NavCards />` | `headingLevel?: 2 \| 3` (default `2`) | every screen as a card, by section — built from `navTree()`, so a screen added to `navItems` appears with no edit here. Alone, it is the landing page as it was before CTA-126 |
| `<ArticleImage />` | `src={…}` (`import photo from "./photo.png"` beside the article), `alt?` (`""` decorative), `caption?`, `width?` (`"60%"` of the column), `maxHeight?` (`"50vh"` of the window), `align?: "start" \| "center" \| "end"`, `fit?: "contain" \| "cover"`, `rounded?`, `border?`, `shadow?`, `link?` (opens full size) | an image in an article, lazy, in a figure with its caption (CTA-137) — the MDX editor's Images section writes it and sets it |

**`showNextMoveArrow`** — every board above takes it: `showNextMoveArrow={false}` draws no arrows to the next moves over the board (the moves stay in its list, and an `<InlinePgnGame>`'s drawn `[%cal]` arrows still show). On by default.

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
instead, marked as a sample. **The front page's two repertoire addresses are
placeholders** (`REPLACE-WITH-A-REPERTOIRE-ID`, in `get-started.mdx`).

**The keyboard.** Every board on the page steps with ← / → (and Home / End from inside it): the keys drive the board the reader last clicked or tabbed into — ringed — or, before any is touched, the first in view (`views/shared/useBoardKeys.ts`). Nothing to write: every board does it.

**What it costs.** A Library embed reads its collection's PGN (and a card its
index too) — the Library's own lazy chunks, fetched once: the front page
as shipped reads Fischer's and Capablanca's (~1.8 MB before compression). Each
board's id comes from what it shows, so embed each game, repertoire and
collection once on the page.

A name not in the map fails the page when it renders. A new component is a
line in `index.ts` and a row here.

- **Text in a component** (its buttons, captions, the samples' names) is the
  catalogs' (`home.*`, `demoBoard.*`, `inlinePgn.*`, `tournament.*` in `src/locales/`), so it
  follows the language; an article's own prose is its document's (English,
  or a `.he.mdx` beside it).

The Blog's Components and *Games in an article* folders show each component on
a page of its own, with its markup; the *Tournaments* folder the tables, and its *Demo tables* folder one page per format.

Check a change with `npx vitest run src/views/home src/views/blog` (every
article renders, one `h1`, every PGN reads, axe) and `yarn build`.
