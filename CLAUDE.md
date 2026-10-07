# chessapp-analyze-v1

A Vite + React 19 + TypeScript chess trainer. Its board screens — Play with
Engine and Masked Pieces, the Analysis Board, the Openings explorer, the
repertoire player and the Library's game board — sit inside one app shell,
reached from a front page at `/` that is one of a Blog's MDX articles, and beside a Settings section whose
Export tab downloads the reader's data as one zip, whose Import tab puts such
a zip back, whose Storage tab shows how much space it all takes, and whose
Appearance tab picks the theme and whose Engine tab picks the engine. The boards are
`react-chessboard` v5 driven by `chess.js` and a Stockfish WASM worker, and
every one is composed from one **board core** (`src/views/board/core/`).

## Where the detail is

This file is what every session needs. The rest is in `.claude/rules/`:

| File | Loads | Covers |
| --- | --- | --- |
| [`chessboard.md`](.claude/rules/chessboard.md) | always | the board: library conventions, the engine protocol, layout rules, testing, **the board core** (base hook, modules, shell and panel, adding a board) |
| [`react-chessboard-options-api.md`](.claude/rules/react-chessboard-options-api.md), [`react-chessboard-types-and-helpers.md`](.claude/rules/react-chessboard-types-and-helpers.md) | always | the vendored `react-chessboard` reference |
| the module files (table below), [`tree-views.md`](.claude/rules/tree-views.md), [`pgn-annotations.md`](.claude/rules/pgn-annotations.md), [`database.md`](.claude/rules/database.md) | when you work on their `paths:` | each module's whole reference |
| [`browser-a11y.md`](.claude/rules/browser-a11y.md) | when you work on `e2e/`, `playwright.config.ts`, `eslint.config.js` or `ACCESSIBILITY.md` | the MUI lock and the browser accessibility pass (`yarn test:a11y`) |
| [`static-pages.md`](.claude/rules/static-pages.md) | when you work on the boot, the server entry, the pre-render, the head, the share images, the language in the URL or the deploy workflows | every page pre-rendered as a static `index.html` per language, its head and share image, `/he/` in the URL, the two hosts (CTA-136) |

The full upstream `react-chessboard` docs and all 53 Storybook examples are
vendored under [`docs/vendor/react-chessboard/`](docs/vendor/react-chessboard/).
**Never read `node_modules` source or web-search for a react-chessboard
question** — it is already on disk.

## Commands

Node comes from `fnm`, so run these from a shell where it is on `PATH`.

