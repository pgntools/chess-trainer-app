# Proposal: static pages — indexable and shareable

Status: **implemented in CTA-136** — phases 0–5 (§13); 6 and 7 stay
optional. How it is built is [`.claude/rules/static-pages.md`](../.claude/rules/static-pages.md).
The spike's answers (phase 0): every page renders on the server —
`react-chessboard` and MUI included — once each `useSyncExternalStore` has a
server snapshot; React's `prerender` writes a lazy article in place given an
unbounded `progressiveChunkSize`; ~120 pages take ~15 s. Where the build
differs from the text below: the share images are copied and hashed by the
pre-render rather than pulled through `import.meta.glob` (§6.3 — the same
content-hashed URLs, with no image in the browser's bundle), and the shell's
hidden `h1` is dropped from a page that renders its own (an effect decides it
in the browser, which does not run on the server).
Depends on: [`frontmatter-feature-proposal.md`](frontmatter-feature-proposal.md)
— its manifest, its one Blog route and its `handle.meta` (§6.2 there).

## 1. Goal

1. **Search engines index the Blog**: every published article, folder page
   and the front page, in every language it is written in, with its own
   title and description.
2. **A shared link previews well**: pasted into Facebook, X, LinkedIn,
   Slack, WhatsApp or Telegram, an article shows its title, summary and an
   image.
3. **For people nothing changes**: the app is still the single-page app it
   is today — the same routes, boards, stores and settings — and the hosting
   stays static (no server).

4. **Every screen of the app has a real page too** (decided): `/openings`,
   `/tools/analysis`, `/library` … answer with status 200, their own title,
   description and share image, so a shared link to a screen previews as
   that screen and a search for "chess openings explorer" can land on it
   (§3.4).

**Non-goal.** The reader's **own data** is not made indexable: a saved
analysis, a repertoire, a played game or an imported collection lives in
the reader's IndexedDB, which no build and no crawler can see. Those
addresses keep working through the SPA fallback, as today.

## 2. How it works today

| What | Where | Consequence |
| --- | --- | --- |
| Rendered only in the browser | `src/main.tsx` — `createRoot(...).render(...)` | The HTML a crawler receives is `index.html`: an empty `<div id="root">`. |
| One `<title>` for every URL | `index.html` — `<title>Chess Trainer App</title>` | Every page, before JavaScript, is "Chess Trainer App". |
| Deep links answered with **status 404** | `.github/workflows/deploy-pages.yml` copies `dist/index.html` to `dist/404.html` | `/chess-trainer-app/blog/x` works for a person — the 404 page is the app — but GitHub Pages sends it with HTTP 404, and search engines drop a 404. |
| The page title set in effects | `usePageTitle` → `useLayoutEffect` (`src/views/main/pageTitle.ts`); `document.title` → `useEffect` (`src/views/main/Layout.tsx`) | Effects never run in a build-time render; the title would never reach static HTML. (Fixed by `handle.meta`, frontmatter proposal §6.2.) |
| `<html lang dir>` set in an effect | `src/theme/AppThemeWithLang.tsx` | Static HTML would always say `lang="en"`. |
| The language is a preference | `i18next-browser-languagedetector` (`src/i18n.ts`), kept in `localStorage` | A crawler never sees Hebrew: there is no URL that *is* the Hebrew page. |
| The theme is a preference | `src/theme/themeChoice.ts` (`localStorage`); the scheme through MUI's CSS variables, `data-mui-color-scheme` (`buildTheme.ts`) | A static render can only use the defaults. |
| Styles are emotion, two caches | `src/design-system/theme/rtlCache.ts` (`rtlCache`, `ltrCache`) | A static render must extract the styles it used, per direction. `@emotion/server` is not installed. |
| Hosted under a base path | `vite.config.ts` — `base: '/chess-trainer-app/'`; GitHub Pages | Absolute URLs (canonical, `og:url`, `og:image`) need the origin and the base. An untracked `docs/swa-setup.sh` suggests a move to Azure Static Web Apps on `chessapp.dev`. |

### What each crawler gets today

| Crawler | Runs JavaScript? | Gets |
| --- | --- | --- |
| Googlebot | Yes, deferred to a second rendering pass | A **404 status** — not indexed, whatever it renders. |
| Bingbot and others | Partly / no | A 404, and an empty page. |
| Social previews (Facebook, X, LinkedIn, Slack, WhatsApp, Telegram, Discord) | **No** | "Chess Trainer App", no description, no image — and some refuse a 404 outright. |

So **the gap is the HTML the server sends**. It has to carry the content,
the title, the description and the preview tags, with status 200 — before
any JavaScript runs.

## 3. The approach: pre-render at build time

After `vite build`, a step renders every Blog page to HTML and writes it
into `dist/`, where the static host serves it with status 200. The browser
then loads the same JavaScript as today and takes over (§7).

### 3.1 Which pages

From the frontmatter manifest — the same list the sidebar is built from,
drafts already excluded:

- the front page (`/`) — itself an article (`views/home/frontPageArticle.ts`);
- the Blog index (`/blog`) and every folder (`/blog/<folder>`);
- every published article (`/blog/<path>`);
- each of these **in every language it has a body in** (§5).

And the app's screens (§3.4). At 29 articles and ~20 screens today that
is about 55 pages per language; at hundreds of articles, hundreds — a
build-time cost of seconds, measured in the spike (§13).

### 3.2 How — two options

| | **A. A pre-render script (data mode stays)** | **B. React Router's framework mode** |
| --- | --- | --- |
| What | `vite build --ssr src/entry-server.tsx` builds a server bundle; `scripts/prerender.mjs` renders each path through `createStaticHandler` / `createStaticRouter` and React 19's `prerender` (`react-dom/static`), and writes the files | The router's Vite plugin, route modules, a `react-router.config.ts` with `prerender: () => paths` |
| `routes.tsx` | Unchanged | Rewritten into route modules (`meta`, `loader`, `default` per file) |
| `main.tsx`, `App.tsx` | An `entry-server.tsx` beside them | Replaced by the framework's entries |
| Head tags | From `handle.meta` (§4) | The framework's `meta` exports — the same idea |
| Cost | A script of ~150 lines and a second build | A migration of every route, the shell and the tests |
| Later SSR / a server | Possible, by hand | Built in |

**Recommended: A.** It changes nothing for the app's other screens, keeps
the route table as data, and is reversible. B is worth it only if a server
(SSR on request) is ever wanted; the static goal does not need one.

**React 19's `prerender`, not `renderToString`**: every article is a
`React.lazy` chunk (`views/blog/articles.ts`) and the boards sit under
`Suspense`. `renderToString` emits the fallback ("Loading…") for each;
`prerender` waits for them and emits the content.

The server bundle compiles `.mdx` (through `@mdx-js/rollup`), `?raw` PGN
imports and `import.meta.glob` exactly as the client build does — they are
Vite features, not browser ones.

### 3.3 Where the files go

**Decided: `x/index.html`.** `dist/` is served at the base path, so
`dist/blog/x/index.html` answers `/blog/x/` (`/chess-trainer-app/blog/x/`
on GitHub Pages), and `dist/he/blog/x/index.html` the Hebrew page. Both
hosts serve this layout the same way, and both redirect the slashless URL
to the slashed one — so **every canonical URL, `og:url`, `hreflang` link
and sitemap entry ends in `/`**, and the app's own links to Blog pages do
too (one redirect fewer). (The alternative, `x.html`, is served slashless
by GitHub Pages but needs a rewrite on Static Web Apps.)

Also:

- **`dist/index.html` is the front page now pre-rendered**, so the SPA
  fallback (`404.html`) must be copied from a **pristine** template saved
  before the pre-render, not from the pre-rendered front page.
- On Static Web Apps the `navigationFallback` must rewrite to that
  **pristine template** too (`/app-shell.html`, say), not to `index.html`.
- Only the reader's own records (§3.4) and unknown paths still go through
  the fallback: a real 404 is correct for a path that is no page.

### 3.4 The app's screens (decided)

Every route of `routes.tsx` that names no reader record is pre-rendered,
in every language — never the `devRoutes`, which do not reach `dist/`:

| Pre-rendered | Not pre-rendered — the fallback serves them |
| --- | --- |
| `/engine/play`, `/engine/games`, `/engine/masked`, `/tools/analysis`, `/tools/analysis/saved`, `/openings`, `/repertoires`, `/library`, `/settings/<tab>` | `/repertoires/<id>` and its games, a saved analysis by `?game=` — the reader's own |
| `/library/<c>` for the **shipped** collections (`src/data/library/`), known at build time | `/library/<c>` for a collection the reader imported; `/library/<c>/<n>`, a single game — **not pre-rendered** (decided): the shipped TWIC collections hold hundreds of games each, and a game page shows nothing a crawler can read but moves |

**What the page holds.** The shell — header, sidebar (a crawler follows its
links to every other screen), the page's `h1` — and the screen's first
render: a screen reading a store renders its loading state (its snapshot
is `undefined` until the first read lands, `database.md`), which is what
the reader's browser shows first anyway. The board square is the one doubt:
if `react-chessboard` will not render on the server (the spike, §13), the
square is wrapped in a client-only boundary and the static page shows the
panel without the board.

**Its head.** Each route's `handle.meta` (§4.1): the title from its
`pages.<id>` key, as today; a **description** from a new
`pageDescriptions.<id>` key in both catalogs — `he` is typed `typeof en`,
so a screen without its Hebrew description is a compile error; the share
image from §6's chain.

**A screen's URL with a query** (`/tools/analysis?fen=…`) is served the
screen's static page — the query is the browser's to read — so a shared
position previews as "Analysis Board" with the screen's image. A preview of
the position itself would need a server; out of scope.

## 4. The head of each page

### 4.1 One source: `handle.meta`

The frontmatter proposal gives every route an optional
`handle.meta(match) → PageMeta`, and the Blog's route supplies one from the
manifest. **The same function** feeds:

- the browser — the shell renders `<title>`, `<meta>` and `<link>` elements,
  which React 19 hoists into `<head>`, replacing today's effect;
- the pre-render — the script calls it per path and writes the tags into
  the page's `<head>` itself. (React 19 can also hoist into a document it
  renders whole; writing the head from the function directly does not
  depend on how a *fragment* render places them, and is checked by the
  build test, §12.)

