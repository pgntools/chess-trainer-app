# Proposal: frontmatter for Blog articles

Status: **implemented (CTA-135).** Every question raised is decided —
recorded in §10 and folded into the sections they touch. One departure from
§3.2, found while building it: the manifest is **one virtual module**,
`virtual:blog-articles` (`plugins/blogArticles.ts`), not a `?frontmatter`
query under an `import.meta.glob`. A glob's keys are the paths of every file
it matches, drafts too, and they land in the entry chunk — so with a glob a
draft's path ships whatever the plugin answers for its module. The virtual
module lists only what a build ships: each file's metadata, and an
`import()` for each body (none for a frontmatter-only translation). The rest
stands as written; `yarn check:blog-build` holds a build to §4.4 and §9.
Scope: the Blog (`src/views/blog/`), the front page that is one of its
articles, the dev-only MDX editor (`src/views/dev/mdxEditor/`), and the
build (`vite.config.ts`).

## 1. Requirements

1. **Manage an article's metadata** — title, summary, order, date and more —
   in the article itself.
2. **Adding a language is easy**, and **each translation carries its own
   title** (and summary), rather than one file holding every language's.
3. **Article paths scale**: the way an article gets its address, its route,
   its sidebar entry and its browser-pass check must still work with
   hundreds of articles.

## 2. How it works today

| What | Where | Notes |
| --- | --- | --- |
| The body | `src/views/blog/articles/<path>.mdx`, `<path>.he.mdx` optional | Found by an `import.meta.glob` in `articles.ts`; each file is its own lazy chunk. 29 files today, **no `.he.mdx` at all**. |
| The metadata | `BLOG_ARTICLES` in `src/views/blog/articles.ts` | `path`, `title: { en, he }`, `summary: { en, he }`, written by hand. **Order** is the array's order. Every one of the 29 has a Hebrew title and summary although none has a Hebrew body. |
| The folders | `BLOG_FOLDERS` in `articles.ts` | `path`, `title: { en, he }`, order is the array's. |
| The route | one line per article in `src/routes.tsx` | `{ path: "/blog/<path>", element: <BlogArticleScreen />, handle: { ...ARTICLE_ROUTE, title: "pages.blogArticle" } }`. A `/blog/*` splat already exists — it renders the **folder** index. |
| The browser pass | one entry per article in `e2e/a11y/routes.ts` | Every entry runs under every theme × scheme × language. |
| The sidebar | `navItems()` in `src/views/main/navItems.ts` | One nav item per article, from `blogArticlesInTreeOrder()`. |
| The check | `src/views/blog/articles.test.ts` | Holds the four lists — files, registry, routes, browser pass — to each other. |

Who reads the registry, all **synchronously** and without loading an
article's chunk: the sidebar, the Blog index and folder pages (titles and
summaries), each article's `h1`, breadcrumbs and page title
(`BlogArticle.tsx`), the front page (`Home.tsx`, through
`frontPageArticle.ts`) and the MDX editor's article picker
(`articleSources.ts`).

So adding an article today takes **four edits**: the `.mdx`, `articles.ts`,
`routes.tsx`, `e2e/a11y/routes.ts`.

Language plumbing that already exists: `supportedLanguages` /
`rtlLanguages` in `src/i18n.ts`; `LocalizedText` (`{ en } &
Partial<Record<AppLanguage, string>>`, English the fallback) in
`src/lib/localizedText.ts`; `articleDocument(path, language)` falls back to
the English body, which the screen then pins LTR with `lang="en"`. The file
name pattern `<path>.<xx>.mdx` already accepts any two-letter language.

## 3. Findings

### 3.1 Frontmatter is not parsed today

`@mdx-js/rollup` (configured in `vite.config.ts`, `.mdx` only) does not
understand frontmatter. A file starting

```mdx
---
title: Get started
---
```

