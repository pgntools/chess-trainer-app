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
| `placeholders.ts` | **placeholder data**: the stored game the page embeds — swap it there |

## Writing the document

- **Markdown** is rendered in the theme's typography (`../frontPage/Prose.tsx`):
  `#` is the page's one `h1` — keep exactly one; `##` / `###` are its
  sections; a link to a path of the app (`[the Library](/library)`) is a
  router link. A comment is `{/* … */}` (HTML comments are not MDX).
- **The app's components** are available by name, with no `import`
  (`../frontPage/index.ts` maps them):

| Component | Props | What it shows |
| --- | --- | --- |
| `<NavCards />` | `headingLevel?: 2 \| 3` (default `2`) | every screen as a card, by section — built from `navTree()`, so a screen added to `navItems` appears with no edit here. Alone, it is the landing page as it was before CTA-126. |
| `<SampleBoards />` | — | the three demo boards (a game, a repertoire, a collection), each under an `h3` — put it under a `##` |
| `<SampleBoard />` | `sample: "game" \| "repertoire" \| "collection"` | one demo board, alone (embed each sample once: a board's id is the sample's) |
| `<StoredGameEmbed />` | `reference: string` | a stored game, by its `?game=` reference (`library/<collection>/<n>`, `analysis/saved/<id>`, `play/games/<id>`), to step through, with a link to the Analysis Board; one that names nothing says so |

A name not in that map fails the page when it renders. A new component is a
line in `../frontPage/index.ts` and a row here.

- **Text in a component** (its buttons, captions, the samples' titles) is the
  catalogs' (`home.*`, `demoBoard.*` in `src/locales/`), so it follows the
  language; the document's own prose is per document.
- **The demo data** is `src/data/frontPage/` — its README says how to swap a
  sample.

Check a change with `npx vitest run src/views/home` (the page renders, one
`h1`, axe) and `yarn build`.