| Task | Command |
| --- | --- |
| Dev server | `yarn dev` (a worktree gets its own port — see `.jst/bootstrap.sh`) |
| Type-check + production build — **and the pre-render**: every page a static `index.html` per language (CTA-136, [`static-pages.md`](.claude/rules/static-pages.md)) | `yarn build` (`BASE_PATH=/ DEPLOY_TARGET=swa yarn build` — the chessapp.dev build) |
| Type-check only | `npx tsc -b` (add `--force` to bypass the incremental cache) |
| Lint — **a CI gate** (the tier import rules, the MUI lock, `jsx-a11y`) | `yarn lint` |
| **Run the test suite** — the pull-request gate, the `unit` and `ui` groups (below) | `yarn test:run` (at most 3 files at once — see below) |
| Run one test group | `yarn test:unit` (every `*.test.ts`), `yarn test:ui` (every `*.test.tsx`), `yarn test:gallery` (the gallery's axe matrix, `*.matrix.test.tsx` — ~35 min of tests, not in the gate) |
| **Run a single test file** | `npx vitest run <path>` — e.g. `npx vitest run src/theme/AppThemeWithLang.test.tsx` (any group's file) |
| Run tests matching a name | `npx vitest run -t "<substring of the test name>"` (every group — add `--project unit --project ui` to leave the gallery out) |
| Watch mode | `yarn test` (`unit` and `ui`) |
| Check that every test file is in exactly one group — **a CI gate** | `yarn test:groups` |
| Check the Blog as built — no draft in `dist/`, no article body in the entry chunk, each in its own (CTA-135) — **a CI gate**, after `yarn build` | `yarn check:blog-build` |
| Check the pages as built — every page in every language with its head and content, `404.html` the template, the `swa` sitemap — **a CI gate**, after `yarn build` | `yarn check:pages` |
| Redraw the section and site share images (`src/assets/share/`, committed) | `node scripts/share-images.mjs` (`--only <id>`) |
| **Wire a PGN collection into the Library** | `node scripts/wirepgn.js path/to/file.pgn` (or `yarn wirepgn …`; `--list`, `--check`, `--rebuild`, `--remove <id>` — [`game-collections.md`](.claude/rules/game-collections.md) §3) |
| **Scaffold a new theme** | `yarn theme:bootstrap --id <kebab-id> --name "<Name>"` (`--name-he`, `--from <theme>`, `--dry-run`, `--help`) — writes and registers it; then tune it in the dev-only theme editor, `/dev/theme-editor?theme=<id>` ([`CONTRIBUTING.md`](CONTRIBUTING.md#create-a-theme)) |
| **The MDX editor** (CTA-137) — Vite's dev server with the editor compiled in, and its storage service, which writes `.mdx`, `.pgn` and images (`.png`, `.jpg`, `.webp`, `.gif`) only under `src/views/blog/articles/` (on `127.0.0.1:5172`; `VITE_MDX_EDITOR_PORT`, read from `.env.local` too, moves it). Plain `yarn dev` has no editor: no route, no sidebar folder | `yarn mdx-editor:start` (instead of `yarn dev`; on `.env.local`'s `VITE_DEV_PORT`, Vite's flags passed on — `--port 5300`; Ctrl+C stops both) |
| Coverage (CI measures it on a push to `development` and nightly, not on a pull request) | `yarn test:run --coverage` |
| **Browser accessibility pass** — every shipped route, seeded, under every theme × light / dark × English / Hebrew, against the production build (Playwright + axe, colour contrast and target size on; ~25 min; `npx playwright install chromium` once) | `yarn test:a11y` (`yarn test:a11y:quick` — the pull-request matrix, ~6 min; details in [`browser-a11y.md`](.claude/rules/browser-a11y.md)) |
| **Browser pass in a cloud container** — its pre-installed Chromium (`/opt/pw-browsers/chromium`) is an older build than this Playwright wants, and the network will not fetch the new one ("Executable doesn't exist at …chromium_headless_shell-…"). Don't run `npx playwright install`; point the pass at the installed browser | `yarn build`, then `A11Y_CHROMIUM=/opt/pw-browsers/chromium A11Y_MATRIX=reduced npx playwright test` — `-g "<route id>\|seed"` for some routes (the seed is their setup); `A11Y_CHROMIUM` is read by `playwright.config.ts`, unset nothing changes |
| **Audit a render for accessibility** | `await expectNoAxeViolations(element?)` in a test (`src/test/axe.ts`) — axe's WCAG 2.2 A / AA rules, a violation fails it; `stubReducedMotion()` (`src/test/reducedMotion.ts`) renders for a reader who asks for reduced motion |

**Limit the workers to the machine.** At full parallelism the heavier screen
suites (the boards, the Library, the repertoires) starve each other of CPU:
the suite seems stuck, and tests fail on timeouts — a different set on every
run, each passing when re-run alone. That is scheduling, not a broken test. So
`test:run` and each group's script carry `--maxWorkers 3` — what CI's
four-core runners take; on another system, inspect a full run and set the cap
to suit it (`npx vitest run --maxWorkers <n>`; `--fileParallelism=false` runs
one file at a time). Re-run a failure on its own before treating it as real.

**The suite is three groups** (CTA-123) — Vitest projects in `vite.config.ts`,
set by file name, so a test joins one by what it is called:

| Group | Files | Runs |
| --- | --- | --- |
| `unit` | every `src/**/*.test.ts` — the pure logic and the stores; none renders | every pull request (`ci.yml`, one job) |
| `ui` | every `src/**/*.test.tsx` — components, blocks and screens on jsdom | every pull request (`ci.yml`, three jobs, `--shard`) |
| `gallery` | every `src/**/*.matrix.test.tsx` — the gallery's axe matrix, every base, pattern and block page under every theme × scheme × direction ([`src/test/galleryMatrix/`](src/test/galleryMatrix/slices.ts), cut into slice files so it runs in parallel) | nightly and on demand (`nightly.yml`, four jobs) — **not on a pull request** |

A test that renders is a `.tsx`; a `.test.ts` renders nothing. `yarn
test:groups` (CI's lint job) fails when a file under `src/` is in no group
or in two. The pull-request gate keeps the gallery's cheap checks — that its
matrix meets every theme, scheme and direction, over every page
(`gallery/everyTheme.test.tsx`, `views/dev/design/Main.test.tsx`); a change
to a gallery page or a theme should run `yarn test:gallery` (or the
`Nightly tests` workflow, by hand, on its branch) before it merges.

Tests are Vitest + Testing Library on jsdom. `src/test/setup.ts` stubs
`matchMedia` (MUI's colour-scheme provider reads it), gives jsdom an IndexedDB
(`fake-indexeddb`), lets a `findBy…` / `waitFor` wait 5 s rather than 1 (a
loaded machine, as the worker note above — CTA-124), and between tests
clears `localStorage`, lets every store's writes land, resets the stores and
deletes their databases
([`database.md`](.claude/rules/database.md) §7 — including why fake timers
must leave `setImmediate` real). Board screens stub `<Chessboard>` and the
engine with the shared harness, `src/views/board/boardTestHarness.tsx`
([`chessboard.md`](.claude/rules/chessboard.md) §8). **New tests find things by
role and name** (`getByRole(…, { name })`, `getByLabelText`) and drive the
keyboard with `userEvent`, so a test that passes is one a screen reader could
follow; `expectNoAxeViolations` audits a whole render
([`ACCESSIBILITY.md`](ACCESSIBILITY.md)).

`npx knip` reports unused code (`knip.json` names the browser pass's specs as entries). Expected in its output: the vendored stories,
the Stockfish worker, the stores' `settled…` / `delete…Db` helpers, which
only `src/test/setup.ts` uses (through namespace imports knip does not
follow), and the **public surface of the design system's tiers and of
`src/blocks/`** (each section's and family's `index.ts` exports and their
prop types) that no screen imports yet — they are built ahead of the
screens that migrate onto them. `scripts/wirepgn.js` imports `src/lib`
dynamically (and `scripts/theme-bootstrap.js` `src/design-system/themes/`),
so an export it uses can look unused — check `scripts/` before removing one.

## The modules

| Module | Routes | Code | Reference |
| --- | --- | --- | --- |
| **Play with Engine** and the **Lobby** | `/engine/play`, `/engine/games` | `views/engine/play/`, `views/engine/games/`, `lib/playedGame*`, `lib/engineSettings.ts`, `lib/newGameLink.ts` | [`play-with-engine.md`](.claude/rules/play-with-engine.md) |
| **Masked Pieces** | `/engine/masked` | `views/engine/masked/`, `lib/pieceMask.ts` | [`masked-pieces.md`](.claude/rules/masked-pieces.md) |
| **Analysis Board** and **Saved analyses** | `/tools/analysis`, `/tools/analysis/saved` | `views/tools/analysis/`, `lib/savedAnalys*`, `lib/analysesListContext.ts` (where the board was opened from — the list's tree beside it, Close back, CTA-145), `lib/gameReference.ts`, `lib/arrowSettings.ts`, `lib/nextMoveWeights.ts` | [`analysis-board.md`](.claude/rules/analysis-board.md) |
| **Openings explorer** | `/openings` | `views/openings/`, `lib/openings.ts`, `lib/analysisHandOff.ts` | [`openings-explorer.md`](.claude/rules/openings-explorer.md) |
| **Repertoires** | `/repertoires`, `/repertoires/<id>`, `/…/games/<game>` | `views/repertoires/`, `lib/savedRepertoire*`, `lib/repertoire*`, `lib/playChance.ts` | [`repertoires.md`](.claude/rules/repertoires.md) |
| **Library** (game collections; a collection marked as a tournament opens on Info, Participants and Games tabs, CTA-142) | `/library`, `/library/<c>` (`?tab=info\|participants\|games` for a tournament), `/library/<c>/settings`, `/library/<c>/<n>` | `views/library/` (`TournamentCollection.tsx` the tournament view), `lib/library*`, `lib/collectionIndex.ts`, `lib/tournamentParticipants.ts`, `src/data/library/` (`manifest.json` marks the shipped tournaments, `wirepgn --tournament`) | [`game-collections.md`](.claude/rules/game-collections.md) |
| **Blog** (MDX articles in nested folders — the *Writing an article* folder holds the how-to and a page per embeddable component, game window and tournament table, CTA-128) | `/blog`, `/blog/<folder…>`, `/blog/<folder>/<article>` — one route, `/blog/*` (CTA-135) | `views/blog/` (`articles.ts` the one registry, built from each file's **frontmatter** by the build's `plugins/blogArticles.ts` — `virtual:blog-articles`, `src/lib/articleFrontmatter.ts` the schema, CTA-135; `articles/<path>.mdx`, `<path>.he.mdx` optional, a folder's `index.mdx`); drafted live in the MDX editor, `/dev/mdx-editor/edit` — its lobby of the articles `/dev/mdx-editor` (`src/mdxEditor/`, under `yarn mdx-editor:start` only), whose lobby opens each article (`?article=<file>`), and its Components gallery `/dev/mdx-editor/components` (every embeddable component on a sample, to try and copy, CTA-140) | [`writing-an-article/guide.mdx`](src/views/blog/articles/writing-an-article/guide.mdx) |
| **Settings** (Export, Import, Storage, Appearance, Engine — which engine every board runs, CTA-153 — and Support, CTA-155) | `/settings/<tab>` (`/settings/export`, `/settings/import`, `/settings/storage`, `/settings/appearance`, `/settings/engine`, `/settings/support`) | `views/settings/`, `lib/engineChoice.ts` (the preference, `localStorage`), `views/shared/useEngineChoice.ts`, `blocks/forms/EnginePicker` | [`settings.md`](.claude/rules/settings.md) |
| **Import / Export** (the reader's data as one zip) | `/settings/export`, `/settings/import` | `lib/dataExport*.ts`, `lib/dataImport*.ts`, `lib/pgnExport.ts`, `views/settings/ExportTab.tsx`, `ImportTab.tsx`, `blocks/dialogs/ImportDialog`, `IncompatibleImportDialog`, `blocks/panels/ImportReport`, `blocks/forms/ExportCategoriesForm` | [`import-export.md`](.claude/rules/import-export.md) |
| **Position editor** (a component, hosted by the Lobby) | — | `views/shared/positionEditor/`, `lib/positionEditor.ts` | [`position-editor.md`](.claude/rules/position-editor.md) |
| **Tournament tables** (a Swiss's standings, a round robin's crosstable — built ahead of their screen, CTA-120, and drawn on the Library's tournament view's Info tab since CTA-142; a knockout's bracket — double elimination and teams too — a match, a team event's standings, CTA-128; embedded in the Blog's *Tournaments* articles, a page per format under *Writing an article → Demo tables*, and one per Library-backed table, over shipped TWIC collections — since CTA-140 the same components with `src="/library/<c>"`, the older `Collection…` names their aliases) | `/blog/tournaments/…`, `/blog/writing-an-article/demo-tables/<format>` | `lib/tournament.ts` (`tournamentOf`: players, rounds, standings and tie-breaks from the games' tags alone), `lib/knockout.ts`, `lib/match.ts`, `lib/teamTournament.ts` (the same, read as The Week in Chess writes each format), `lib/tournamentKind.ts` (`guessTournamentKind`: which kind a file looks like — the MDX editor's, the Library's settings', CTA-142), `lib/federations.ts` (a FIDE code as a flag), `design-system/components/tables/LabelChip`, `Flag` (a title's chip, a federation's flag), `design-system/patterns/tables/StandingsTable`, `CrossTable`, `Bracket` (every table pattern takes optional `paging`), `blocks/tables/SwissStandingsTable`, `RoundRobinCrossTable`, `KnockoutBracket`, `MatchTable`, `TeamStandingsTable`, and their MDX embeds in `views/home/frontPage/` (`…Embed.tsx`: `<EmbedSource>` over any source, `embedSource.tsx`, and the table's view, `tournamentEmbedViews.tsx`) | [`tournament-tables.md`](.claude/rules/tournament-tables.md) — the one reference: formats, TWIC's tags, ranking rules, embeds and props, adding a page or a format, testing |
| **Tree views** (how a board shows its game tree) | — | `views/explorer/`, `lib/treeMap.ts` | [`tree-views.md`](.claude/rules/tree-views.md) |
| **PGN annotations** (comments, `[%cmd]`s, the `prc` and `games` tags, NAG glyphs) | — | `lib/pgn.ts`, `lib/gameTree.ts`, `lib/moveAnnotations.ts`, `lib/playChance.ts`, `lib/gamesTag.ts` | [`pgn-annotations.md`](.claude/rules/pgn-annotations.md) |
| **The board core** | — | `views/board/core/` | [`chessboard.md`](.claude/rules/chessboard.md) §9 |
| **The design system** and **the component hierarchy** (themes; base components, patterns, blocks; the dev-only gallery and theme editor) | `/dev/design/…` (dev only; a page per component, the menu a tree of tier → section → component), `/dev/theme-editor` (dev only, CTA-115) | `src/design-system/`, `src/blocks/`, `theme/themeChoice.ts`, `views/dev/design/`, `views/dev/themeEditor/`, `scripts/theme-bootstrap.js` | [`docs/design/hierarchy.md`](docs/design/hierarchy.md), [`docs/design/README.md`](docs/design/README.md), [`design-system.md`](.claude/rules/design-system.md) |
| **Stores** (every one IndexedDB) | — | `lib/idb.ts`, `lib/idbRecordStore.ts`, `lib/*Store.ts`, `lib/*Db.ts` | [`database.md`](.claude/rules/database.md) |
| **Static pages** (CTA-136 — the front page, the Blog, every screen and the shipped collections pre-rendered per language; the head and share image; `/he/` in the URL; GitHub Pages and chessapp.dev, whose headers make the page cross-origin isolated for the multi-thread engine, CTA-154) | every route, `/he/…` too | `src/entry-server.tsx`, `scripts/prerender.mjs`, `scripts/check-dist-pages.js`, `views/main/documentHead.ts`, `lib/shareImage.ts`, `src/assets/share/`, `lib/languagePath.ts`, `views/main/unsavedWork.ts`, `scripts/crossOriginIsolation.mjs`, `.github/workflows/build*.yml` | [`static-pages.md`](.claude/rules/static-pages.md) |

## Layout of the source

| Path | What lives there |
| --- | --- |
| `src/main.tsx`, `src/App.tsx`, `src/routes.tsx` | The composition root (`AppThemeWithLang` → `CssBaseline` → `App`; imports `./i18n` for its side effect; **replaces** a pre-rendered page's markup, CTA-136), the router — its `basename` the base and the language's prefix, made anew on a change of language — and its route table, every route naming its screen in `handle.title` (a `pages.*` key, CTA-112; its description `pageDescriptions.*`). `src/entry-server.tsx` renders the same tree in Node for the pre-render. |
| `src/i18n.ts`, `src/locales/` | i18next setup (`supportedLanguages`, `rtlLanguages`, `asAppLanguage()`) and the inline `en` / `he` catalogs. `he` is typed `typeof en`, so a missing key is a compile error. **The language is the URL's** (CTA-136): `/he/…`, English unprefixed; a stored preference only routes an unprefixed arrival (`lib/languagePath.ts`). |
| `src/design-system/` | **The design system** (CTA-107), a layer of its own that knows no chess screen, store, route or block — `yarn lint` fails if it imports `src/views/`, `src/lib/` or `src/blocks/`. `themes/` (a theme is data; the registry; and the theme-authoring tools' one generator `codegen.ts`, contrast checks `contrast.ts` and scaffold `bootstrap.ts` — CTA-115), `theme/` (`buildTheme`, the `chess` tokens' readers, the RTL cache), `components/<section>/` (the **base** tier: one folder per MAIN section, each with an `index.ts` screens import from, each documented in `docs/design/sections/<section>.md` — CTA-108; it may not import a pattern), `patterns/<section>/` (the **patterns** tier: complex but generic — `DataTable`, `TreeView`, the competition tables `StandingsTable` and `CrossTable` (CTA-120) and a knockout's `Bracket` (CTA-128) — CTA-110, `docs/design/sections/patterns/`), `gallery/` (the dev-only `/dev/design/…`, a page per component). |
| `src/blocks/` | **The blocks** (CTA-110): complex, domain-aware, **presentational** components — rows, state and callbacks arrive as props — grouped by family (`families.ts`: `tables/`, `trees/` …), each a folder with its component, test, gallery, `fixtures.ts` (typed with `src/lib/`'s types, imported only by the gallery and the test) and `index.ts`. May use `src/lib/`'s types and pure helpers; `yarn lint` fails if one imports `src/views/`, a store or database module or `react-router`. Every module is on them (CTA-109, CTA-113): tables (`PlayedGamesTable`, `StorageTable`, `CollectionsTreeTable`, `CollectionGamesTable`, `SavedAnalysesTable` (CTA-144), and — ahead of their screen, CTA-120, CTA-128 — `SwissStandingsTable`, `RoundRobinCrossTable`, `KnockoutBracket`, `MatchTable`, `TeamStandingsTable`), lists (`SavedAnalysesList`, `RepertoiresList`, `FolderActions`, `FolderPicker`, `OpeningBookList`), trees (`FolderTree`), dialogs (the folder dialogs, `ImportDialog`, `IncompatibleImportDialog`, `CollectionImportDialog`, `OpeningTreePgnDialog`, `SaveAsCollectionDialog`), forms (`EngineSettingsForm`, `AnalysisEngineForm`, `ArrowSettingsFields`, `PgnInput`, `FenInput`, `PositionFields`, `MergeSplitChoice`, `MaskEditor`, `PlayedGamesFilters`, `CollectionFilters`, `ExportCategoriesForm`, `CollectionSettingsForm`) and panels (`PgnExportPanel`, `GameInfo`, `CurrentOpening`, `ChangesStrip`, `PlayToggleButton`, `EngineThinking`, `ImportReport`) — [`hierarchy.md`](docs/design/hierarchy.md#4-blocks--srcblocksfamilyblock). How a module migrates onto them: [`docs/design/migration.md`](docs/design/migration.md). |
| `src/theme/` | The app's wiring of the look: the `AppThemeWithLang` provider (theme choice, scheme, direction, and — since CTA-113 — the design system's one `SnackbarProvider`, so a screen shows a snackbar with `useSnackbar()`), `themeChoice.ts` (the reader's theme, in `localStorage`), `ForceLTR`, the header controls. |
| `src/views/main/` | The app shell: `Layout.tsx` (header, sidebar, the board square and the right-hand panel, `BOARD_PANEL_GAP_PX` between them — or, for a route whose `handle` is `FULL_WIDTH_ROUTE` from `routeHandle.ts`, the whole body instead, and for one whose `handle` is `ARTICLE_ROUTE` (the front page and every Blog route, CTA-130) the whole body with the content in one centred column of at most `ARTICLE_MAX_WIDTH_PX` — no square, no aside, no shell `ForceLTR`, so an embedded board pins itself; **under one breakpoint** (`md`, CTA-118) the sidebar is a `NavDrawer` opened from the header and the panel stacks under the square, so every route reflows at 320 px; and the page's structure, CTA-112: the skip link, the landmarks, the page title — a rendered `<title>`, with a route's `handle.meta` page first (CTA-135) — the one `h1`, the focus on a move to another screen), `pageTitle.ts` (`usePageTitle(recordName)`, `useOwnPageHeading()` — what a screen tells the shell), `rightPanel.tsx` (the route-fillable panel slot, and `HideRightPanel` — a screen spanning the aside's room, CTA-142; the slot's store `rightPanelSlot.ts`), `boardLeftPanel.tsx` (the board's own left column — the Analysis Board's workspace tree of the saved list, CTA-145 — a column or a rail, which takes the whole window while registered: no header, rail or footer; a drawer under the breakpoint, `shellCompact.ts`), `Sidebar.tsx` and the nav registries. |
| `src/views/home/` | **The front page** at `/` (CTA-126): **one Blog article**, the one `frontPageArticle.ts` names (today `get-started`, `src/views/blog/articles/get-started.mdx`) — its title the page's `h1`, its MDX document below it (`views/blog/ArticleBody.tsx`). Changing the page is that one line, or the article. `frontPage/` holds what every MDX article embeds by name (`frontPage/index.ts`, `mdxComponents`; the reference is [`frontPage/README.md`](src/views/home/frontPage/README.md)), each addressed by the app path its screen has: `<BoardRow>` (embeds side by side), `<CollectionGameBoard game="/library/<c>/<n>">`, `<RepertoireBoard _id="/repertoires/<id>">` (a shipped sample `fallback` where the reader has none — the front page's two ids are **placeholders**), `<CollectionCard _id="/library/<c>">` (a board and a short games table), `<StoredGameEmbed reference>`, `<InlinePgnGame pgn={…} from to start>` (a window of a PGN of the article's own, side lines nested, as many times as a page likes, its comments' lichess `[%cal]` arrows and `[%csl]` circles drawn in the theme's `chess.drawing` brushes — `views/shared/ExcerptBoard.tsx` over `lib/pgnExcerpt.ts` and `lib/boardShapes.ts`; `<InlinePgnGameColumns>` (CTA-146) is the same with its moves in numbered pairs — `ExcerptBoard`'s `movesLayout="columns"`, `excerptRows` — in a box no taller than the board, scrolling), `<SwissStandingsTable pgn={…}>`, `<RoundRobinCrossTable pgn={…}>`, `<KnockoutBracket pgn={…} losersFromRound>`, `<MatchTable pgn={…}>` and `<TeamStandingsTable pgn={…}>` (a tournament's table from a PGN of its games, CTA-128), — **one component, any source** (CTA-140): each table and `<InlinePgnGame>` (and `<StoredGameEmbed>`) take `src="<app path>"` in place of `pgn` — a Library collection `/library/<c>` or game `/library/<c>/<n>`, a saved analysis `/tools/analysis?analysis=<id>`, a played game `/engine/play?saved=<id>`, a repertoire `/repertoires/<id>`, pasted as the address bar shows it (`lib/embedSource.ts`; read by `frontPage/embedSource.tsx`'s `<EmbedSource>`, drawn by `tournamentEmbedViews.tsx`), a Library source's names and results linked into it (`playerLink`, `gameLink`, `teamLink`); the older `<CollectionTournamentTable _id>`, `<CollectionKnockoutBracket>`, `<CollectionDoubleEliminationBracket>`, `<CollectionTeamStandingsTable>` and `<CollectionGameBoard game>` are aliases of those (`MDX_ALIASES`), kept for the articles written with them — `<NavCards>` (a card per screen, from `navTree()`) and `<ArticleImage src={photo} alt width maxHeight align fit rounded border shadow link caption>` (an image beside the article, `import photo from "./photo.png"`, CTA-137); `startMove` opens a board at a move number or a SAN line, `showNextMoveArrow={false}` leaves the next-move arrows off, and ← / → step the board last touched (`views/shared/useBoardKeys.ts`). The board itself is `views/shared/DemoBoard.tsx` over `lib/demoTree.ts`. |
| `src/views/blog/` | **The Blog** (CTA-126): articles as MDX at fixed addresses `/blog/<path>`, in folders that nest. **An article is one file** (CTA-135): `articles/<path>.mdx`, its **frontmatter** (`title`, `summary`; `order`, `date`, `updated`, `tags`, `draft`, `description`, `image` / `imageAlt`, `redirectFrom`) then its document. The build's plugin (`plugins/blogArticles.ts`) reads and checks every file with `src/lib/articleFrontmatter.ts` — a bad one fails the build naming it — and answers `virtual:blog-articles`: the metadata eager, each body its own lazy chunk, **a draft absent from a production build** (listed, marked, in `yarn dev`; `yarn check:blog-build` greps `dist/` after CI's build). `articles.ts` builds the registry from it — the folders (a directory; its `index.mdx` names it, its body introduces it) and the articles, pinned (`order`) first, then newest first — read by the sidebar's Blog folder (`navFolders()` / `navItems()`, data-labelled), the index pages and each article's header (`ArticleHeader`: `h1`, *Draft* chip, dates) and breadcrumbs. A translation is `<path>.he.mdx` with its own title; frontmatter alone shows that title over the English body (pinned LTR, `lang="en"`), and an English title shown under Hebrew is marked `lang="en"` `dir="ltr"` (`theme/InLanguage.tsx`, `localizedTextOf`). **One route** serves it all, `/blog/*` (`BlogPage`: an article, a folder, a `redirectFrom`, else "no such article"), its handle `{ ...ARTICLE_ROUTE, title: "pages.blog", meta: blogPageMeta }` — `handle.meta(match, language)` names the page for the shell, which **renders** `<title>` and `<meta name="description">` (`routeHandle.ts`). The browser pass reads the articles from the files (`e2e/a11y/blogRoutes.ts`). Rendered by `ArticleBody` with the components of `views/home/frontPage/index.ts`; the document starts at `##`, the screen draws the title. The front page is one article (`views/home/frontPageArticle.ts`). |
| `src/views/board/` | **The board core** (`core/`: `useBoardCore`, the capability modules, `BoardShell`, `BoardPanel`), the test harness and the two propagation tests. |
| `src/views/explorer/` | **The tree views** — the variations explorer every board attaches. |
| `src/views/shared/` | **The board's pieces and hooks** (CTA-113 moved everything else out): `MoveList`, `VariationLine`, `BoardControls`, `BestVariations`, `NextMovesBar`, `EvalBar`, `PromotionPicker`, `EngineBoardSquare`, `CapturedPieces`, `PlayerPlate`, `DemoBoard` (the front page's mini-board, CTA-126), `positionEditor/`, `boardColors.ts` (the theme's squares as board options), and the hooks `useCurrentOpening`, `useOpeningBook`, `useStoreRead`. Generic UI parts are the design system's, and the chess-aware compositions (the folder dialogs, the saved lists, the Engine and Export tabs, `GameInfo`, `CurrentOpening`'s chip, the inputs) are blocks ([`hierarchy.md`](docs/design/hierarchy.md#where-srcviewsshared-fits)). Their locale keys are top-level (`moveList.*`, `variations.*`, `board.*`, …). |
| `src/views/engine/`, `tools/analysis/`, `openings/`, `repertoires/`, `library/`, `settings/` | The module screens (table above). Each route renders a layout-only `…Main.tsx` wrapper. |
| `src/views/dev/` | **The Development section** — dev-only, behind `routes.tsx`'s `devRoutes` (never in `dist/`): the gallery's route (`design/`) and the **theme editor** (`themeEditor/`, CTA-115 — every token of a theme edited against a live preview and contrast report, saved by download through `themes/codegen.ts`). The MDX editor's route and entry sit there too, but its code is its own folder (below). |
| `src/mdxEditor/` | **The MDX editor** (CTA-137), a folder of its own, in the build only under `yarn mdx-editor:start` (`enabled.ts`, `MDX_EDITOR_ENABLED` — `VITE_MDX_EDITOR=1` in dev, never in a production build): `client/` the lobby at `/dev/mdx-editor` (`ArticlesLobby`: the Blog's files on disk as a tree of folders, each row's Edit, page on the Blog and Delete, a warning where git has not got it; rows ticked to delete together — folders whole, articles with their translations — one confirmation naming every file, `DeletePicksDialog`, `deletionPlan.ts`, the service's `DELETE /files` taking `folders` too), and the editor at `/dev/mdx-editor/edit` — an article's MDX beside its live rendering with `mdxComponents`, compiled in the browser by `@mdx-js/mdx`, which only this chunk loads; the header's actions (PGNs, Components, Images — a section each, CTA-139 —, Save as…, Save, More — New article, Copy MDX, Download .mdx, Delete article…: `DeleteArticleDialog`, the service's `DELETE /files`, files only, all or none), a code / split / preview toggle, Content and Metadata; Save and Save as through the storage service (`SaveArticleDialog`, `storageClient.ts`); **the sections** (`SectionDialog`: one dialog each, the article's items of that kind listed — the one the caret is in chosen first — the chosen one's editor beside it, an Add entry last; any item edited in place, removed (asked first) or **shown in the content**, the caret put on it in the source; `contentElements.ts`): PGNs (`PgnsDialog`: the article's PGNs, read from the content — renamed with every `pgn={…}` reading them, an inline one's text edited up to 100 KB, a file's shown read only — and a new one as a file beside it or inline, `pgnImports.ts`, `pgnPages.ts`), Components (`ComponentsDialog`: the catalog's components in the content, each its settings form beside its code and preview; Add takes a PGN or a Library game or collection, then the components that fit it in folders, `componentCatalog.ts`, each with a settings form, `componentSettings.ts`, and a tournament's kind guessed, `lib/tournamentKind.ts`) and Images (`ImagesDialog`: the `<ArticleImage>`s, each its settings as a form beside its preview, removed with its import once nothing reads it; Add writes one beside the article as a PGN is, its alt text asked for and its look set, `import x from "./x.png"` and an `<ArticleImage>` at the caret); the **Components gallery** at `/dev/mdx-editor/components` (CTA-140, `ComponentGallery`): every component an article embeds, one entry each in a tree (Boards, Tournament tables, Images, Other, Future components — the mocks), the index data in `componentGallery.ts` (a new component is one entry; its test holds it to `mdxComponents`), each opened on a shipped sample that fits it — a Blog `.pgn` or a Library collection, `writing-an-article/sample-image.png` for `<ArticleImage>` — its source changed in an **Add / update PGN** dialog (`GallerySourceDialog`: a built-in example — the entry's own the default, the others `builtInsOf`'s, only what fits —, a PGN uploaded or pasted, or a Library address, `libraryLookup.ts`, shared with Add a component; a light PGN written into the code, a **heavy** one — more than 100 games or over 100 KB — first through `HeavyPgnDialog`: what it holds, `pgnStats.ts`, and the tournament it looks like, then **save to disk** (a `.pgn` the storage service writes into an existing Blog folder, never over another, imported), **save as a Library collection** (indexed and kept, then read by its address — by the Library's table for its games where the entry reads none, `libraryEntryFor`, the gallery switching to it) or **paste anyway**; `gallerySource.ts` their shared parts), a source that does not fit said so and refused; its settings form, its editable code to copy, its live preview; it edits no article; `server/` the launcher (`start.ts`) and the storage service (`storageServer.ts`, `node:http`, run by Node's type stripping). The rest of the app points in with its three routes, its own sidebar folder (Articles, Editor, Components gallery) and its locale keys — the Blog itself knows nothing of it (no edit icon, no git marks: the lobby has both). |
| `src/lib/` | Everything pure or storage: the game model and tree, PGN and FEN reading, the engine wrapper and score reading, the stores and records, the opening book. Named per module (table above); the shared core is below. |
| `e2e/a11y/`, `playwright.config.ts` | **The browser accessibility pass** (CTA-116): the seed (`seedZip.ts`, put in through Settings → Import), the routes, the theme × scheme × language matrix, the checks, the allowlist of known gaps and **the reflow gate** (320 px, CTA-118) — Playwright over `vite preview`, kept out of Vitest. |

The shared core of `src/lib/`: `gameModel.ts` (`Game`, one line), `gameTree.ts`
(`GameTree`, and every pure edit of one), `pgn.ts` (`parsePgnGames`,
`parsePgnTree(s)`), `fen.ts` (`parseFen`), `gameNavigation.ts` (`?move=`,
`StartPly`, the last-move highlight, the move rows), `engine.ts` (the
2019 build's engine, the default) + `uciEngine.ts` / `workerTransport.ts` /
`engineTypes.ts` / `engines/` (the UCI protocol, the Worker, `EngineHandle` and
the registry of builds — CTA-152, [`docs/engine.md`](docs/engine.md)) +
`engineAnalysis.ts` (the numbers), `capturedPieces.ts`,
`moveAnnotations.ts` / `pgnComments.ts`, `pgnText.ts`, `pgnExport.ts`,
`recordId.ts` (`newRecordId`, the one id minter), `treeManager.ts` (read-only
tree walks — the only place traversal is written) and `localizedText.ts`.

## Core principles

### One game model, and a tree over it

A game parsed from a PGN and a game played against the engine are the same
data: **`Game`** (`lib/gameModel.ts`) is one line of play, every move carrying
the FEN *after* it, so a viewer jumps to a ply by reading a string and nothing
re-simulates a game. **`GameTree`** (`lib/gameTree.ts`) is all the lines — what
every board holds — and a `Game` is a *walk over one*:

```
GameTree ──mainlineGame()──▶ Game ──▶ MoveList (the mainline's numbered cells)
   ▲
   └──treeFromGame()─────── Game
```

- **`children[0]` is the mainline at every level; everything after it is a
  side line.** `mainline`, `lineOf`, `treeToPgn` and the explorer are that one
  rule applied.
- **Replaying a move that is already there is not a new variation.** `addMove`
  returns the existing node and the *same tree by reference*, so nothing
  re-renders and "changed" stays `tree !== baseline`.
- **A node id is the navigation state, not a ply** — clicking inside a side
  line changes *which line is current*. `useTreeNavigation` holds the id and
  derives the ply; ← / → walk the line, Home / End its ends, ↑ / ↓ cycle the
  sibling moves.
- **Every edit is pure and id-preserving** (promote, delete from here, a
  comment, a play chance): a new tree, the path to the edit copied, a no-op
  the same tree back.
- **`chess.js` `loadPgn` discards `( … )` side lines**, so there are two
  parsers: `parsePgnGames` (mainline only) and `parsePgnTree(s)` (side lines,
  comments and NAGs kept — every board). Only the second round-trips with
  `treeToPgn`.
- **Node ids do not survive a PGN round trip**, so a place in a tree travels
  as SAN from the start (`sanPathTo` / `nodeAtSanPath`, the `?at=` links).

### The component hierarchy — where a new component goes

Five layers, each built only from the ones below
([`docs/design/hierarchy.md`](docs/design/hierarchy.md), CTA-110):

```
screens (src/views/)  →  blocks (src/blocks/)  →  patterns (design-system/patterns/)  →  base (design-system/components/)  →  MUI atoms
 read stores/routes      domain-aware,             complex, generic                        one MUI job, generic
                         presentational
```

- **Reads a store, a route or global state** → a screen (or its hook);
  split the presentational part out as a block.
- **Needs a domain type or a `src/lib/` helper** → a block. Used by one
  screen only? Still a block if it is complex.
- **Composes several base components, no domain** → a pattern.
- **Wraps one MUI job, no domain** → a base component.

Blocks are **presentational**: their rows, state and callbacks are props, a
link a `LinkTarget` — never a store, IndexedDB or the router — so each is
built and reviewed **in the gallery on fixtures first** (every state, every
theme, RTL), then wired into its screen. `yarn lint` enforces the import rules —
and, since CTA-116, **the MUI lock**: a screen or a block does not import the
MUI atoms the design system wraps (`Dialog`, `Table*`, `Tabs`, `Switch`,
`Snackbar`, `Alert`, `Tooltip`, `ToggleButton*`, `Breadcrumbs`, `Menu*`,
`Pagination`, `Slider`, `Autocomplete`); the error names the component to use,
and the five deliberate exceptions carry their reason on the line
([`browser-a11y.md`](.claude/rules/browser-a11y.md) §1). `yarn lint` is a CI
gate. Every tier's house rules are one conventions test (`src/test/tierConventions.ts`).

### The board is pure UI, composed from one core

`react-chessboard` draws and reports pointer events; `chess.js` owns every
rule, and only `useBoardCore` calls `.move()`. A board screen is **composed**,
never written from scratch: the base hook, the capability modules it opts
into (engine, Play, opening book, trainer, autosave), a tree view, and one
shell and panel with slots — no behaviour hook of its own, no layout
arithmetic of its own, no second panel ([`chessboard.md`](.claude/rules/chessboard.md) §9).
**A shared piece changes only backward compatibly**: under `views/shared/`,
`views/explorer/`, `views/board/core/` or `src/lib/`, a new behaviour is an
optional prop whose absence is today's behaviour.

### A position turns the board; a game does not

Every screen faces the side to move when a **position** arrives (a `?fen=`, a
pasted FEN, a handed-over position), because a position is something you are
about to answer. Loading a **game** does not: a PGN opens at ply 0, where the
side to move says nothing about which side is being studied. Nor do an
editor's "New board" / "Clear board" or a side-to-move field — arranging a
position is not being handed one.

### Handing things on: `?fen=`, `?game=`, location state

A **position** crosses screens as `?fen=` (`/engine/play`, `/tools/analysis`,
`/openings`); a **game** as `?game=<key>/<path>/<id>`, a reference into a store
that the Analysis Board resolves itself
([`analysis-board.md`](.claude/rules/analysis-board.md) §3.1); a **whole tree
in no store** (the Openings explorer's hand-off) as router location state. The
first two survive being bookmarked, shared and reloaded. Every destination
validates what arrives, ignores what does not pass, and takes it as *initial*
state rather than syncing it in an effect — arriving at a URL is what mounts
the screen.

### The reader's data is IndexedDB — only preferences are `localStorage`

Every store is IndexedDB, one database per module (`chessapp.engine`,
`chessapp.analyses`, `chessapp.repertoires`, `chessapp.library`), opened
through `lib/idb.ts`, most over the record-store factory
`lib/idbRecordStore.ts`. Reads are a kept snapshot, `undefined` until the
first read lands — a screen arriving by a URL naming a record waits for it.
Writes are promises and never throw. Only the colour mode, the theme choice
and the language live in `localStorage` ([`database.md`](.claude/rules/database.md) §2).
The one thing in `sessionStorage` is the in-development notice's dismissal
(CTA-155: `lib/developmentNotice.ts`, the shell's `views/main/DevelopmentNotice.tsx`
over the `DevelopmentNoticeDialog` block — logo, badge, an emoji list) — a modal on the first load of a
session, absent from the pre-render; a test starts with it dismissed
(`src/test/setup.ts`), and so does the browser pass (`e2e/a11y/checks.ts`).

### Accessibility: WCAG 2.2 AA, carried by the design system

The target is **WCAG 2.2 level AA** ([`ACCESSIBILITY.md`](ACCESSIBILITY.md):
what is covered, how it is checked, the known gaps — above all that the
boards are drag-only until the board accessibility Story). The **design
system carries it** (CTA-111, [`hierarchy.md`](docs/design/hierarchy.md#accessibility)),
so a screen built from it inherits it: every control's accessible name is a
required prop, states are announced (`status` / `alert` / `aria-busy`), the
keyboard operates everything with the theme's focus ring, targets are at least
24 px, the theme tokens are measured for contrast (`themes/contrast.test.ts`),
motion goes through the theme and stops under `prefers-reduced-motion` (the
boards' piece animation too, through `useBoardSquareOptions`), and every
gallery demo passes axe in every theme. `yarn lint` runs
`eslint-plugin-jsx-a11y`'s recommended rules. **The shell carries the page**
(CTA-112): every route's own title (its `handle.title`, the open record's
name first through `usePageTitle`), the landmarks and a skip link, one `h1`
(a screen's visible title declares itself with `useOwnPageHeading`), and the
focus on a move to another screen. **A real browser checks what jsdom cannot** (CTA-116, `yarn test:a11y`): every
shipped route, seeded, under every theme × scheme × language against the
production build, with axe's colour contrast and target size on — a violation
fails it, but for one allowlist of known gaps that fails when an entry stops
occurring; and **reflow at 320 px is a gate** (CTA-118). A new screen is a line in
`e2e/a11y/routes.ts`. What automation cannot hear, a person
checks with a screen reader per
[`docs/design/screen-reader-testing.md`](docs/design/screen-reader-testing.md),
with every module's migration.

### Theming, direction and language

`AppThemeWithLang` owns **the theme, the colour scheme and the text
direction**, because direction is *derived from the active i18n language*:
changing the language swaps the emotion cache, `theme.direction` and the MUI
locale bundle together. Splitting them across providers reintroduces the
mismatch this exists to prevent.

- **A theme is data** in the design system's registry
  (`src/design-system/themes/`, CTA-107 — `default`, `brown`, `green` and
  `high-contrast` since CTA-108, `console` — a Linux terminal — since
  CTA-115): its light and dark palettes,
  typography, shape, **component knobs** (values `buildTheme` turns into
  MUI overrides — CTA-115) and **`chess` tokens** — every colour drawn on or
  over a board. `buildTheme(theme, mode, direction)`
  (`src/design-system/theme/`) makes the MUI theme; `AppThemeWithLang` builds
  the reader's choice (Settings → Appearance, `theme/themeChoice.ts`, in
  `localStorage`). **Adding a theme** is a file beside `themes/default.ts`,
  an entry in `themes/registry.ts` and its `appearance.themes.<id>` name in
  both catalogs — no component changes. `yarn theme:bootstrap` does all
  three, and the theme editor (`/dev/theme-editor`) tunes the file and
  downloads it back, both through one generator (`themes/codegen.ts`) and
  one contrast module (`themes/contrast.ts`) — CTA-115,
  [`CONTRIBUTING.md`](CONTRIBUTING.md#create-a-theme),
  [`docs/design/README.md`](docs/design/README.md).
- **A board reads its colours from the theme**, never a literal:
  `useChessTokens()` / `chessTokensOf(theme)` (the default theme's under a
  bare test render), `useBoardSquareOptions()` for the squares. The
  `…_COLOR` constants that remain (`nextMoveArrows.ts`, `chanceArrows.ts`,
  `lib/openings.ts`, `LAST_MOVE_HIGHLIGHT`) are the **default theme's**
  values, kept for callers and tests.
- **Adding a language** is a catalog in `src/locales/`, an entry in
  `supportedLanguages`, and — if it mirrors — one in `rtlLanguages`; and its
  Open Graph locale in `OG_LOCALES` (`views/main/documentHead.ts`). Its URL
  prefix (`/<lang>/…`) and its pre-rendered pages follow (CTA-136).
- **The chessboard must never mirror.** Files run a–h left to right in every
  language; a mirrored board would put a1 bottom-right while `chess.js` and the
  engine still call it bottom-left. `Layout.tsx` wraps the board area in
  `ForceLTR`; a board elsewhere carries its own.
- **Pinning one *token* to LTR takes the `dir` attribute, not CSS.** Under
  Hebrew the RTL emotion cache's stylis plugin flips `direction: ltr` into
  `rtl` exactly as it flips paddings. SAN cells carry `dir="ltr"`;
  `unicode-bidi` is untouched by the plugin and can stay in `sx`.

### Sidebar navigation

The sidebar is a folder tree over the routes; a folder never appears in a URL.

| Layer | File | What it owns |
| --- | --- | --- |
| Walks | `src/lib/treeManager.ts` | Depth-first reads over any tree. |
| Data | `navFolders()` + `navItems()` | The folders (`{ id, labelKey?, label?, icon, children?, singleEntry?, pinToBottom? }`) and the screens, each naming its `folder`. **Functions**, so a dev-only entry can be a spread gated on `import.meta.env.DEV`. |
| Builder | `navTree.ts` | `buildNavTree`, `folderPath`, `folderChain`, `navLabel` (a catalog key *or* a data label, `lib/localizedText.ts`), `navLabelKeys`. |
| Renderer | `Sidebar.tsx` | A recursive `TreeRow`: folders are `aria-expanded` toggles, screens are links. |

- **Nesting a folder is a data edit** — an entry in `navFolders` with a
  `labelKey` in both catalogs; the renderer already recurses.
- **A `singleEntry` folder** renders as one row, under its own name, straight
  to its one screen (Analysis → Saved analyses, Openings, Repertoires). Board
  screens those hide are reached from the screens' own controls.
- **A `pinToBottom` folder** (Settings) renders at the sidebar's foot, under
  a divider, apart from the screens: the rows above scroll, the foot never
  does, and opening it grows the foot upwards so its screens stay in view.
  One `nav` landmark, one open chain across both.
- **One chain is open at a time, and the route decides which**, adjusted
  during render against the previous pathname (not in an effect, which
  `react-hooks/set-state-in-effect` rejects). Nothing is persisted.
- **The active state is an exact path match** (`"/"` prefixes everything).
- **The sidebar mirrors**: depth is `paddingInlineStart`, never `paddingLeft`,
  and never `ForceLTR`.

## Use the mui-mcp server to answer any MUI questions --

- 1. call the "useMuiDocs" tool to fetch the docs of the package relevant in the question
- 2. call the "fetchDocs" tool to fetch any additional docs if needed using ONLY the URLs present in the returned content.
- 3. repeat steps 1-2 until you have fetched all relevant docs for the given question
- 4. use the fetched content to answer the question


## claude-in-chrome instructions
- 1. Never take screenshots unless you have to. Check first if the analysis can be done with dom/javascript tools. If you have to take screenshot - ask user before.
