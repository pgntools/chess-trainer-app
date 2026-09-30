# Settings — Export, Import, Storage

`src/views/settings/`: one screen, one tab per concern, each tab a route
(`/settings/export`, `/settings/import`, `/settings/storage`). The references
are [`.claude/rules/settings.md`](../../.claude/rules/settings.md) and
[`import-export.md`](../../.claude/rules/import-export.md). Template and
families: [`README.md`](./README.md).

**Migrated onto the design system by CTA-109** (the pilot): each entry below
is marked with what replaced it, and describes the component as it was
([`migration.md`](./migration.md)). The Appearance tab (CTA-107) came after
this inventory; its legend is now `FieldLabel`, its theme cards stay its own.

**Documented in [`Shared.md`](./Shared.md), not here**: the Settings folder in
the sidebar (`SideBar`, pinned to the foot) and the right-panel slot.

---

### SettingsScreen

> **Migrated (CTA-109)** — `PanelTabs` — link tabs sized to their words (`fullWidth={false}`).

- **Name and location** — `SettingsScreen`, `src/views/settings/SettingsScreen.tsx`
- **Family** — tabs
- **MUI atoms** — Box, Typography, Tabs, Tab
- **What it does** — The title, a tab strip whose tabs are router links (`/settings/<id>`), and the active tab's content scrolling under it; an unknown tab redirects to the first. Adding a tab is one entry in `SETTINGS_TABS`.
- **API** — none (the route, `/settings/:tab`).
- **Used by** — `settings/SettingsMain.tsx`.
- **Tests** — `settings/Settings.test.tsx` (the redirect, `settings-tab-*`, `settings-tab-content-*`).
- **Styling** — column `gap: 1`; title `subtitle1` 700 `h1`; the strip `minHeight: 36`, `textTransform: none`, a bottom divider — `BoardPanel`'s strip without `fullWidth`, `minWidth: 0` and `px: 1`; the panel `flex: 1; minHeight: 0; overflowY: auto`.
- **Similar elsewhere** — the other tab strips ([tabs](./Shared.md#tabs)); the only one whose tabs are links (the others are local state).
- **Verdict** — module-specific but needs design consistency — the strip is a near-copy of the panel's; one `CompactTabs` would take a "links" mode.

### ExportTab

> **Migrated (CTA-109)** — the `ExportCategoriesForm` block (`CheckboxField`s with their counts); the button unchanged.

- **Name and location** — `ExportTab`, `src/views/settings/ExportTab.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, FormGroup, FormControlLabel, Checkbox, Button, Alert
- **What it does** — Four categories (collections, games, analyses, repertoires), each all or nothing, each with its count from the stores' snapshots ("…" until read); under Collections an "include shipped collections" box (off until Collections is ticked; the count grows with it); **Export** (off with nothing ticked, "Exporting…" while it runs) downloads one zip.
- **API** — none.
- **Used by** — `SettingsScreen`.
- **Tests** — `settings/Settings.test.tsx` (`settings-export-<category>`, `-<category>-count`, `-shipped`, `-run`, `-done`, `-failed`).
- **Styling** — column `gap: 2 pt: 1`; an intro `body2 text.secondary`; checkboxes at the default size, the shipped one `small` and indented `paddingInlineStart: 4`, its label a `body2`; each count `(N)` a `body2 text.secondary` span inside the label; Export `contained` (default size) with a download icon.
- **Similar elsewhere** — `ImportDialog`'s category list is the same checkbox-with-count row (in a dialog, with dividers); `AnalysisExport` (Analyses) is the other export form (switches, not checkboxes).
- **Verdict** — module-specific but needs design consistency — "a category with its count" is written here and in `ImportDialog`; a `CountedCheckbox` would serve both.

### Export result

> **Migrated (CTA-109)** — `InlineAlert` (success / error — an `alert`).

- **Name and location** — inline in `ExportTab`, `src/views/settings/ExportTab.tsx:175-186`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Alert
- **What it does** — "Saved as ‹file›" on success; a failure (a collection that cannot be read, a refused download).
- **API** — inline.
- **Used by** — `ExportTab`.
- **Tests** — `settings/Settings.test.tsx` (`settings-export-done`, `-failed`).
- **Styling** — `Alert severity="success"` / `"error"`, default variant.
- **Similar elsewhere** — the Import report (an `Alert` that is `success` or `warning`); the Library's Analyse notice (a filled `Alert` in a `Snackbar`).
- **Verdict** — module-specific but needs design consistency — one of three success `Alert`s in the app (with the Import report and the Library's Analyse snackbar), each styled differently.

### ImportTab

> **Migrated (CTA-109)** — `FileInputButton` (its input keeps `settings-import-input`).

- **Name and location** — `ImportTab`, `src/views/settings/ImportTab.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Button, LinearProgress, Alert (+ `ImportDialog`, `IncompatibleImportDialog`)
- **What it does** — **Choose file** (a `.zip`), then either the incompatible dialog or the choice dialog; on Import, re-reads and re-plans against the stores, writes (indexing uploaded collections with progress), and reports per category.
- **API** — none.
- **Used by** — `SettingsScreen`.
- **Tests** — `settings/ImportTab.test.tsx` (`settings-import-input`, `-dialog`, `-run`, `-done`, `-result-*`, the incompatible dialog).
- **Styling** — column `gap: 2 pt: 1`; the pick `Button component="label" variant="contained"` (default size) over `<input hidden>` accepting `.zip`; intro `body2 text.secondary`.
- **Similar elsewhere** — the PGN pickers ([upload / import flows](./Shared.md#upload--import-flows)).
- **Verdict** — module-specific but needs design consistency — the zip picker is the same label-button idiom as the PGN pickers; a shared `FilePickButton` would take `accept`.

### Import progress

> **Migrated (CTA-109)** — `ProgressLine`, its caption announced as it changes.

- **Name and location** — inline in `ImportTab`, `src/views/settings/ImportTab.tsx:136-152`
- **Family** — empty / loading / error state
- **MUI atoms** — Box, Typography, LinearProgress
- **What it does** — While reading or writing: a line ("Reading…", "Importing…", or "Indexing ‹collection›: done of total") over a bar — indeterminate, or determinate while a collection is indexed.
- **API** — inline.
- **Used by** — `ImportTab`.
- **Tests** — `settings/ImportTab.test.tsx` (through the flow; `settings-import-working` is not asserted).
- **Styling** — `body2 mb: 0.5` over `LinearProgress`.
- **Similar elsewhere** — the indexing blocks of `ImportOptionsDialog` (Library) and `MultiGameDialog` (Analyses): the same line-over-bar, determinate only, in a dialog.
- **Verdict** — share candidate — one `ProgressLine` (determinate or not) for the three.

### Import report

> **Migrated (CTA-109)** — the `ImportReport` block (`blocks/panels/`, an `InlineAlert`).

- **Name and location** — inline in `ImportTab`, `src/views/settings/ImportTab.tsx:154-170`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Alert, Box
- **What it does** — One line per category: added, replaced, skipped, folders created — or refused, or failed. `success` when every category is done, `warning` otherwise.
- **API** — inline (`resultText` at `:52` words each line).
- **Used by** — `ImportTab`.
- **Tests** — `settings/ImportTab.test.tsx` (`settings-import-done`, `settings-import-result-<category>`).
- **Styling** — `Alert` with a `Box` per line.
- **Similar elsewhere** — the Export result.
- **Verdict** — module-specific but needs design consistency — pairs with the Export result.

### ImportDialog

> **Migrated (CTA-109)** — the `ImportDialog` block (`blocks/dialogs/`): `BaseDialog`, `CheckboxField`, `RadioGroupField` (new) for every Merge / Override / Skip, `ExpandToggle`, `InlineAlert`; the caps a prop.

- **Name and location** — `ImportDialog`, `src/views/settings/ImportDialog.tsx:136`, with the inner `ConflictRow` (`:67`) and `choiceRadios` (`:56`)
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent (`dividers`), DialogActions, Box, Typography, Divider, FormControlLabel, Checkbox, RadioGroup, Radio, Chip, Collapse, IconButton, Alert, Button
- **What it does** — What to import and what a clash does: one row per category (those the zip lacks are off) with its count; under a ticked, clashing one Merge / Override / Skip and the clashing folders, each opening (a chevron) to a choice of its own shown as a chip; a live preview per category, the caps it would pass (refused), the played games' drops. Nothing written until **Import**.
- **API** — `fileName`, `dump`, `current`, `onCancel`, `onImport(choices)`. `ConflictRow`: `category`, `index`, `conflict`, `choice`, `own`, `onChoose`.
- **Used by** — `ImportTab`.
- **Tests** — `settings/ImportTab.test.tsx` (`settings-import-dialog`, `-<category>-tick`, `-choice`, `-conflict-*`, `-effective`, `-toggle`, `-preview`, `-refused`, `-games-drops`, `-shipped`, `-run`; Cancel is not asserted).
- **Styling** — `fullWidth maxWidth="sm"`, `dividers`; content column `gap: 1.5`; a `Divider mb: 1` between categories; the category's detail indented `paddingInlineStart: 4`; radios `row`, `small`, labels `body2`; the conflict's chevron rotated by an inline `style` (flipped under RTL), the folder path `body2` 600 `dir="auto"`, counts `caption`, the effective choice a `Chip size="small"` (outlined when inherited, filled when its own); the conflict's own radios indented `paddingInlineStart: 5`; refusals `Alert error`, drops `Alert warning`.
- **Similar elsewhere** — `FolderTreeTable` (Shared) — the same inline-style chevron rotation; `ExportTab`'s checkbox-with-count rows; `OpeningTreePgnDialog` (Library) — the other radio-then-options dialog.
- **Verdict** — module-specific but needs design consistency — the most complex dialog; its chevron and count rows are shared ideas written again.

### IncompatibleImportDialog

> **Migrated (CTA-109)** — the `IncompatibleImportDialog` block (`blocks/dialogs/`): `BaseDialog`, its links `LinkTarget`s.

- **Name and location** — `IncompatibleImportDialog`, `src/views/settings/IncompatibleImportDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Box, Typography, Link, Button
- **What it does** — A zip that cannot be imported: which problem, where each kind of PGN can still come in by hand (router links to the three upload screens), the `.pgn` files the zip holds; Close.
- **API** — `fileName`, `problem`, `pgnFiles`, `onClose`.
- **Used by** — `ImportTab`.
- **Tests** — `settings/ImportTab.test.tsx` (`settings-import-incompatible`, `-problem`, `-files`, `-close`, `-collections`).
- **Styling** — `fullWidth maxWidth="sm"`; content `gap: 1.5`; two `ul`s with `paddingInlineStart: 3 my: 0.5`; links `Link component={RouterLink} variant="body2"`; file paths `body2` in `fontFamily: "monospace"`, `dir="ltr"`.
- **Similar elsewhere** — the only dialog that is an error report; the only `Link` in a dialog.
- **Verdict** — module-specific but needs design consistency — its monospace is the plain `"monospace"`, not the notation stack.

### StorageTab

> **Migrated (CTA-109)** — the `StorageTable` block — two `DataTable`s, each database's section closed by `groupEnd`, a header on the browser table.

- **Name and location** — `StorageTab`, `src/views/settings/StorageTab.tsx` (the inline `browserRow` at `:131`)
- **Family** — table
- **MUI atoms** — Box, Typography, Table, TableHead, TableBody, TableRow, TableCell
- **What it does** — How much space the app's data takes: a two-row table of the browser's estimates (origin usage, IndexedDB — "not available" where the browser reports none), then the reader's data in four sections (engine games, analyses, repertoires, Library games) with an exact record count and an estimated payload; "…" while each read is out. Reads only.
- **API** — none.
- **Used by** — `SettingsScreen`.
- **Tests** — `settings/StorageTab.test.tsx` (`settings-storage-usage`, `-indexeddb`, `-<category>-records`, `-<category>-payload`, the bolder section line).
- **Styling** — `Table size="small"`, not sticky, no container; section headings `subtitle2 h2` (default weight); numbers `align="right"`, bytes `formatBytes` in `span dir="ltr"`; a section's last row carries `borderBottomWidth: 2` on its cells; notes `caption text.secondary`. The first table has no header row.
- **Similar elsewhere** — the other three tables ([the four tables](./Shared.md#the-four-tables)); `GameInfo` (Shared) is the other two-column key/value display.
- **Verdict** — module-specific but needs design consistency — a read-only report table; its header weight, the "…" cells and the right-aligned numbers are the conventions a shared table should decide.

---

## Left out, and why

| What | Why |
| --- | --- |
| `settings/SettingsMain.tsx` | Layout-only wrapper. |
| The three tabs' right-panel notes (`settings.export.panel`, `settings.import.panel`, `settings.storage.panel`) | A lone `Typography` each — the panel-note pattern of [`Shared.md`](./Shared.md#analysisplaceholder). |

---

## Consistency notes

- **tabs** — the only router-linked tab strip; the panel's sx minus
  `fullWidth`.
- **table** — `StorageTab` is the plain end of [the four tables](./Shared.md#the-four-tables):
  no sort, no paging, no sticky header, regular-weight headers, right-aligned
  numbers (as `FolderTreeTable`, unlike the two game tables).
- **form / settings group** — Export's checkboxes are default-sized with the
  sub-option `small`; "a category and its count" is written in both the Export
  tab and the Import dialog.
- **dialog** — both dialogs are `sm` with `fullWidth`, like the Library's
  import popup; `ImportDialog` alone uses `dividers`; neither has a destructive
  button.
- **feedback** — the Export and Import tabs report with inline `Alert`s
  (success, warning, error); the app's only other success `Alert` is the
  Library's Analyse notice, filled and in a `Snackbar`.
- **empty / loading / error state** — the import progress is a
  line-over-`LinearProgress`, the same block the Library's and the Analysis
  module's indexing dialogs write; the counts' "…" is the Storage tab's loading
  convention too.
- **upload / import** — the zip picker is the label-button-over-hidden-input
  idiom of the PGN pickers, `contained` at the default size like the Library's
  and the repertoires'.
