---
paths:
  - "src/entry-server.tsx"
  - "src/main.tsx"
  - "src/App.tsx"
  - "src/i18n.ts"
  - "src/lib/languagePath.ts"
  - "src/lib/shareImage.ts"
  - "src/assets/share/**"
  - "src/views/main/documentHead.ts"
  - "src/views/main/routeHandle.ts"
  - "src/views/main/unsavedWork.ts"
  - "src/theme/LanguageSwitch.tsx"
  - "scripts/prerender.mjs"
  - "scripts/check-dist-pages.js"
  - "scripts/share-images.mjs"
  - ".github/workflows/build*.yml"
  - "scripts/crossOriginIsolation.mjs"
  - "e2e/a11y/static.spec.ts"
---

# Static pages — indexable and shareable (CTA-136)

The app is still a single-page app, but **every page it can know at build
time is also a static `index.html`**: the front page, the Blog, every screen
whose route names no record of the reader's, the Settings tabs and the
shipped Library collections, in every language. A search engine and a link
preview (which runs no JavaScript) read that HTML; a person's browser loads the
same JavaScript as ever and **replaces** it. The design and its decisions are
[`docs/static-pages-proposal.md`](../../docs/static-pages-proposal.md); this
file is how it is built.

## 1. The build

```
yarn build = tsc -b
           → vite build                                  dist/          (the browser's bundle; dist/index.html the template)
           → vite build --ssr src/entry-server.tsx       dist-ssr/      (the same app, for Node)
           → node scripts/prerender.mjs                  dist/<path>/index.html, per language, + the host's files
yarn check:pages                                         holds dist/ to it (CI, and each deploy)
```

| Env | Read by | Default | What |
| --- | --- | --- | --- |
| `BASE_PATH` | `vite.config.ts`, `e2e/a11y/env.ts` | `/chess-trainer-app/` | The sub-path the host serves under — `/` for chessapp.dev. Baked into every asset URL, so **each host is a build of its own**. |
| `DEPLOY_TARGET` | `scripts/prerender.mjs`, `vite.config.ts` (`preview`) | `gh` | `gh` — `404.html` + a refresh page per old Blog address; `swa` — `staticwebapp.config.json` (the fallback, the 301s, headers incl. COOP / COEP), `sitemap.xml`, `robots.txt` (+ `404.html`). |
| `CANONICAL_URL` | `scripts/prerender.mjs` | `https://chessapp.dev/` | The canonical host: every canonical, `og:url`, `hreflang` and image URL, **on both hosts**. |

- **Which pages**: `prerenderedPages()` in `src/entry-server.tsx` — the routes
  table's static paths (not `/settings`, which shows its first tab), the
  Blog's folders and published articles (a production manifest has no draft),
  the Settings tabs (`navItemsInFolder("settings")`) and
  `shippedCollections`. Not a reader's record, not a single Library game
  (decided): those, and any unknown path, reach the app through the host's
  fallback. A new static route is pre-rendered with no edit; a new param route
  is not, unless listed there.
- **How**: react-router's static handler under the base + language prefix,
  the same tree as `main.tsx`'s, and React 19's `prerender` with an unbounded
  `progressiveChunkSize` — it waits for every lazy article chunk and writes
  the content **in place**, so the page reads the same with JavaScript off.
  Pages render one at a time (the i18n language is global): ~120 pages in
  ~15 s.
- **Styles**: emotion's two caches run in `compat` mode on the server, so
  nothing is written inline; `@emotion/server` extracts what the page used
  into its head. `createRoot` in the browser finds those `<style>` tags and
  reuses them.
