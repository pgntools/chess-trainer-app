# In-app pages

How to add a page like the **Privacy Policy** (`/privacy`) or the **Cookies
Notice** (`/cookies`): a page of prose at its own address, written in MDX, edited
in the MDX editor, and **not part of the Blog**. Written for CTA-159.
Keeping those two documents' claims true as the code and the hosting change
is [`privacy-policy-checks.md`](privacy-policy-checks.md).

A Blog article needs no code: you drop in a file and it is listed, routed and
pre-rendered. An in-app page needs a few lines of code, because the app links to
it by name (a route, a title, maybe a footer link). Below is every step, with
`terms` (a Terms of Use page at `/terms`) as the example.

## 1. How it fits together

```
src/views/blog/articles/app-pages/terms.mdx  ─┐  the text: frontmatter + MDX body (+ terms.he.mdx)
                                              │  read by the Blog's build plugin (virtual:blog-articles),
                                              │  but left out of the Blog's registry (isAppPagePath)
src/views/blog/articles.ts  appPageDocument() ┘
        │
src/views/legal/legalDocuments.ts   LegalPageId, LEGAL_PAGES, legalDocument()
        │
src/views/legal/LegalPage.tsx       h1 = t("pages.<id>"), then the document with the Blog's mdxComponents
src/views/legal/LegalMain.tsx       one layout-only wrapper per page
        │
src/routes.tsx                      { path: "/terms", handle: { ...ARTICLE_ROUTE, title: "pages.terms" } }
```

| Piece | Where | What it does |
| --- | --- | --- |
| The folder | `src/views/blog/articles/app-pages/` | Inside the Blog's articles folder, so the MDX editor lists, edits and saves its files, but `APP_PAGES_FOLDER` / `isAppPagePath` (`src/lib/articleFrontmatter.ts`) keep it out of the Blog: no index card, no sidebar entry, no `/blog/app-pages/…`, no Blog line in the sitemap or the a11y pass. |
| Its `index.mdx` | same folder | Names the folder ("In-app pages") in the editor's lobby. Already there. |
| The loader | `src/views/legal/legalDocuments.ts` | The page ids, and each page's document per language (`appPageDocument`, a lazy chunk). |
| The page | `src/views/legal/LegalPage.tsx` | The page's name as its one `h1`, then the document. A language with no file shows the English one, pinned left to right. |
| The route | `src/routes.tsx` | An `ARTICLE_ROUTE` (the centred reading column), its title a `pages.*` key. Pre-rendered per language with no extra step, because its path is static. |
| The operator | `src/lib/siteOperator.ts`, `plugins/siteOperator.ts`, `src/views/legal/legalPagesShown.ts` | Who runs the site — `%OPERATOR_NAME%`, `%OPERATOR_ADDRESS%`, `%PRIVACY_EMAIL%` in the text, filled in by the build from `SITE_*` variables; without them the build has none of these pages (§5, CTA-182). |

**The page's name and description come from the catalogs**, not the
frontmatter: `pages.<id>` is the `h1`, the tab title and the `main` landmark's
name; `pageDescriptions.<id>` is the `<meta name="description">` and the share
preview's text. The frontmatter `title` and `summary` are what the editor shows
and requires, so **keep them equal to the catalog**. `legalDocuments.test.ts`
fails when they differ.

## 2. Adding a page, step by step

### Step 1: write the document

In the MDX editor (`yarn mdx-editor:start`, then `/dev/mdx-editor`): **More →
New article**, then **Save as…** into the `app-pages` folder as `terms`. Or
create the file by hand:

`src/views/blog/articles/app-pages/terms.mdx`

```mdx
---
title: "Terms of Use"
summary: "The terms for using chessapp.dev."
---

Last updated: 1 November 2026

## Using the App

…
```

- **`title` and `summary` are required** (the build checks every file's
  frontmatter, `src/lib/articleFrontmatter.ts`, and fails naming a bad one).
  Other article keys (`order`, `date`, `tags`, `image`) do nothing here.
- **Never `draft: true`**: a draft is left out of a production build, so the
  page would have no document there and fail to render.
- **Start the body at `##`**: the page draws the `h1` itself.
- A link to another page of the app is a plain Markdown link to its path,
  `[Privacy Policy](/privacy)`. It becomes a router link, so it keeps the base
  path and the `/he/` prefix.
- What the body can use is what a Blog article can: Markdown (no GFM tables:
  `remark-gfm` is not configured, so use a list) and the components of
  `views/home/frontPage/index.ts`.

### Step 2: write the Hebrew document

`src/views/blog/articles/app-pages/terms.he.mdx`, with its own Hebrew `title`
and `summary`, and the body translated. The test holds every page in
`LEGAL_PAGES` to a document in every language the app has. (Without one, the
page would show the English body under Hebrew, pinned left to right.)

### Step 3: the catalog keys, in both languages

In `src/locales/en.ts` **and** `src/locales/he.ts` (`he` is typed
`typeof en`, so a key in one only is a compile error):

