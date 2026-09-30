---
paths:
  - "src/views/settings/**"
---

# Settings — `/settings/<tab>`

The app's own settings (CTA-86): one screen, **one tab per concern**, each tab
a route segment. Four tabs today — **Export** and **Import** (the reader's
data out as one zip and back in — everything about them, the zip, the
manifest, the layers, conflicts, caps, migrations, is
[`import-export.md`](./import-export.md)), **Storage** (how much space the
app's data takes, CTA-94) and **Appearance** (the theme, CTA-107). This file
is the section.

## 1. The section

| Piece | File | What it is |
| --- | --- | --- |
| Route | `routes.tsx` — `/settings` and `/settings/:tab` | Both render `SettingsMain.tsx`; `/settings` and an unknown tab redirect to the first tab (Export). |
| Screen | `views/settings/SettingsScreen.tsx` | The title, a tab strip (each `Tab` a `RouterLink` to `/settings/<id>`), the active tab's content scrolling under it. |
| Tabs | `SETTINGS_TABS` in `SettingsScreen.tsx` (the strip `PanelTabs`, its tabs links) | `export` → `ExportTab.tsx` (the `ExportCategoriesForm` block), `import` → `ImportTab.tsx` (the `ImportDialog`, `IncompatibleImportDialog` and `ImportReport` blocks), `storage` → `StorageTab.tsx` (the `StorageTable` block), `appearance` → `AppearanceTab.tsx`. The blocks are in `src/blocks/` (CTA-109, [`docs/design/migration.md`](../../docs/design/migration.md)). |
| Nav | `navFolders()` — `settings` (`nav.folders.settings`, `pinToBottom`); `navItems()` — one entry per tab (`nav.settingsExport`, `nav.settingsImport`, `nav.settingsStorage`, `nav.settingsAppearance`) | A folder, **not** `singleEntry`, so a tab is one more entry in it. Pinned to the sidebar's foot, under a divider, apart from the screens (`Sidebar.tsx`). |
| Locale | `settings.*` in `en.ts` / `he.ts` | `settings.title`, `settings.tabs.<id>`, then each tab's own block (`settings.export.*`, `settings.import.*`, `settings.storage.*`, `settings.appearance.*`). The themes' own names are `appearance.themes.<id>`. |

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

## 4. Testing

- `views/settings/Settings.test.tsx` — the section (the landing redirect, the
  tabs' links) and the Export tab.
- `views/settings/ImportTab.test.tsx` — the Import tab.
- `views/settings/StorageTab.test.tsx` — the Storage tab.
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
