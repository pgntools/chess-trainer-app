---
paths:
  - "src/views/settings/**"
---

# Settings — `/settings/<tab>`

The app's own settings (CTA-86): one screen, **one tab per concern**, each tab
a route segment. Six tabs today — **Export** and **Import** (the reader's
data out as one zip and back in — everything about them, the zip, the
manifest, the layers, conflicts, caps, migrations, is
[`import-export.md`](./import-export.md)), **Storage** (how much space the
app's data takes, CTA-94), **Appearance** (the theme, CTA-107) and **Engine**
(which engine every board runs, CTA-153) and **Support** (how to reach us, CTA-155). This file is the section.

## 1. The section

| Piece | File | What it is |
| --- | --- | --- |
| Route | `routes.tsx` — `/settings` and `/settings/:tab` | Both render `SettingsMain.tsx`; `/settings` and an unknown tab redirect to the first tab (Export). |
| Screen | `views/settings/SettingsScreen.tsx` | The title, a tab strip (each `Tab` a `RouterLink` to `/settings/<id>`), the active tab's content scrolling under it. |
| Tabs | `SETTINGS_TABS` in `SettingsScreen.tsx` (the strip `PanelTabs`, its tabs links) | `export` → `ExportTab.tsx` (the `ExportCategoriesForm` block), `import` → `ImportTab.tsx` (the `ImportDialog`, `IncompatibleImportDialog` and `ImportReport` blocks), `storage` → `StorageTab.tsx` (the `StorageTable` block), `appearance` → `AppearanceTab.tsx`, `engine` → `EngineTab.tsx` (the `EnginePicker` and `EngineServerForm` blocks), `support` → `SupportTab.tsx` (the logo, a line and a numbered, emoji-led list: a GitHub issue, an email). The blocks are in `src/blocks/` (CTA-109, [`docs/design/migration.md`](../../docs/design/migration.md)). |
| Nav | `navFolders()` — `settings` (`nav.folders.settings`, `pinToBottom`); `navItems()` — one entry per tab (`nav.settingsExport`, `nav.settingsImport`, `nav.settingsStorage`, `nav.settingsAppearance`, `nav.settingsEngine`, `nav.settingsSupport`) | A folder, **not** `singleEntry`, so a tab is one more entry in it. Pinned to the sidebar's foot, under a divider, apart from the screens (`Sidebar.tsx`). |
| Locale | `settings.*` in `en.ts` / `he.ts` | `settings.title`, `settings.tabs.<id>`, then each tab's own block (`settings.export.*`, `settings.import.*`, `settings.storage.*`, `settings.appearance.*`, `settings.engine.*`). The themes' own names are `appearance.themes.<id>`; the picker's words are `enginePicker.*`. |

**Adding a tab**: an entry in `SETTINGS_TABS` (`SettingsScreen.tsx`), a
`navItems()` entry in the `settings` folder at `/settings/<id>`, and
`settings.tabs.<id>` plus its `nav.*` label in both catalogs. A tab's content
is a flex column in the scrolling tab panel, and its words for the right-hand
panel go in a `RightPanel`.

## 2. The Storage tab

`/settings/storage` (CTA-94) — how much space the app's data takes on this
device, per the research in `docs/indexed-db.md`:

- **Browser storage**: the origin's usage and, where the browser reports it,
  the IndexedDB portion — all `navigator.storage.estimate()` figures, every
  label marked as an estimate. A number the browser does not report reads
  "not available", never zero. The quota is not shown; a note says it is in
  the browser's developer tools.
- **The reader's data, four sections** — one per database's heavy store:
  Engine games, Analyses, Repertoires, Library games — separated by a bolder
  line, each with its exact record count and its **estimated payload**
  (`lib/storageDiagnostics.ts`), never presented as a disk or IndexedDB
  size: the browser may compress, deduplicate and add index overhead, so
  payloads do not sum to what it reports. The folders and the collections'
  summaries are tiny beside what they file, and the shipped collections are
  fetched over HTTP, not stored: none of them is listed — the origin
  estimate's business only.

The counts and payloads are the stores' snapshots (the Export tab's pattern —
a subscription starts each read) and the Library's summaries, so nothing is
read twice. The Library's games are the bulk case and are **never read**: each
collection's games are estimated from its index rows (`loadUploadedRows`), a
game's PGN sized from its row (`estimatedGamePgnBytes`). Reads only: nothing
is written, and nothing throws.

## 3. The Appearance tab

`/settings/appearance` (CTA-107) — the reader's **theme**, one of the design
system's registered themes (`src/design-system/themes/registry.ts`):

- **A radio per theme**, in the registry's order, each with a preview in
  miniature: its light scheme, its dark scheme (page, a paper card, a line of
  text, the primary colour) and its board (two squares of each colour, one
  under the last-move fill). The previews are drawn from the theme's data, not
  by building it, so they do not depend on the theme in use.
- **A choice applies at once** — `useThemeChoice().setThemeId`
  (`theme/themeChoice.ts`) is `AppThemeWithLang`'s state, which rebuilds the
  MUI theme (`buildTheme`) and with it every screen and every board.
- **It is a preference**, so it is `localStorage` (`chessapp.theme`,
  [`database.md`](./database.md) §2), read once on mount. A stored id that
  names no registered theme — a retired theme, a hand edit — reads as
  `"default"`; storage that cannot be read or written only forgets the choice.
