# Toolbars — `src/design-system/components/toolbars/`

Actions and the bars they sit in (CTA-108), from
[Shared.md → Toolbar / action bar](../Shared.md#toolbar--action-bar). Import
from `components/toolbars`.

Gallery: `/dev/design/toolbars`.

## IconAction

- **Purpose** — an icon-only action: a small `IconButton` under its tooltip,
  named by the tooltip's words, **always in an inline-flex `span`** so a
  disabled one still shows its tooltip.
- **Props** — `label`, `children` (the icon), `onClick?`, `link?` (a
  `LinkTarget`: react-router's `Link` and `to`, or an `href`), `disabled?`,
  `pressed?` (a toggle: `aria-pressed`, primary while pressed), `color?:
  "default" | "primary" | "error"`, `edge?`, `testId`.
- **Variations** — default and error; disabled; a toggle; a link.
- **Replaces** — the 52 icon buttons' three span styles (`Box component="span"
  inline-flex`, a bare `span`, none) and the two named helpers, `MapButton`
  and the Library's `Action`.

## HintButton

- **Purpose** — a text button with a hint (CTA-116): a small `Button` under a
  tooltip that says what it does. Its visible words are its name (WCAG 2.5.3);
  the hint **describes** it — the button is `aria-describedby` a hidden copy of
  the hint, read after the name, and the tooltip is for the eyes. It always
  sits in an inline-flex `span`, so a **disabled** one still shows its tooltip.
- **Props** — `children` (the words), `hint`, `onClick?`, `link?` (a
  `LinkTarget`), `variant?: "text" | "outlined" | "contained"` (default text),
  `color?: "primary" | "success" | "error"`, `startIcon?`, `disabled?`, `busy?`
  (`aria-busy`, and a hidden spinner in the icon's place), `testId`.
- **Variations** — outlined, contained and success; disabled; busy; a link.
- **Replaces** — the same composition written three times: a collection's
  *Add games* (a link) and *Analyse* (disabled until something is picked, busy
  while it runs), and the changes strip's *Update* and *Save as copy*. It is
  why the MUI lock (`hierarchy.md`) needs no exception for a `Tooltip`.

## ToggleIconAction

- **Purpose** — the board header's Save: primary and `aria-pressed` while
  `active` (the board is dirty), quiet otherwise.
- **Props** — `label`, `children`, `onClick`, `active`, `disabled?`, `testId`.
- **Replaces** — the Save button written three times (`AnalysisBoard`,
  `LibraryGameBoard`, `RepertoirePlayer`).

## ListScreenHeader

- **Purpose** — a list screen's top bar: back, the title (`h1`) over its
  count, the actions, over a bottom divider; one spacing (`pb: 1.5`, `mb:
  0.5`, `gap: 1`).
- **Props** — `title`, `count?`, `back?` (a `BackButton`), `actions?`,
  `wrap?` (let the **title** wrap to a second line instead of ellipsis),
  `children?` (a second row), `titleDir?`, `testId` (`-title`, `-count`,
  `-actions`).
- **Variations** — title and count with one action; with back and a long
  reader-typed title; wrapping actions with a second row.
- **The row always wraps** (CTA-118) — the title box shrinks to nothing and
  the actions are pinned, so a narrow square used to crush the `h1` to zero
  width (WCAG 1.4.10, the reflow gate). The actions drop to a line of their
  own instead; with room for both, nothing wraps and no window that fits them
  changes.
- **Replaces** — the five list top bars and their three spacings
  (`PlayedGames`, `LibraryHome`, `CollectionScreen`, `SavedAnalyses`,
  `Repertoires`).

## ActionBar

- **Purpose** — a row of actions: wrapping, centred, an optional rule on one
  side; named, a `role="toolbar"`.
- **Props** — `children`, `divider?: "top" | "bottom" | "none"`, `justify?:
  "start" | "end" | "space-between"`, `dense?`, `ariaLabel?`, `testId`.
- **Variations** — divider on top with one action pushed to the end (board
  controls); dense under a divider (a map's toolbar); buttons at the end;
  spread apart.
- **Replaces** — the row layouts of `BoardControls`, the map's toolbar,
  `OpeningFilterBoard`'s back / reset / flip row and the panels' foot rows.

## ViewToggle

- **Purpose** — a list's view switch (list · compact cards · cards): an
  exclusive `ToggleButtonGroup` of icons, each named, its tooltip describing
  it (CTA-113).
- **Props** — `value`, `onChange`, `options` (`{ value, label, icon }`),
  `ariaLabel`, `testId` (each button `<testId>-<value>`).
- **Replaces** — `SavedListViewToggle` (Saved analyses, Repertoires).

## SelectionBar

- **Purpose** — what the picks of a list can do: a tri-state select-all, a
  chip counting the picks that clears them (Delete or Backspace on the chip;
  the cross is titled), the caller's actions (CTA-113). **Beside a table the
  select-all is left out** (all four of its props absent) — the table's
  header has one.
- **Props** — `checked?`, `indeterminate?`, `onToggleAll?`,
  `selectAllLabel?` (together or none), `count`, `countLabel`, `onClear`,
  `clearLabel`, `actions?`, `testId` (`-select-all`, `-selected-count`),
  `rootTestId?` (default `<testId>-export`).
- **Variations** — some picked, then all; nothing picked; beside a table.
- **Replaces** — `SavedListExportBar` (Saved analyses, Repertoires, a
  collection).

## CTA-113 additions

- `IconAction` — `popupOpen?` (a menu button: `aria-haspopup="menu"`,
  `aria-expanded`).
- `ToggleIconAction` — `pressed?: boolean | null`: `null` for a Save that
  opens a dialog, so it carries no `aria-pressed`.
- `ListScreenHeader` — used by every list screen; a title the tests read by
  its old id wraps it in a `span`.