```ts
pages: {
  …
  terms: "Terms of Use",              // = terms.mdx's title
},
pageDescriptions: {
  …
  terms: "The terms for using chessapp.dev.",   // = terms.mdx's summary
},
```

and, for a footer link (step 7), `footer.terms`.

### Step 4: register the page id

`src/views/legal/legalDocuments.ts`:

```ts
export type LegalPageId = "privacy" | "cookies" | "terms";

export const LEGAL_PAGES: readonly LegalPageId[] = ["privacy", "cookies", "terms"];
```

The id is the file's name under `app-pages/`, the catalog key and the URL path.

### Step 5: a wrapper, and the route

`src/views/legal/LegalMain.tsx`, beside the other two:

```tsx
export const TermsMain = () => (
  <Box data-testid="terms-wrapper">
    <LegalPage page="terms" />
  </Box>
);
```

`src/routes.tsx`: add it to the `LegalMain` import, and a route beside
`/privacy` and `/cookies` — **inside their `LEGAL_PAGES_SHOWN` spread**: a
build without its site operator lists no file of `app-pages/` (§5), so a
route outside it would render a page with no document:

```tsx
{
  path: "/terms",
  element: <TermsScreen />,
  handle: { ...ARTICLE_ROUTE, title: "pages.terms" }
},
```

Write `path` as a string literal: the browser pass reads the route table's
source to check every route has a line (step 6).

### Step 6: the tests and the browser pass

- `src/routes.test.tsx`: a row in the page-title table,
  `["/terms", "Terms of Use — chessapp.dev"]`, and `route.path === "/terms"`
  in the "is an article" list of the article-route test (it fails otherwise:
  only the listed routes may be articles).
- `e2e/a11y/routes.ts`: a line beside `privacy` and `cookies`, inside their
  `LEGAL_PAGES_BUILT` spread, `{ id: "terms", pattern: "/terms", path: "terms" }`
  (no leading slash), and `"/terms"` in `LEGAL_PATTERNS`.
  `e2e/a11y/routes.spec.ts` fails without it.
- `src/views/legal/legalDocuments.test.ts` and `LegalPage.test.tsx` loop over
  `LEGAL_PAGES`, so with no new test the page is checked for: a document in
  both languages, a frontmatter `title` / `summary` equal to the catalog, not
  being in the Blog, and passing axe. Add a `LegalPage.test.tsx` case if the
  page has something of its own to assert.
- The **storage disclosure** check (every `localStorage` / `sessionStorage`
  key and IndexedDB database named) applies only to `DISCLOSURE_PAGES`, the
  Privacy Policy and the Cookies Notice. Add the new page there only if it
  discloses storage too.

### Step 7 (optional): a footer link

`src/views/main/Footer.tsx`: another router link in the links group, inside
the `LEGAL_PAGES_SHOWN` fragment,

```tsx
<Link component={RouterLink} to="/terms" variant="caption" data-testid="layout-footer-terms-link" sx={{ color: 'text.secondary' }}>
  {t('footer.terms')}
</Link>
```