- **Light and dark are not a theme.** They stay the header's switch (MUI's
  colour scheme), under every theme; a theme carries both schemes. The tab
  says so under the list.

Nothing about the reader's data changes, and the Export zip does not carry the
choice (preferences are not data).

## 4. The Engine tab

`/settings/engine` (CTA-153) — which engine every board runs, from the
registry (`src/lib/engines/`, [`docs/engine.md`](../../docs/engine.md)):

- **The list is the `EnginePicker` block** (`blocks/forms/`) over
  `describeEngines()` — a radio per shipped engine (Stockfish 19 Lite,
  single-thread — the default — and multi-thread) with its name, version,
  single- or multi-thread and how its strength is set (Skill Level, Elo, or
  either), each the descriptor's own declaration. An engine **this page
  cannot run** — the multi-thread build where the host does not set COOP /
  COEP (`crossOriginIsolated`, read when the page loads, chessapp.dev sets them on every response, CTA-154; GitHub Pages cannot) — is **listed
  disabled and says why** ("Needs cross-origin isolation — not available on
  this host"); it is not hidden.
- **A choice applies at once** and is a preference: `lib/engineChoice.ts`,
  `localStorage` (`chessapp.engine`, [`database.md`](./database.md) §2), read
  through `views/shared/useEngineChoice.ts` (`useSyncExternalStore`, so every
  mounted board follows). Every board passes it as `useEngineModule({ engine })`
  — the Analysis Board, the Library's game and the Openings explorer
  (`useAnalysisSession`), the repertoire player, Play with Engine and Masked
  Pieces (`usePlayGame`) and the Lobby's new-game form — and so uses it from its
  next search; the old engine is terminated.
- **The store keeps the raw id; the tab and the boards read the resolved one**
  (`engineChoiceId()`): a stored id that names no shipped engine (the retired
  2019 build's `stockfish-2019-wasm` among them, CTA-160), or one this page
  cannot run, reads as the default — and **stays stored**, so the choice
  returns where the engine can run (another host). A write of an id the app
  does not ship is ignored, as an unknown theme is.
- **A game against the engine keeps its engine**: read once as the game begins,
  recorded on it, and a resumed game goes on with its own
  ([`play-with-engine.md`](./play-with-engine.md) §4) — changing the choice
  mid-way never swaps the engine under a game.
- **The Export zip does not carry it** — a preference is not data
  ([`import-export.md`](./import-export.md)); what a played game carries is the
  engine that played it.
- **The engine server on this computer** — the `EngineServerForm` block in
  the right-hand panel (`RightPanel`) ([`docs/engine.md`](../../docs/engine.md) §8): native Stockfish
  binaries served by `yarn api:start` (`server/engine-api/`). **Off by
  default, and while off nothing contacts any server** — a deployed site that
  probed `127.0.0.1` would probe every visitor's machine. On, its address
  (`chessapp.engineServer`, `lib/engineServer.ts`) is kept and checked
  (`GET /v1/engines`), the field's text the screen's own until Connect (or
  Enter) keeps and checks it — **each press answered on the button**: a
  spinner (at least 0.4 s, `CONNECT_MIN_CHECKING_MS`), then a check mark or a
  warning for 2 s. A chip beside the
  switch is the connection at a glance — *Connecting…*, *Connected · N ms*
  (the last check's round trip), *Not connected* — and the live region; under
  the field, when it last answered, or what to check with Try again. While it
  answers, its engines (`hosted:<id>`, `lib/engines/hosted.ts`) are **listed in
  the panel**, under it — a second `EnginePicker` ("Engines on this server")
  on the same choice; the tab's own list keeps the page's builds. Offline, they
  are gone, and a choice of one reads as the default — still stored, back when
  the server is.

## 5. Testing

- `views/settings/Settings.test.tsx` — the section (the landing redirect, the
  tabs' links) and the Export tab.
- `views/settings/ImportTab.test.tsx` — the Import tab.
- `views/settings/StorageTab.test.tsx` — the Storage tab.
- `views/settings/EngineTab.test.tsx` — the Engine tab over the real registry:
  the list and each engine's facts, the multi-thread build disabled with its
  reason (and selectable under a stubbed `crossOriginIsolated`), a choice
  applying at once and surviving a remount, a stored id that is gone or cannot
  run falling back without being discarded (the 2019 id too), the keyboard,
  Hebrew, axe. `src/lib/engineChoice.test.ts` — the store.
  `blocks/forms/EnginePicker/EnginePicker.test.tsx` — the block.
- `views/settings/AppearanceTab.test.tsx` — the Appearance tab, with a second
  theme registered by a mock of the registry: the list and previews, a choice
  applying at once (a board colour probe), surviving a remount, and a bad
  stored id falling back to the default.
- `src/lib/storageDiagnostics.test.ts` — the payload rules, the byte
  formatter, the browser estimate, the per-game estimate.
- `views/main/navTree.test.ts` — the Settings folder and its entries.

Both tab tests run over the real stores (fake-indexeddb); what the Import and
Export ones cover is [`import-export.md`](./import-export.md) §10. jsdom has
no `navigator.storage`, so the Storage tests stub `estimate()` themselves.