### 4.2 The tags

```html
<html lang="he" dir="rtl">
<head>
  <title>כל המסכים ככרטיסים — בלוג — Chess Trainer App</title>
  <meta name="description" content="…summary or description…">
  <link rel="canonical" href="https://<origin>/<base>/he/blog/writing-an-article/components/nav-cards/">
  <link rel="alternate" hreflang="en" href="https://…/blog/writing-an-article/components/nav-cards/">
  <link rel="alternate" hreflang="he" href="https://…/he/blog/writing-an-article/components/nav-cards/">
  <link rel="alternate" hreflang="x-default" href="https://…/blog/writing-an-article/components/nav-cards/">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Chess Trainer App">
  <meta property="og:title" content="כל המסכים ככרטיסים">
  <meta property="og:description" content="…">
  <meta property="og:url" content="https://…/he/blog/…/nav-cards/">
  <meta property="og:image" content="https://…/blog-images/nav-cards.png">
  <meta property="og:image:alt" content="…">
  <meta property="og:locale" content="he_IL">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="article:published_time" content="2026-09-14">
  <meta property="article:modified_time" content="2026-10-01">
  <meta property="article:tag" content="components">

  <meta name="twitter:card" content="summary_large_image">
</head>
```

| Tag | From |
| --- | --- |
| `title` | frontmatter `title` (the page's language) + the screen's name + the app's |
| `description`, `og:description` | `description`, else `summary` |
| `canonical`, `og:url` | the page's own URL — absolute (§10) |
| `hreflang` alternates | the languages the article has a **body** in (§5.5) |
| `og:image` | `image`, else the folder's, else the site's default (§6) |
| `article:*` | `date`, `updated`, `tags` |
| `<html lang dir>` | the URL's language and `rtlLanguages` — written into the static HTML, not left to the effect in `AppThemeWithLang` |

A folder page is `og:type` `website`, the front page too.

## 5. Language in the URL

### 5.1 Why

A crawler has no `localStorage`. While the language is only a preference,
the Hebrew Blog has no address and cannot be indexed or shared — a link a
Hebrew reader copies opens in English for whoever receives it.

### 5.2 The scheme — a prefix on every route (decided)

| URL | Page |
| --- | --- |
| `/<route>` | English — the default, unprefixed, so today's links keep working |
| `/he/<route>` | Hebrew — **every** route: `/he/blog/<path>/`, `/he/library/<c>/<n>`, `/he/tools/analysis?fen=…` |
| `/`, `/he/` | the front page |

Adding a language adds its prefix — still no registry edit (frontmatter
proposal §5.3). Only the Blog and the front page are pre-rendered (§3.1);
the app's screens under `/he/` are served by the same fallback as today.

**The URL decides the language:**

- **The detector reads the path first**: a supported prefix sets the
  language; no prefix means English. The stored preference
  (`localStorage`) no longer decides what an address shows — a link a Hebrew
  reader shares opens in Hebrew for whoever receives it, and an English one
  in English.
- **The stored preference still routes a person**: arriving at an
  **unprefixed** URL with a stored non-English preference, the app
  replaces the URL with the prefixed one before it renders. A crawler has
  no preference, so it always gets the English page at the unprefixed URL
  (`x-default`).
- **An unsupported prefix** (`/fr/…` while French is not a language) is not
  a language: the path is an ordinary route, and an unknown one is "no such
  page".

### 5.3 The mechanism: the language in the router's `basename`

Every route under a prefix could be built two ways:

| | **A. The prefix is the router's `basename`** | **B. The prefix is a route segment** |
| --- | --- | --- |
| How | At boot, `App.tsx` reads the first path segment; `createBrowserRouter(routes, { basename: BASE_URL + "he/" })` for Hebrew, `BASE_URL` for English (it is `BASE_URL` today) | `routes.tsx` generated once per prefix (`/…` and `/he/…`), or nested under a `/:lang?` parent |
| The app's links | **Unchanged.** A `<Link to="/library">` resolves under the basename to `/he/library` — the 67 absolute paths in `src/` (links, `navigate`, the nav registries, blocks' `LinkTarget`s, the embeds' `/library/<c>/<n>` addresses) need no edit | Every one of the 67 needs the prefix — a `localizedPath()` everywhere, or a wrapping `Link` / `navigate` |
| Switching language | Changes the basename, which a router cannot do in place: the router is re-created (keyed on the language) at the new URL, so **the screen remounts** | A navigation within one router; whether the screen stays mounted across the prefix change must be verified |
| Risk | Unsaved in-memory work lost on a switch (below) | A link missed in review leaves the reader's language silently |

**Decided: A.** It touches the boot and the language switch, not the
67 call sites, and nothing can forget the prefix. Its one cost is the
remount, and it is bounded: the screens that hold unsaved work in memory
already know it — the Analysis Board, the Library's game board, the
repertoire player and the theme editor each compute "leaving now would
lose something" for their `beforeunload` guard. The language switch asks
the same question first and, where the answer is yes, confirms ("Switching
language reloads the screen — unsaved changes will be lost") before it
switches. Everything else is in IndexedDB or the URL and survives. (Lichess,
the app's UX reference, reloads the page on a language change.)

`LanguageSwitch.tsx` then does: store the preference, rewrite the current
URL's prefix (keeping its path, query and hash), and re-create the router
there — no full page reload needed.

### 5.4 What else the prefix touches

- **`AppThemeWithLang`** takes the language from the URL at boot (through
  the detector), so direction, the emotion cache and the MUI locale are
  right on the first render — no flash from English to Hebrew.
- **The SPA fallbacks** serve `/he/*` like any path: `404.html` on GitHub
  Pages; on Static Web Apps the `navigationFallback`, whose `/blog/*`
  exclusion (§10) gains `/he/blog/*`.
- **The browser pass** (`e2e/a11y/`) visits the Hebrew variants at their
  `/he/` URLs instead of setting the language through storage — closer to
  how a reader gets there, and a check that every route works under the
  prefix.
- **Copy-a-link features** (a `?game=` reference, a position's `?fen=`
  link) copy the current URL with its prefix — the recipient sees the
  sender's language. Intended.
- **`hreflang`** is written for every pre-rendered page — the Blog, the
  front page and the app's screens (§3.4); a screen is translated whole
  through the catalogs, so every one has every language.

### 5.5 A page with no body in its language

A Hebrew title over an English body (the frontmatter-only translation,
frontmatter proposal §5.1) is not a Hebrew page to a search engine — it is
the English page again. So:

- `/he/blog/<path>` is still **generated** (a Hebrew reader following a
  link lands in the Hebrew chrome, title translated, body pinned
  `lang="en"`);
- its **canonical points to the English URL**, and it is **left out of the
  `hreflang` alternates and the sitemap**, so it is never indexed as a
  duplicate.

## 6. The share image — a chain that ends at the site's default (decided)

`og:image` wants an absolute URL to a raster image, ideally 1200 × 630
(SVG is not accepted by most previewers). Every page gets one, from **the
first level of a chain that has one** — so a page with nothing of its own
still previews with the nearest image above it, and at worst with the
site's.

### 6.1 The chain

| # | Level | Applies to | Declared in |
| --- | --- | --- | --- |
| 1 | **The page's own** | an article | its frontmatter `image` — the translation's file first, then the English file's |
| 2 | *(later)* **Generated for the page** | an article | the generator (§6.5) — beats everything below, never an explicit `image` |
| 3 | **The nearest folder** | an article, a folder page | the `image` of the folder's `index.<lang>.mdx`, then its `index.mdx` — walking up, folder by folder, to `articles/index.mdx` (the Blog's own) |
| 4 | **The section** | an app screen; a Blog page with no folder image | the route's `handle.meta` image, then its sidebar folder's (Engine, Tools, Library, Settings, Blog …) — one small registry, `src/assets/share/sections.ts` |
| 5 | **The site's default** | everything | `src/assets/share/default.<lang>.png`, then `default.png` |

**Every level is language-aware**, because a share image usually carries
text: a Hebrew page takes the level's Hebrew image when there is one and
its general one otherwise — `x.he.png` beside `x.png`, `index.he.mdx`
beside `index.mdx` — before the chain moves up a level.

The chain is **one pure function**, `shareImageOf(page, language)`, beside
`handle.meta` — the browser's head, the pre-render, the build check and the
MDX editor all call it, so they cannot disagree.

### 6.2 The alt text

Every image carries an `og:image:alt` (and `twitter:image:alt`) — read
aloud by screen readers in some previewers. It travels with the image:
`imageAlt` beside `image` in frontmatter (required when `image` is set), an
`alt` per entry in the section registry, and a catalog key
(`share.defaultImageAlt`) for the site's default — so each level's alt is
in the reader's language, like its image.

### 6.3 The files

- An article's or folder's image sits **beside its `.mdx`**
  (`articles/tournaments/cover.png`), named relative to it
  (`image: ./cover.png`), as a PGN is today.
- Section images and the default sit in `src/assets/share/`.
- All are pulled through Vite (`import.meta.glob` with `?url`), so each
  lands in `dist/assets/` under a **content hash**: a changed image gets a
  new URL, which matters because Facebook, X and LinkedIn cache a preview
  by the image's URL.
- The tags use the **canonical host** (`chessapp.dev`, §10.3), on both
  builds.

### 6.4 Checks

At build time, for every image any page resolves to:

- the file exists, and is **PNG or JPEG** (WebP and SVG are refused by
  some previewers);
- **at least 600 × 315**, and within 5 % of the **1.91 : 1** ratio — an
  error below the minimum, a warning off the ratio;
- **at most 5 MB** (X's limit; others allow more);
- an alt text in every language the page has.

The build check (§12) also reports **which pages fall through to the
site's default** — not an error, a to-do list.

In the MDX editor's Metadata tab (frontmatter proposal §7), the `image`
field shows the resolved image and **where it came from** — "own",
"from folder *Tournaments*", "section *Blog*", "site default" — so an author
sees what a share will look like before writing anything.

### 6.5 Later: generated images

A build-time generator — the page's title over a board diagram of its first
`<InlinePgnGame>` position, or a crosstable's top rows, rendered SVG → PNG —
plugs into the chain as level 2, without changing the rest. Worth it once
there are many articles; not needed to start.

## 7. Hydrate, or replace

The pre-rendered HTML is what a crawler reads; then the browser runs the
app. Two ways for the app to take over.

### 7.0 In plain terms

When a person opens a pre-rendered page, two things arrive one after the
other:

1. **The HTML** — the page already drawn: text, tables, headings. The
   browser shows it at once. But it is *dead*: nothing reacts to a click,
   because the JavaScript has not arrived.
2. **The JavaScript** — the app. It must now make that page *alive*.

It can do that in two ways:

- **Replace.** The app ignores what is on screen, draws the whole page
  again from scratch, and swaps it in. Like taking down a printed poster
  and hanging a live screen in its place: simple, and the screen shows
  exactly what the app wants — but for a moment the reader can see the
  swap.
- **Hydrate.** The app walks over the page that is already drawn and
  *connects* to it — attaching the click handlers, the state — without
  drawing it again. Like wiring up the poster so it becomes the screen:
  nothing visibly changes. But it only works if the app, on its first
  render, would have drawn **exactly** the same page; wherever it would
  not, React discards that part and redraws it, and logs an error.

**For a crawler the two are identical** — it reads the HTML of step 1 and
leaves. Indexing and link previews do not depend on this choice at all.
**It only affects people**, in the second or so after the page appears:

| | Replace | Hydrate |
| --- | --- | --- |
| What the reader may see | a brief redraw; if they use a non-default theme or scheme, the page flips from the default look to theirs | nothing — *if* the first render matches; otherwise a partial redraw anyway |
| What it demands of the code | nothing new | the first render must not depend on anything only the browser knows — the theme, `localStorage`, IndexedDB, the screen size — so each of those is read *after* the first render, in an effect |
| The risk | none — this is what the app does today | a mismatch anywhere is a bug to chase, on every future change |
| Work | already done | the table below, and keeping it true |

### 7.1 Replace — `createRoot`, as today

The app renders from scratch over the static markup.

- **Nothing can mismatch**: the reader's theme, scheme, language and
  IndexedDB data are used from the first client render.
- **Cost**: the page is rendered twice (the static HTML, then the app), and
  where the reader's settings differ from the defaults the page visibly
  changes once — a flash of the default theme.

### 7.2 Hydrate — `hydrateRoot`

React attaches to the static markup instead of replacing it. It requires
the client's **first render to equal the server's**. Where it would not:

| Source of difference | Server | Client's first render | Mitigation |
| --- | --- | --- | --- |
| Language | from the URL | from the URL (§5) | none needed once the path wins |
| Colour scheme | the default | the reader's | MUI's CSS variables (`buildTheme.ts`, `cssVariables`) keep the **markup** the same in light and dark; MUI's `InitColorSchemeScript` in the head sets `data-mui-color-scheme` before paint — no mismatch, no flash |
| Theme choice | `default` | the reader's (`themeChoice.ts`) | differs in the **values** the boards read (`useChessTokens`) — a mismatch under any non-default theme |
| IndexedDB embeds | nothing to read | a store snapshot is `undefined` until its first read lands (`database.md`) — the same "loading" state | none needed: both render the loading state first |
| Reduced motion | unknown | `useMediaQuery(…, { noSsr: true })` | a mismatch only in the boards' animation option, invisible in markup |

React 19 recovers from a mismatch by re-rendering on the client, with a
logged error — correct, but noisy, and it gives up hydration's benefit.

**Decided: replace first** (§13, phase 2) — it delivers the whole goal
(crawlers and previews read the static HTML; people get the app) with no
mismatch to chase. **Hydrate later**, if measurement shows the double
render costs readers something, for a reader on the default theme — the
one remaining mismatch.

## 8. Styles in the static HTML

Without them the static page is unstyled until the JavaScript has run —
which a crawler that renders (Google) would also see.

- **emotion** — `@emotion/server`'s `createEmotionServer(cache)` over the
  cache the page rendered with (`rtlCache` for a Hebrew page, `ltrCache`
  otherwise), `extractCriticalToChunks` + `constructStyleTagsFromChunks`
  into the head. New dev dependency: `@emotion/server`.
- **MUI's CSS variables** are emitted by its `GlobalStyles` inside the tree,
  so they are captured with the rest; `InitColorSchemeScript` (§7.2) goes
  in the template's head.
- **Fonts**: `@fontsource-variable/jetbrains-mono` is the console theme's,
  loaded on demand — nothing to do for the default theme.

## 9. Embeds on the server

What each embed renders in the static HTML (the components of
`views/home/frontPage/`):

| Embed | Its data | In the static HTML |
| --- | --- | --- |
| `<InlinePgnGame>` | a PGN in the article | **The full game window** — its moves, comments and board |
| `<SwissStandingsTable pgn>`, `<RoundRobinCrossTable pgn>`, `<KnockoutBracket pgn>`, `<MatchTable pgn>`, `<TeamStandingsTable pgn>` | a PGN in the article | **The full table** — names, results, scores; indexable content |
| `<CollectionGameBoard>`, `<CollectionCard>`, `<StoredGameEmbed>`, `<CollectionTournamentTable>` and siblings | IndexedDB (the Library, saved analyses) | Their loading state — the server has no IndexedDB |
| `<RepertoireBoard>` | IndexedDB, else a shipped sample | Loading state (or the sample, if the fallback is chosen synchronously — to check) |
| `<NavCards>` | `navTree()` | **The cards** |

**The boards** are `react-chessboard`, which measures its square in a
mount effect. Effects do not run in a static render, so it should render
its squares without a size — **to verify in the spike** (§13): anything
reading `window` or `document` during render would throw on the server, and
would need a client-only guard. Whether a board's static markup is worth
anything to a crawler is a separate question; a text alternative (the FEN,
the moves) is what the accessibility work (CTA-114) will want anyway.

Later, the shipped Library collections (`src/data/library/`) could be read
by the pre-render directly, so `<CollectionTournamentTable>` over a shipped
TWIC collection renders its full table too. Not needed to start.

## 10. Hosting: two deployments, two workflows (decided)

**Both hosts stay live**, each built and deployed by its own workflow:

| | **`build-gh`** — GitHub Pages | **`build-swa`** — Azure Static Web Apps |
| --- | --- | --- |
| URL | `https://kantorv.github.io/chess-trainer-app/` | `https://chessapp.dev/` |
| Base path | `/chess-trainer-app/` | `/` |
| SPA fallback (the app's screens) | `404.html`, the pristine template — **status 404** | `navigationFallback` → `index.html` — **status 200** |
| An unknown Blog path | `404.html` (the app says "no such article") — status 404, correct | `/blog/*` excluded from the fallback, `responseOverrides.404` → the app's 404 page — status 404, correct |
| Redirects (`redirectFrom`) | a generated page at the old path: `<meta http-equiv="refresh">` + a canonical to the new one | real **301s**, generated into `staticwebapp.config.json` from the manifest |
| `robots.txt`, `sitemap.xml` | **not possible** — a project site's `robots.txt` would have to sit at `kantorv.github.io/robots.txt`, the user site's root, which this repository does not own | served at the root |
| Headers (cache, security) | none | `globalHeaders` in `staticwebapp.config.json` |
| Pull-request previews | none | SWA's staging environments, optional |

### 10.1 One build, parameterised

The code already reads the base from `import.meta.env.BASE_URL`
(`App.tsx`'s router `basename`, `lib/engine.ts`'s Stockfish URL); only
`vite.config.ts` hard-codes `base: '/chess-trainer-app/'`. So:

- `vite.config.ts` takes `base` from an env var (`BASE_PATH`), defaulting to
  today's `/chess-trainer-app/` — every local command and test unchanged;
- the pre-render takes `SITE_URL` (the origin + base, for absolute URLs) and
  `DEPLOY_TARGET` (`gh` | `swa`), which picks the target-specific outputs:
  `404.html` and refresh pages for `gh`; `staticwebapp.config.json`,
  `robots.txt` and `sitemap.xml` for `swa`.

The base is baked into every asset URL, so **each target is its own build**
— two builds per release, not one artifact deployed twice. A shared
reusable workflow (`build.yml`, `workflow_call` with `base_path`,
`site_url`, `deploy_target`) does install → `yarn build` → pre-render →
target outputs → upload, and each deploy workflow calls it, then deploys.
(Calling the **build** this way is safe: the reason `deploy-pages.yml` is
dispatched rather than called — the `github-pages` environment refusing a
`refs/pull/…` ref — concerns the *deploy* job, which stays in the
dispatched workflow.)

### 10.2 The workflows

- **`build-gh`** is today's `.github/workflows/deploy-pages.yml`, renamed
  (or kept, its jobs split into the shared build + deploy). `release.yml`'s
  `publish-pages` job dispatches it **by its `name:`**, "Deploy to GitHub
  Pages" — keep the name, or change both together.
- **`build-swa`** is new: the shared build with `BASE_PATH=/`,
  `SITE_URL=https://chessapp.dev`, then `Azure/static-web-apps-deploy` with
  `skip_app_build: true` and `app_location: dist`, its deployment token in a
  repository secret (`AZURE_STATIC_WEB_APPS_API_TOKEN`). The same triggers
  as `build-gh` (a push to `main` touching the app, `workflow_dispatch`),
  and `release.yml`'s `publish-pages` dispatches it too.
- `docs/swa-setup.sh` creates the app with `--output-location "build"`;
  Vite writes `dist/`. Irrelevant once the action deploys with
  `skip_app_build`, but worth correcting in the script.

**Independent of the pre-render**: `build-swa` can ship the app as it is
today — the SPA on `chessapp.dev`, with a status-200 fallback — before any
of phases 0–4. See §13.

### 10.3 Which deployment is canonical

Two live copies of every page compete in search unless **one is
canonical**. **Decided: `chessapp.dev`** — the own domain, the only one of
the two that can serve `robots.txt` and the sitemap, real 301s, and a
fallback with status 200.

Then:

- **both** builds write every page's `canonical`, `og:url` and `hreflang`
  links to `https://chessapp.dev/…` (a separate `CANONICAL_URL`, equal to
  `SITE_URL` on `swa`); `og:image` too, so a preview always loads from the
  canonical host;
- the GitHub Pages copy carries **no `noindex`** — Google advises against
  combining `noindex` with a cross-domain canonical (the canonical is
  ignored); the canonical alone consolidates the two;
- the sitemap lists `chessapp.dev` URLs only, and is submitted to Google
  Search Console for that domain.

## 11. Sitemap and robots

Generated by the pre-render from the manifest, **in the `swa` build only**
(§10 — GitHub Pages cannot serve them for a project site):

- **`sitemap.xml`** — every page that is canonical: published articles,
  folders, the front page, each language with a body, and the app's
  pre-rendered screens in every language (§3.4); `<lastmod>` from
  `updated`, else `date` (a screen: none); the `hreflang` alternates as
  `xhtml:link`. Never a draft, never a title-only translation, never a
  reader's record.
- **`robots.txt`** — allow all, `Sitemap:` its absolute URL; disallow
  nothing the app ships (a dev route never reaches `dist/`).

## 12. Testing

- **Build checks** (a script after the pre-render, run in CI's build job):
  every generated page has status-200 placement, one `<title>`, a
  `description`, a canonical, the `og:*` set, `<html lang dir>` matching
  its URL, no draft's path or text anywhere in `dist/`, `404.html` the
  pristine template, and the sitemap listing exactly the canonical pages.
- **The browser pass** (`yarn test:a11y`, over `vite preview` of the
  production build) gains a **JavaScript-off** project: every article's
  title and text present with scripts disabled — what a social crawler
  sees — and still axe-clean.
- **By hand, once per release**: a few URLs through Facebook's sharing
  debugger, X's card validator and LinkedIn's post inspector; Google Search
  Console's URL inspection on the canonical host.

## 13. Plan

| Phase | What | Delivers |
| --- | --- | --- |
| 0. **Spike** | Pre-render one article and its folder page: the server bundle, `prerender` over a lazy MDX chunk, `react-chessboard` and MUI on the server, emotion extraction. Go / no-go, and the build time per page. | The risks of §9 answered (embeds and boards on the server) |
| 1. Head from `handle.meta` | Frontmatter proposal step 6 — the shell renders the head | Correct titles in the browser |
| 2. **Pre-render** | `entry-server.tsx`, `scripts/prerender.mjs`, emotion, the pristine `404.html`, `createRoot` over the static markup (§7.1) | Indexable, status 200, styled static pages — English |
| 3. **Tags, image, sitemap** | §4.2's tags; the share-image chain (§6) — `shareImageOf`, the default and section images, frontmatter `image` / `imageAlt`, the checks; `sitemap.xml`, `robots.txt`, `SITE_URL` | Rich previews; discoverability |
| 3b. **The app's screens** | Pre-render every screen route and the shipped collections (§3.4); `pageDescriptions.<id>` in both catalogs; the pristine fallback on SWA | Every screen shareable and indexable, status 200 on both hosts |
| 4. **Language in the URL** | `/he/` on every route through the router's `basename` (§5.3), the detector reads the path, the language switch re-creates the router (confirming over unsaved work), `hreflang`, §5.5's canonical rule, the browser pass on `/he/` URLs | Every screen addressable per language; the Hebrew Blog indexed and shareable |
| 5. **Two workflows** | `BASE_PATH` in `vite.config.ts`, the shared `build.yml`, `build-gh` (today's deploy), `build-swa` (§10) | The app on `chessapp.dev` |
| 6. *Optional* hydrate | `hydrateRoot` for the default theme (§7.2), if phase 2's measurements show the redraw matters | No visible redraw |
| 7. *Optional* | Generated share images; shipped Library data on the server | Richer previews and content |

**Phase 5 does not depend on the others** — the two workflows deploy
today's SPA as well as a pre-rendered one — so it can go first, and should
go **before phase 3**: the canonical URLs, the `og:url`s and the sitemap
are written once, against the canonical host, rather than changed after
the site is announced. Phases 2–4 then add their target-specific outputs
(`404.html` and refresh pages for `gh`; `staticwebapp.config.json`, the
sitemap and `robots.txt` for `swa`) to the shared build.

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| A component reads `window` / `document` / `localStorage` during render and throws on the server | The spike finds them; a client-only guard where needed. Effects are safe. |
| The pre-rendered front page becomes the SPA fallback | Copy `404.html` from the template saved before pre-rendering; a build check. |
| Static and client markup diverge under hydration | Replace first (§7.1); hydrate only where the first render provably matches. |
| A title-only translation indexed as a duplicate | Canonical to English, out of `hreflang` and the sitemap (§5.5). |
| Two live deployments compete in search | One canonical host; both builds point every canonical, `og:url` and `hreflang` at it (§10.3). |
| The two builds drift apart | One reusable build workflow, three inputs; the target-specific outputs are the only difference, and the build checks (§12) run on both. |
| Renaming the Pages workflow breaks the release | `release.yml` dispatches it by `name:` — keep the name or change both in one commit (§10.2). |
| The e2e pass assumes the base | `e2e/a11y/env.ts` hard-codes `/chess-trainer-app/`; it keeps testing the `gh` build (the default `BASE_PATH`), or reads the same env var. |
| A draft leaks into `dist/` | Already guarded by the frontmatter work; the build check repeats it on the pre-rendered pages. |
| Build time grows with hundreds of articles | Measured in the spike; the pages render in parallel, and only Blog pages are pre-rendered. |

## 15. Open questions

### Decided

| Question | Decision | Where |
| --- | --- | --- |
| The host | **Both** — two workflows, `build-gh` (GitHub Pages) and `build-swa` (Azure Static Web Apps), over one shared build | §10 |
| The canonical host | **`chessapp.dev`** | §10.3 |
| File layout | **`x/index.html`** — every URL ends in `/` | §3.3 |
| Language prefix | **Every route** (`/he/…`), English unprefixed | §5.2 |
| How the prefix is built | **The router's `basename`** — no edit to the app's 67 absolute links; a language switch re-creates the router, confirming first where a screen holds unsaved work | §5.3 |
| Share images | **A chain** — the page's own → (later) generated → nearest folder → section → the site's default, each level language-aware, with alt text and build checks | §6 |
| The app's screens | **Pre-rendered** — every screen route and the shipped collections, with their own title, description and image | §3.4 |
| Hydrate or replace | **Replace** to start (what the app does today); measure in phase 2, hydrate only if the redraw is visible enough to matter — crawlers and previews are unaffected either way | §7 |
| A Library game page (`/library/<c>/<n>`) | **Not pre-rendered** — served by the fallback; the collection page is pre-rendered | §3.4 |
