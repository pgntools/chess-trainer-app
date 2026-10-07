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
`/privacy` and `/cookies`, before the Settings routes:

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
- `e2e/a11y/routes.ts`: a line beside `privacy` and `cookies`,
  `{ id: "terms", pattern: "/terms", path: "terms" }` (no leading slash).
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

`src/views/main/Footer.tsx`: another router link in the links group,

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