- **A page that renders a part falling back to the browser fails the
  build** — in practice a `useSyncExternalStore` without a server snapshot
  ("Missing getServerSnapshot"). **Give every one a third argument** (the same
  function as the client's): a hook over a store, a slot, a panel.
- **What only a browser has stays out of render**: a store's first read is
  an effect, so its screen renders its loading state; `localStorage` reads are
  in `try` (the theme choice falls back to the default). A component that
  touches `window` or `document` **during render** breaks the build — read it
  in an effect.
- **One `h1`**: the shell's hidden heading yields to a screen's own in an
  effect, which does not run on the server, so `renderPage` drops the shell's
  where the page holds another (`withOneHeading`).
- **The template is kept pristine** as `dist/app-shell.html` before the front
  page overwrites `dist/index.html`; `404.html` is a copy of it, and so is
  Static Web Apps' fallback target. Never copy `index.html` as a fallback.

## 2. The head

One pure builder, `documentHeadHtml` (`src/views/main/documentHead.ts`), over
what the route handles say:

| Tag | From |
| --- | --- |
| `<title>` | `pageTitleOf` as the shell makes it — the page's `meta.title`, the screen's `pages.*`, the app |
| description | `meta.description`, else the screen's `pageDescriptions.<id>` (both catalogs — `descriptionKeyOf`) |
| canonical, `og:url` | the page's own URL on the canonical host — or the default language's page where the page is **not written in** its language (a title-only translation) |
| `hreflang` + `x-default` | `meta.languages` (a Blog article: the languages with a body), else every language |
| `og:type`, `article:*` | `meta.kind` (`article` for an article) and its `published`, `modified`, `tags` |
| `og:image` (+ alt, size, type), `twitter:*` | the share-image chain (§3) |
| `<html lang dir>` | the URL's language |

`PageMeta` (`routeHandle.ts`) carries these; `blogPageMeta` fills them for
the Blog, `collectionPageMeta` names a shipped collection. **In the browser**
the shell renders `<title>` and the description (React 19 hoists them);
`main.tsx` first removes the static two, which React would add beside rather
than adopt. The other static tags stay — they are for readers of the HTML.

## 3. The share image — `src/lib/shareImage.ts`

The first level of the chain that has an existing file: **own** (an article's
`image`, a translation's own first), **folder** (each `index.mdx`'s `image`,
walking up), **section** (`src/assets/share/sections.ts` — a card per
section, by path), **default** (`src/assets/share/default.png`). Each level is
language-aware: `x.he.png` beside `x.png`, a translation's own file.

- **`image` in frontmatter** is a PNG or JPEG **beside the file**, named
  relative to it (`./cover.png`), with `imageAlt`; a folder's `index.mdx`
  takes both (`articleFrontmatter.ts`).
- The pre-render **copies** the chosen file to `dist/assets/share/<name>-<hash>.<ext>`
  — a changed image is a new URL, which a preview cache cannot hold on to —
  and **checks** it: PNG or JPEG, at least 600 × 315, at most 5 MB (errors),
  near 1.91 : 1 (a warning), its words in the page's language (an error). It
  lists the pages that fall through to the site's own.
- The section cards and the site's are drawn by `node scripts/share-images.mjs`
  (Playwright's Chromium, the catalogs' words) and committed; their alt texts
  are `share.*` in both catalogs.
- The MDX editor's Metadata tab shows what a page shares as and from which
  level (`src/mdxEditor/client/SharePreview.tsx`).

## 4. The language in the URL — `src/lib/languagePath.ts`

Every route answers under `/he/…`; English is unprefixed. **The URL decides
the language**:

- `src/i18n.ts` boots in the address's language; an **unprefixed** address
  with a stored non-English preference (`i18nextLng`) is replaced by the
  prefixed one **before anything renders**. No browser-language guessing: the
  same URL shows everyone the same page.
- The prefix is the **router's `basename`** (`App.tsx`, `routerBasename`), so
  the app's links need no edit. A router cannot change its basename, so a
  change of language makes a new router (keyed on the language — **the screen
  remounts**).
- `LanguageSwitch` stores the choice, `replaceState`s the same place under the
  new prefix (path, query, hash kept) and changes the language. Where a screen
  holds unsaved work it **asks first** — a screen declares that with
  `useUnsavedWorkGuard(unsaved)` (`views/main/unsavedWork.ts`), which is also
  its `beforeunload` guard. A new screen with in-memory work uses the hook,
  never its own `beforeunload` effect.
- **Adding a language**: the catalog and `supportedLanguages` as ever; its
  `OG_LOCALES` entry (`documentHead.ts`, a compile error without it); its
  prefix is then live, pre-rendered, and in Static Web Apps' fallback
  exclusions.

## 5. The two hosts

| | `build-gh.yml` — "Deploy to GitHub Pages" | `build-swa.yml` — "Deploy to Azure Static Web Apps" |
| --- | --- | --- |
| URL / base | pgntools.github.io/chess-trainer-app/ — `/chess-trainer-app/` | chessapp.dev — `/` |
| Unknown path | `404.html` (the template), status 404 | `navigationFallback` → `/app-shell.html`, status 200; `/blog/*` excluded → `404.html`, status 404 |
| Old Blog address | a refresh page + canonical | a 301 in `staticwebapp.config.json` |
| Built-in sign-in (`/.auth/…`, sets a cookie) | none | blocked: a 404 route per `scripts/swaBlockedAuth.mjs`, first in `routes`, held by `check:pages` (CTA-159 — the Cookies Notice says no cookies; [`docs/privacy-policy-checks.md`](../../docs/privacy-policy-checks.md) §2) |
| `sitemap.xml`, `robots.txt` | not possible (a project site) | written |

### Cross-origin isolation on the swa host (CTA-154)

The multi-thread engine (`stockfish-19-lite-multi`) needs `SharedArrayBuffer`,
which a browser gives only to a **cross-origin-isolated** page. The `swa` build
writes `staticwebapp.config.json`'s **`globalHeaders`** with
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` — **every** response, so the page,
the Stockfish worker script and its `.wasm` all carry them (a dedicated worker
is isolated only by its own script's COEP). One definition,
`scripts/crossOriginIsolation.mjs`, read by the pre-render and by
`check:pages`. GitHub Pages cannot set headers: its build writes none, its page
is not isolated, and the registry lists the multi-thread build **disabled**
(`describeEngines()`, from `crossOriginIsolated` at runtime) — nothing breaks
there; the same bundle runs on both.

- **`require-corp`, not `credentialless`** (decided by testing, 2026-10-07):
  both isolate the page in Chromium, but Safari has no `credentialless`.
  `require-corp` costs nothing here — an audit of the app and the Blog found no
  cross-origin **sub-resource**: fonts (`@fontsource-variable/jetbrains-mono`),
  piece SVGs, flags (`flag-icons`), an article's images (`<ArticleImage>`
  imports are bundled into `/assets/`), the share images, the Stockfish worker
  and its `.wasm` are all same-origin. A link to another site (The Week in Chess
  `href`s) is a navigation, which COEP does not touch.
- **What would break it**: an `<img>`, `<script>`, `<iframe>`, font or `fetch()`
  from another origin that does not send `Cross-Origin-Resource-Policy:
  cross-origin` (or CORS). `check:pages` fails the swa build when a pre-rendered
  page carries one in its HTML (`script`, `img`, `iframe`, `source`, a
  stylesheet / icon / preload `link`) — a runtime `fetch()` it cannot see, so
  **a new third-party resource is a decision**: self-host it, or its host must
  send CORP, or COEP moves to `credentialless` and Safari loses the multi-thread
  build. `COOP: same-origin` severs `window.opener`, so a future sign-in popup
  needs `same-origin-allow-popups` (and then the page is not isolated).
- **`yarn preview` serves the same headers** for a `DEPLOY_TARGET=swa` build
  (`vite.config.ts` reads `dist/staticwebapp.config.json`'s `globalHeaders`), so
  the browser pass runs the page isolated, as chessapp.dev serves it. A GitHub
  Pages build has no such file, and gets none. Run it with the build's own
  `BASE_PATH=/`.
- The headers are a **host** behaviour: only a real deploy proves Azure sends
  them. After one, `curl -sI https://chessapp.dev/` shows both, and
  `self.crossOriginIsolated` is `true` in the console.

Both call **`build.yml`** (install → `yarn build` → `check:blog-build`,
`check:pages` → upload); `release.yml`'s `publish-pages` dispatches both **by
`name:`** — rename a workflow and its dispatch together. The SWA deploy needs
the repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.

## 6. Testing

- Units: `languagePath.test.ts`, `shareImage.test.ts`, `documentHead.test.ts`,
  `articleFrontmatter.test.ts`, the language switch in
  `theme/AppThemeWithLang.test.tsx`.
- `yarn check:pages` after a build: every page in every language, one title,
  a description, a canonical, the Open Graph set, its image in `dist/`, `<html
  lang dir>`, content in `#root`; `404.html` the template; on `swa` the
  sitemap exactly the self-canonical pages; and **on `swa`** (CTA-154) COOP and
  COEP in `globalHeaders`, the Stockfish workers and `.wasm` files in `dist/`
  and outside the fallback, no pre-rendered page loading a sub-resource
  from another origin, and (CTA-159) a 404 route for each of the host's
  built-in sign-in routes.
- The browser pass visits Hebrew at `/he/…` addresses (`open(…, { language })`),
  and its **`static` project** (`e2e/a11y/static.spec.ts`) opens every
  `dist/**/index.html` **without the app** — every script request refused,
  what a crawler that runs none reads — status 200, one `h1`, an article's
  text, and `check()` (axe with contrast, direction, boards LTR). Not with
  the browser's JavaScript off: axe runs in the page, and there its timers
  never fire.
- By hand, per release: a few URLs through Facebook's sharing debugger, X's
  card validator and LinkedIn's post inspector; Search Console on chessapp.dev.