with `footer.terms` in both catalogs, and an assertion in
`src/views/main/Layout.test.tsx`'s footer tests. The footer wraps, so it still
reflows at 320 px. A page linked from elsewhere (Settings, another page's text)
needs no footer link.

### Step 8: check it

With the site's operator set (§5 — in `.env.local`, or the shell):

```bash
npx tsc -b
yarn lint
npx vitest run src/views/legal src/routes.test.tsx src/views/main/Layout.test.tsx
BASE_PATH=/ DEPLOY_TARGET=swa yarn build && yarn check:pages && yarn check:blog-build
ls dist/terms dist/he/terms                 # pre-rendered in both languages
grep -c "/terms/" dist/sitemap.xml          # in the sitemap
```

`yarn test:a11y` (or CI) visits the new route under every theme, scheme and
language.

## 3. What you do not need to do

- **No pre-render list**: `prerenderedPages()` (`src/entry-server.tsx`)
  takes every static route from the route table.
- **No sitemap entry**: the pre-render writes one for every page it renders.
- **No sidebar entry**: these pages are not in the sidebar.
- **No Blog exclusion**: anything under `app-pages/` is left out of the Blog
  by its path.
- **No share image**: the page falls back to the site's own
  (`src/assets/share/default.png`); the pre-render lists it among the pages
  that do.

## 4. Editing an existing page

Open it from the MDX editor's lobby (the `app-pages` folder) and save. Only the
body is yours to change freely. Renaming a page (its `title` / `summary`) means
changing `pages.<id>` / `pageDescriptions.<id>` in both catalogs to the same
words (and `footer.<id>`, if the footer's link should follow). The test fails
until they match. When the Privacy Policy or the Cookies Notice changes, update
its "Last updated" line.

## 5. The site's operator: filled in at build time (CTA-182)

The Privacy Policy and the Cookies Notice must name who runs the site: its
name, postal address and a privacy contact. **The repository is public and
carries none of them** — a fork must not publish chessapp.dev's operator as
its own. The documents say `%OPERATOR_NAME%`, `%OPERATOR_ADDRESS%` and
`%PRIVACY_EMAIL%` where the details go, and the build puts them in.

| Variable | Fills | Required |
| --- | --- | --- |
| `SITE_OPERATOR_NAME` | `%OPERATOR_NAME%` | yes |
| `SITE_OPERATOR_ADDRESS` | `%OPERATOR_ADDRESS%` | yes |
| `SITE_PRIVACY_EMAIL` | `%PRIVACY_EMAIL%` | yes |
| `<any of them>_<LANG>` — `SITE_OPERATOR_NAME_HE`, `SITE_OPERATOR_ADDRESS_HE` | the same, in that language's files (`.he.mdx`) | no — the plain one |

**Every language the app has works the same way, and none is named in the
code**: a file's language is its name's (`privacy.he.mdx`), and
`operatorValue` reads `<VARIABLE>_<LANG>` for it, then the plain variable.
So adding a language (`supportedLanguages`) needs no edit here or in the
workflows — its legal documents (`privacy.<lang>.mdx`, `cookies.<lang>.mdx`,
which `legalDocuments.test.ts` requires) and, where its name or address is
written differently, its own variables (`SITE_OPERATOR_NAME_FR`). A `SITE_*`
variable the build reads none of — a typo (`_HEB`), a language the app has
not got, `_EN` (English reads the plain one) — is ignored, and the build
warns of it (`unknownSiteVariables`). A value is put in as text — MDX's `{`
and `<` escaped — so Markdown in it (`*`, `_`) stays Markdown.

**How the build reads them.** `vite.config.ts` loads the `SITE_*` variables
of the environment and of `.env` / `.env.local` (`loadSiteEnv`), and asks
**one predicate**, `legalPagesConfigured` (`src/lib/siteOperator.ts`):

- **All three required ones set** → the build has the legal pages.
  `plugins/siteOperator.ts` fills the placeholders in every `.mdx` under
  `app-pages/` before the MDX compiler reads it, so the dev server, the
  browser bundle, the server bundle and the pre-render all show the same
  text. An unknown placeholder (`%OPERATOR_PHONE%`) fails the build, naming
  the file.
- **None set** (a fork, a plain local run, `ci.yml`'s build) → no legal
  pages: `__LEGAL_PAGES__` is `false` (read as `LEGAL_PAGES_SHOWN`,
  `src/views/legal/legalPagesShown.ts`), so `src/routes.tsx` has no `/privacy`
  or `/cookies` route — hence no pre-rendered page and no sitemap line, both
  read from the route table — the footer has no links to them, and the Blog's
  manifest lists no file of `app-pages/`, so none of their text is in
  `dist/`. The build says so in its log; a deploy, in a warning on the run.
- **Some but not all** → the build fails, naming the missing ones.

`yarn check:pages` and `yarn check:blog-build` hold `dist/` to what the
build decided (`legalPagesShown`, exported by the server entry): the pages
there and no placeholder left in theirs — each page's chunk and its
pre-rendered page in every language; an article quoting a placeholder, as
the guide to these pages does, is no failure — or no page, no link to one
and no text of theirs. The browser pass visits the two pages only when the build
wrote them (`LEGAL_PAGES_BUILT`, `e2e/a11y/routes.ts`). Under Vitest the
build is configured with fixed values (`src/test/siteOperator.ts`), whatever
the machine has; `src/views/legal/legalPagesHidden.test.tsx` mocks
`legalPagesShown.ts` for a build without them.

**The MDX editor** opens and saves the files as written: it reads `?raw`,
which the plugin leaves alone, so it shows the placeholders (and its preview
too) — keep them when editing the operator's paragraph.

### On a machine

Copy the lines from [`.env.example`](../.env.example) into `.env.local`
(gitignored) and fill them in, then `yarn dev` / `yarn build`. In a worktree,
`.jst/bootstrap.sh` copies the main checkout's `.env.local` in when the
worktree lacks one, then keeps every line of it but its own port line.

### In CI and the deploys

The values are **repository variables** — not secrets: the pages publish
them anyway, and a variable's value is readable in the run's log, which is
fine here. `build.yml` (both deploys: `build-gh.yml`, `build-swa.yml`) and
`a11y.yml` pass **every `SITE_*` repository variable** to `yarn build` — a
step reads `toJSON(vars)` and writes each into `$GITHUB_ENV`, logging their
names — so a new language's variables need no workflow edit; `ci.yml` builds
without them on purpose, a fork's build. Set them once per repository (the
`_HE` ones, and any other language's, where its value differs):

```bash
gh variable set SITE_OPERATOR_NAME --body "…"
gh variable set SITE_OPERATOR_NAME_HE --body "…"
gh variable set SITE_OPERATOR_ADDRESS --body "…"
gh variable set SITE_OPERATOR_ADDRESS_HE --body "…"
gh variable set SITE_PRIVACY_EMAIL --body "…"
gh variable list                      # check
```

**Set them before a change that needs them reaches `main`**: a deploy
without them publishes the site with no Privacy Policy, and says so only in
a warning. After a deploy, check the live page names the operator:

```bash
curl -s https://chessapp.dev/privacy/ | grep -c "%OPERATOR_"   # 0
```