renders as a horizontal rule followed by a `title: Get started` heading
(a setext `h2`). `remark-frontmatter` is the plugin that parses the block
and keeps it out of the rendered document. It is not installed; `yaml` is
already in `node_modules` (a transitive dependency).

The same applies to the dev MDX editor, which compiles in the browser with
`@mdx-js/mdx`'s `evaluate` (`compileMdx.ts`): it needs `remark-frontmatter`
too, and its source-line plugin must treat the frontmatter node (`yaml`) as
"draws nothing" (`UNDRAWN`), so no scroll marker is put before it. Line
numbers are unaffected — the frontmatter is a node in the tree like any
other. (With the editor's Metadata tab, §7, the Content tab holds only the
body, so this is a safety net for frontmatter pasted into it.)

### 3.2 The obvious way to read frontmatter breaks code-splitting

The Docusaurus-style recipe is `remark-mdx-frontmatter` (which adds
`export const frontmatter = {…}` to the compiled module) plus

```ts
import.meta.glob("./articles/**/*.mdx", { eager: true, import: "frontmatter" });
```

That makes every article a **static** import. Rollup puts a module imported
both statically and dynamically into the static chunk, so every article's
body — and the PGNs it imports — would land in the main bundle. Reading the
sources with an eager `?raw` glob and parsing YAML in the browser has the
same problem (every article's text ships).

**What works:** a small Vite plugin that answers a `?frontmatter` query on an
`.mdx` with only the parsed metadata:

```ts
// articles.ts
const metadata = import.meta.glob<ArticleFrontmatter>(
  "./articles/**/*.mdx",
  { query: "?frontmatter", eager: true, import: "default" },
);
```

`x.mdx?frontmatter` is a different module id from `x.mdx`, so the lazy
chunks stay exactly as they are and the main bundle carries only the
metadata. `vite.config.ts` already special-cases `?raw` on `.mdx` the same
way (so the MDX compiler leaves it alone). In dev, Vite's glob HMR picks up a
new file and a changed one — no custom watcher, which a `virtual:` module
would need.

The plugin is also the right place to **validate**: a missing title, an
unknown key, a wrong type or a language outside `supportedLanguages` fails
the build with the file's name, rather than surfacing as a blank sidebar row.

### 3.3 Everything downstream can stay as it is

If `BLOG_ARTICLES` keeps its shape (`BlogArticleEntry`: `path`, `title`,
`summary` as `LocalizedText`) but is **built from the frontmatter** instead
of written by hand, none of its readers change — sidebar, index pages,
`BlogArticle`, `Home`, the editor's picker. That is what makes the feature
safe to land in steps.

### 3.4 `BlogArticle` already resolves its article from the URL

`BlogArticle.tsx` reads `useLocation().pathname`, strips `/blog/` and looks
the path up in the registry. It does not need a route per article — which
matters for requirement 3 (§6.2).

## 4. Requirement 1 — the metadata

### 4.1 The schema

```mdx
---
title: Every screen as cards
summary: "<NavCards>: the app's screens, by section."
order: 70
date: 2026-09-14
updated: 2026-10-01
tags: [components, navigation]
draft: false
description: The app's screens as cards, grouped by section.
---

## Cards

<NavCards />
```

| Key | Type | Required | Who carries it | Used by |
| --- | --- | --- | --- | --- |
| `title` | string | yes | **every file**, in its own language | `h1`, page title, breadcrumbs, sidebar, index cards |
| `summary` | string | yes | every file, in its own language | index and folder cards |
| `description` | string | no | every file, in its own language | `<meta name="description">` (new) |
| `order` | number | no | the **English** file only | **pins** an article to the top of its folder (§4.3) |
| `date` | ISO date | no | English only | "published" line; **the folder's sort**, newest first (§4.3) |
| `updated` | ISO date | no | English only | "updated" line |
| `tags` | string[] | no | English only | a future tag page / filter |
| `draft` | boolean | no | English only | `true` → shown in `yarn dev`, absent from the build (§4.4) |
| `image`, `imageAlt` | path, string | no — `imageAlt` required with `image` | the English file; a translation may override both (an image with text in it) | the share preview, `og:image` / `og:image:alt` — the first level of the share-image chain (`static-pages-proposal.md` §6) |
| `slug` | — | **not offered** | — | see §6.1 |

**Text keys** (`title`, `summary`, `description`) belong to each
translation. **Structural keys** (`order`, `date`, `updated`, `tags`,
`draft`) belong to the article, so they live once, in the English file; a
translation that repeats one fails validation, so two files can never
disagree about where an article sits or whether it is a draft.

The type lives beside `BlogArticleEntry` in `articles.ts`; the plugin
validates against it, and `articles.test.ts` checks the built registry
(every article has an English title and summary, every `order` is a number,
every language is supported).

### 4.2 Folders — an `index.mdx` per folder (decided)

`BLOG_FOLDERS` has no file to live in, so **each folder gets an
`index.mdx`** (`articles/tournaments/index.mdx`, and `index.he.mdx` for its
Hebrew title): its frontmatter is the folder's `title`, `summary` and
`order`, and its body — optional — is an introduction shown above the
folder's list at `/blog/tournaments`. Folder metadata then works exactly
like an article's, translations included (a frontmatter-only
`index.he.mdx`, §5.1, translates just the name).

- `index` becomes a **reserved name**: no article may be called `index`.
- A folder with no `index.mdx` is titled by its path segment (what the MDX
  editor's tree already does for an unregistered folder), and validation
  warns, so a forgotten one is noticed.
- `articles/index.mdx`, at the root, is the Blog index's own introduction
  at `/blog` — optional.
- A folder's `index.mdx` takes no `date`, `tags` or `draft`; folders sort
  by `order`, then by title (they have no date).

### 4.3 Order — sorted by date, `order` only pins (decided)

Within a folder:

1. **Pinned articles first** — those with an `order`, ascending.
2. **Then the rest by `date`, newest first.**
3. Articles with neither, last, by title.

A blog-like folder (*Tournaments*) then needs no maintenance — a new
article sorts itself in by its date — and a sequence that must read in a
fixed order (*Writing an article*'s how-to and demos) pins every article.

**Migration consequence:** none of the 29 articles has a date today, and
`articles.test.ts` asserts today's order. So step 3 of the plan (§8) gives
the *Writing an article* articles an `order` reproducing today's sequence,
and the *Tournaments* articles their real dates — each tournament's, read
from its PGN's `Date` / `EventDate` tags — **and lets them reorder newest
first** (decided): `articles.test.ts`'s expectation for that folder is
updated to the new order, deliberately. `get-started` — the front page — is
pinned at the root.

### 4.4 Drafts — hidden from the build only (decided)

- **`yarn dev`:** a draft is everywhere a published article is — sidebar,
  index, its route, the MDX editor — marked with a "Draft" chip beside its
  title, so it can be read in place before it ships.
- **`yarn build`:** a draft is absent — no sidebar row, no index card, no
  route (its address shows "no such article"), no browser-pass entry.

The catch is the **body**: the article glob in `articles.ts` is lazy, and
Rollup emits a chunk for every file a glob names, whatever the code later
does with it — filtering the registry alone would still ship every draft's
text in `dist/`. So in a production build the plugin also answers a draft's
plain `x.mdx` with an empty module. Verified the way the Development section
is (`chessboard.md` §9.5): after `yarn build`, grep `dist/` for a draft's
path and a phrase from its body. A test fixture draft makes that a CI check.

A translation inherits its article's `draft` (the key lives only in the
English file, §4.1).

## 5. Requirement 2 — languages, and each translation its own title

**Yes — each translation carries its own title.** `x.mdx` holds the English
`title` and `summary`; `x.he.mdx` holds the Hebrew ones; a new `x.fr.mdx`
holds the French. The registry is assembled per path:

```ts
// what the plugin's output is folded into, per article
{
  path: "writing-an-article/components/nav-cards",
  title:   { en: "Every screen as cards", he: "כל המסכים ככרטיסים" },
  summary: { en: "…", he: "…" },
  order: 70, date: "2026-09-14", tags: […], draft: false,
  bodies: { en: true, he: false },   // which languages have a body of their own
}
```

— the same `LocalizedText` shape as today, so `localizedText(title,
language)` and its English fallback keep working unchanged.

### 5.1 The catch: titles translated before the body

Today all 29 articles have a Hebrew title and summary and **none** has a
Hebrew body. If a title can only live in a translation file, those Hebrew
titles have nowhere to go. Proposal: a **frontmatter-only translation**.

```mdx
---
title: כל המסכים ככרטיסים
summary: "<NavCards>: מסכי האפליקציה לפי אזורים."
---
```

A `x.he.mdx` with frontmatter and an **empty body** means "the title is
translated, the body is not": the sidebar, the index and the `h1` show the
Hebrew title, and the body falls back to the English document, pinned LTR
with `lang="en"`, exactly as an untranslated article is shown today. The
plugin reports whether a body is empty (`bodies` above); `articleDocument`
consults it.

Migrating today's registry is then mechanical: 29 English files gain their
frontmatter, and 29 frontmatter-only `.he.mdx` files are created — a script
can write all of them from `BLOG_ARTICLES`.

### 5.2 An article with no translation at all — its title marked `lang="en"` (decided)

No `x.fr.mdx` → the French reader sees the English title and the English
body. The body is already pinned LTR with `lang="en"`; **the title is
marked the same way in the sidebar and on the index pages** (decided), so a
screen reader switches voice and the text runs left to right inside a
right-to-left list.

Today's `localizedText` returns only the string, so the row cannot tell
which language it got. The change:

- a sibling helper in `lib/localizedText.ts`, `localizedTextOf(text,
  language) → { text, language }` — `localizedText` itself unchanged (a
  shared piece changes only backward compatibly);
- the sidebar's data label (`navLabel` in `navTree.ts`, rendered by
  `Sidebar.tsx`'s `TreeRow`) and the index cards (`BlogIndex.tsx`) put
  `lang="en"` and `dir="ltr"` on the label's element when the language
  differs from the reader's — the `dir` attribute, not CSS, which the RTL
  stylis plugin would flip;
- **decided:** the article's own `h1` and its breadcrumb get the same
  mark (`BlogArticle.tsx`) — they show the same English text, and WCAG 2.2
  SC 3.1.2 *Language of Parts* (level AA, this app's target) asks for the
  mark wherever a passage is in another language than the page; marking
  the sidebar but not the `h1` would leave the most prominent copy read in
  the wrong voice. `document.title` is a plain string and cannot carry one.

Why both attributes: under Hebrew the page is `<html lang="he" dir="rtl">`.
Without `lang="en"` a screen reader reads "Every screen as cards" with its
Hebrew voice, as if it were Hebrew; without `dir="ltr"` the bidi algorithm
moves an English title's punctuation to the wrong end in a right-to-left
row — "Arrows and circles: [%cal] and [%csl]" comes out scrambled.

The same applies to a folder whose `index.<xx>.mdx` is missing.

### 5.3 Adding a language

1. `src/locales/<xx>.ts`, an entry in `supportedLanguages`, and — if it
   mirrors — `rtlLanguages` (unchanged from today).
2. `<path>.<xx>.mdx` files, as many or as few as are translated — each one
   either a full translation or a frontmatter-only title.

No registry edit, no code edit. Validation rejects a suffix that is not a
supported language (today a stray `x.fr.mdx` would be silently unreachable).

**A coverage report** comes for free: the manifest knows, per language, which
articles have a title and which a body — a test or a `yarn` script can print
"he: 29/29 titles, 0/29 bodies".

## 6. Requirement 3 — paths, at hundreds of articles

### 6.1 The address is the file's path

`/blog/<path>` is `articles/<path>.mdx`, as today: the folder tree on disk
*is* the URL tree, and there is nothing to keep in sync. **No `slug` key**:
an override is a second name for every article, and two files can then claim
one address. A renamed or moved article that must keep its old links gets
`redirectFrom: [old/path]` in its frontmatter (validated unique across the
Blog), and the article route redirects.

### 6.2 One route for every article

Replace the per-article lines in `routes.tsx` with the existing `/blog/*`
splat, rendering a small dispatcher: the path names an article →
`BlogArticle`; a folder → `BlogIndex`; a `redirectFrom` → `<Navigate>`;
else the "no such article" message. `BlogArticle` already reads its path
from the URL (§3.4), so it is unchanged.

The one wrinkle is the page title: a route's `handle.title` is one static
key, and today folders say `pages.blog` while articles say
`pages.blogArticle`. Two ways:

- **A. One static key, the screen names the page.** The splat's handle is
  `{ ...ARTICLE_ROUTE, title: "pages.blog" }`; the article or folder screen
  reports its own name through `usePageTitle`, as it already does. Titles
  become "Every screen as cards — Blog — Chess Trainer App" (today "… —
  Article — …") and "Components — Blog — …" (unchanged). `pages.blogArticle`
  leaves both catalogs.
- **B. A title chosen per match.** `handle.title` becomes a key *or* a
  function of the match, and the shell's `titleKeyOf` (`routeHandle.ts`)
  calls it — the function looking the path up in the Blog's registry.

**Decided: B, in a generic form — `handle.meta(match)`.** Every route may
carry an optional `meta` function in its handle, returning the page's
metadata from the match alone:

```ts
type PageMeta = {
  title?: string;        // the page-specific part — "Every screen as cards"
  titleLanguage?: AppLanguage;  // when it is not the reader's (§5.2)
  description?: string;
  image?: string;
  canonicalPath?: string;
  alternates?: Partial<Record<AppLanguage, string>>;  // hreflang
};
handle: { ...ARTICLE_ROUTE, title: "pages.blog", meta: blogPageMeta }
```

The shell calls it generically — it never imports the Blog's registry;
the Blog's route supplies `blogPageMeta`, which looks the path up in the
frontmatter manifest. A route without `meta` behaves as today (its
`handle.title`, and a screen's `usePageTitle`), so nothing else changes.

**Why B and not A** (A: one static key, the screen pushes its name up
through `usePageTitle`). A is the pattern the Library's game route uses
today, and in the browser it works. But it cannot produce **static pages**
(`docs/static-pages-proposal.md`): `usePageTitle` hands the name up in a
`useLayoutEffect` (`pageTitle.ts`) and the shell writes `document.title` in
a `useEffect` (`Layout.tsx`) — effects never run when a page is rendered to
HTML at build time, and the shell renders before the screen anyway. A
pre-rendered article would always be titled "Blog — Chess Trainer App",
with no description or share image. B's metadata is a pure function of the
URL and the manifest, so the browser render, the build-time render, the
sitemap and the social-preview tags all read the same thing.

With it, the shell **renders** the head rather than setting it in an
effect: React 19 hoists a `<title>`, `<meta>` or `<link>` rendered anywhere
in the tree into `<head>`, in the browser and in a static render alike. So
`Layout.tsx` renders `<title>{title}</title>` (and the meta tags) from
`handle.meta` → `handle.title` + `usePageTitle`, in that order. Within this
proposal only the title is needed; the other `PageMeta` fields are filled
in by the static-pages work.

### 6.3 The browser pass cannot visit hundreds of articles under every theme

`e2e/a11y/routes.ts` lists every article, and each runs under every theme ×
scheme × language — about 25 minutes for the whole app today. At hundreds of
articles that does not scale, and most articles are the same components on
different data. Proposal:

- **Every article once**, in a reduced matrix (one theme, light, English and
  Hebrew) — an article-level check: it renders, its embeds resolve, no axe
  violation in its own content.
- **A representative sample** — one article per component family, plus the
  front page — in the full matrix, listed by hand as today.
- The list is **generated** from the files: Playwright runs in Node, so a
  helper reads `src/views/blog/articles/**/*.mdx` with `fs` and the same
  frontmatter parser the plugin uses (one module, imported by both). No
  hand-kept list to drift.

### 6.4 The sidebar at hundreds

Today every article is a sidebar row. Folders keep it navigable (one open
chain at a time), but a folder of 150 articles is a 150-row list. Options,
from least to most change:

- cap a folder at *N* rows in the sidebar, newest or lowest `order` first,
  with "All 150 articles →" linking to the folder's index page;
- show only folders in the sidebar beyond a depth, the articles on the index
  pages;
- page or filter the index pages (by `tags`, by `date`).

Not needed at 29 articles; worth choosing before the first folder passes
~30.

### 6.5 Bundle size of the metadata

The manifest is eager, so it grows with the Blog: roughly 200–400 bytes per
article per language. 300 articles × 3 languages ≈ 300 KB raw, ~60 KB
gzipped — acceptable but not free. If it matters, the plugin can split it:
the eager part keeps only what the sidebar needs (path, title, order,
draft), and summaries load with the index page that shows them. Measure
with `yarn build` before optimising.

### 6.6 Adding an article, after

| Step | Today | After |
| --- | --- | --- |
| The `.mdx` | ✓ | ✓ — with its frontmatter |
| `articles.ts` entry | ✓ | — |
| `routes.tsx` line | ✓ | — |
| `e2e/a11y/routes.ts` line | ✓ | — (generated; a hand entry only to add it to the full-matrix sample) |
| A translation | a `.he.mdx` + its title in `articles.ts` | a `.he.mdx`, with its own title |

## 7. The MDX editor — a Content tab and a Metadata tab (decided)

The editor (`src/views/dev/mdxEditor/MdxEditor.tsx`) today is one textarea
(the whole file) beside the live preview. The left pane becomes **two
tabs**, the design system's tabs (the MUI lock forbids MUI's own in a
screen):

```
┌ MDX editor ─ Open an article… ─ Copy MDX ─ Download .mdx ─ New article ┐
│ [ Content | Metadata ]              │ Preview        Up to date  ◉ Scroll │
│                                     │ ┌─────────────────────────────────┐ │
│  Content:  the body only            │ │ Every screen as cards   [Draft] │ │
│  Metadata: the frontmatter          │ │ 14 Sep 2026 · updated 1 Oct     │ │
│                                     │ │ ─────────────────────────────── │ │
│                                     │ │ ## Cards …                      │ │
└─────────────────────────────────────┴─┴─────────────────────────────────┴─┘
```

**Splitting and joining.** Opening a file splits its text into the
frontmatter and the body, with the one parser the plugin uses (§3.2).
**Copy** and **Download** join them back — `---`, the YAML, `---`, a blank
line, the body — so what leaves the editor is one `.mdx` file, as today.
The session draft keeps both parts; "changed" compares the joined text with
the file as opened.

**The Content tab** is today's textarea, holding the body only. Compile
errors and the scroll-sync markers speak its own line numbers, which are
then the body's, not the file's — consistent within the tab, which is all
the reader sees. A body that starts with a `---` block (pasted from a file)
gets a notice offering to move it into Metadata.

**The Metadata tab** is a form built from the schema (§4.1), validated live
by the same validator the build runs, so an error the build would raise
shows while typing, against its field:

| Field | Control | Notes |
| --- | --- | --- |
| `title`, `summary`, `description` | text fields | required ones marked; summary and description multi-line |
| `order` | number field, empty = not pinned | |
| `date`, `updated` | date fields | |
| `tags` | chips input | |
| `draft` | switch | **a new article starts as a draft**, dated today |

**A raw-YAML view beside the form** (decided). The Metadata tab has a
*Form | YAML* switch; both edit the one frontmatter document:

- the **YAML** view is a monospace textarea holding the frontmatter as it
  will be written — for a key the form does not have yet, a comment, or a
  paste from another file;
- an edit in either view shows in the other — both go through the `yaml`
  library's document model, which keeps comments, key order and unknown
  keys rather than rewriting them;
- YAML that does not parse keeps the reader in the YAML view, with the
  parser's error and its line, until it does; the form is disabled
  meanwhile (it has nothing to show);
- a key the schema does not know is kept, and flagged — in the form as a
  read-only "unknown key `x` (kept)" row, in the build as a validation
  error unless it is added to the schema.

What the form shows depends on the file:

- **an article's English file** — every field;
- **a translation** (`x.he.mdx`) — the text fields only; `order`, `date`,
  `tags` and `draft` shown read-only, from the English file's metadata (the
  manifest already has it), so the translator sees where the article sits
  without being able to contradict it (§4.1);
- **a folder's `index.mdx`** — `title`, `summary`, `order` (§4.2).

**The preview** draws the article's header as the article screen does:
the `title` as its `h1`, the date line, a "Draft" chip — read from the
Metadata tab live, so a title change shows at once. (Breadcrumbs and the
sidebar row are not previewed.)

**Scroll together** applies in the Content tab; in the Metadata tab the
preview stays at its top, where the header is.

**Cost:** `yaml` joins `@mdx-js/mdx` in the editor's dev-only chunk — nothing
of it ships.

## 8. Plan

Each step lands green on its own; the readers of `BLOG_ARTICLES` never
change.

1. **Parse and strip.** Add `remark-frontmatter` to the build and to
   `compileMdx.ts` (`yaml` in `UNDRAWN`). Frontmatter is now allowed and
   invisible; the registry is still hand-written. Test: an article with a
   frontmatter block renders without it; the editor's line markers hold.
2. **The manifest.** The `?frontmatter` plugin, the schema and its
   validation, one parser module shared with the e2e helper. Test: the
   plugin's output for valid and invalid files; `yarn build` keeps one chunk
   per article (assert no article body in the entry chunk).
3. **Move the metadata.** A one-off script writes the frontmatter into the
   29 English files and creates the 29 frontmatter-only `.he.mdx`;
   `BLOG_ARTICLES` is built from the manifest, sorted as §4.3 says — the
   *Writing an article* articles pinned with an `order` reproducing today's
   sequence, the *Tournaments* ones dated. `articles.test.ts`'s order
   assertions pass unchanged, or change deliberately where newest-first
   reorders *Tournaments* — that is the proof nothing moved by accident.
4. **Folders** as `index.mdx` (§4.2), `BLOG_FOLDERS` built the same way;
   `index` reserved.
5. **The `lang="en"` mark** on a fallback title in the sidebar, the index,
   the `h1` and the breadcrumb (§5.2).
6. **One route.** The `/blog/*` dispatcher, `redirectFrom`, the per-article
   lines removed; `articles.test.ts` drops its route check. With it
   `handle.meta` (§6.2): the shell renders `<title>` from it instead of
   writing `document.title` in an effect — the shell's page-title tests
   (`pageStructure.test.tsx`, `Layout.test.tsx`) hold every other route's
   title unchanged.
7. **The browser pass** generated and split into the per-article and the
   sample matrices (§6.3).
8. **New metadata at work** — `date` / `updated` under the title,
   `description` in the page's meta, and **drafts**: the "Draft" chip in
   `yarn dev`, absent from the build, the empty-module answer for a draft's
   body and the `dist/` grep check (§4.4).
9. **The editor's tabs** — Content and Metadata, split and join, the form
   and its raw-YAML view, live validation, the previewed header (§7).
10. **Docs**: `guide.mdx` ("what else an article needs" becomes "its
    frontmatter"), CLAUDE.md's Blog rows, the comments in `articles.ts` and
    `routes.tsx`.

Steps 1–3 deliver requirements 1 and 2; 4–7 requirement 3 and the decided
details; 8–9 put the new metadata to work. §6.4's sidebar cap waits until a
folder needs it. Step 9 depends only on step 2 (the shared parser and
validator), so it can run beside 3–8.

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Metadata import drags bodies into the main bundle (§3.2) | The `?frontmatter` query; a build test asserting the entry chunk holds no article body. |
| YAML is untyped — a typo is silent | Validation in the plugin fails the build; the schema test in `articles.test.ts`. |
| Two files disagree (a translation sets `order`) | Structural keys only in the English file, enforced. |
| A frontmatter-only translation is mistaken for a translated body | The plugin reports an empty body; `articleDocument` falls back on it. |
| A move breaks old links | `redirectFrom`, unique across the Blog. |
| The editor shows frontmatter as text, or misplaces scroll markers | Step 1 changes `compileMdx.ts` with the build, in one commit. |
| Moving the title from an effect to a rendered `<title>` changes a shared piece (`Layout.tsx`) | `handle.meta` optional, every route without it titled as today; the shell's page-title tests unchanged. |
| A draft's text ships although its entry is filtered out | The plugin answers a draft's body with an empty module in a build; a fixture draft and a `dist/` grep check (§4.4). |
| The editor's Metadata form drops what it does not know — an unknown key, a YAML comment | Edit through the `yaml` library's document model, which keeps comments and unknown keys; validation flags an unknown key rather than deleting it. |
| The `lang` mark changes a shared piece (`navTree.ts`, `Sidebar.tsx`, `lib/localizedText.ts`) | Optional and additive: a new helper beside `localizedText`, a label without a language renders as today; every screen's tests pass unchanged. |

## 10. Decisions and open questions

### Decided (first review)

| # | Question | Decision | Where |
| --- | --- | --- | --- |
| 1 | Folders as `index.mdx`, or kept in `articles.ts`? | **`index.mdx` per folder** | §4.2 |
| 2 | Mark an English fallback title `lang="en"`? | **Yes — in the sidebar and on the index pages** (and, for consistency, the `h1` and the breadcrumb) | §5.2 |
| 3 | Sort a folder by `order` or by `date`? | **By `date`, newest first; `order` only pins** | §4.3 |
| 4 | Drafts? | **Wanted; hidden from the build only** — shown, marked, in `yarn dev` | §4.4 |
| 5 | The frontmatter in the MDX editor? | **A dedicated tab**: Content (the body) and Metadata (the frontmatter) | §7 |
| 6 | One route for the whole Blog? | **Yes** | §6.2 |

### Decided (second review)

| # | Question | Decision | Where |
| --- | --- | --- | --- |
| 7 | The Metadata tab: a form only, or with a raw-YAML view? | **A form with a raw-YAML view** | §7 |
| 8 | *Tournaments* under newest-first? | **Reorder newest first**; the test's expectation updated | §4.3 |
| 9 | The one route's page title | **B, generic: `handle.meta(match)`** — metadata from the URL and the manifest, rendered as `<title>` / `<meta>` elements, so static pages can carry it (`static-pages-proposal.md`) | §6.2 |

### Decided (third review)

| # | Question | Decision | Where |
| --- | --- | --- | --- |
| 10 | The `lang="en"` mark beyond the sidebar and index | **Also on the article's `h1` and breadcrumb** — WCAG 3.1.2, the same text in the most prominent place | §5.2 |
