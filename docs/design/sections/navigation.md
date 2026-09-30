# Navigation — `src/design-system/components/navigation/`

Moving between places (CTA-108), from
[Shared.md → Navigation](../Shared.md#navigation). Import from
`components/navigation`.

Gallery: `/dev/design/navigation` — switch the direction to see the arrows
turn.

## BackButton

- **Purpose** — the back arrow that starts a header: an `IconAction` whose
  arrow **points the way back** — left in LTR, right under RTL (an inline
  `transform`, which the RTL stylis plugin leaves alone).
- **Props** — `label` (where it goes), `onClick?`, `link?`, `edge?` (default
  `start`), `testId` (the icon is `-icon`).
- **Variations** — a button; a link.
- **Replaces** — the `ArrowBack` icon buttons of the collection table, the
  Library game, Play with Engine, a repertoire folder and a repertoire game.

## Breadcrumbs

- **Purpose** — where the reader is in a nested tree: MUI's `Breadcrumbs`,
  every step above a link-styled button (or a real link), the current place
  text with `aria-current="page"`, names `dir="auto"`.
- **Props** — `crumbs: { id, label, onClick?, link? }[]`, `current`,
  `ariaLabel`, `separator?` (default `/`), `testId` (each crumb
  `<testId>-<id>`, the current one `-current`).
- **Variations** — a nested folder; the top alone; a chevron separator with
  the steps as links.
- **Replaces** — the hand-built `SavedFolderBreadcrumb`, and its missing last
  separator ([Shared.md → SavedFolderBreadcrumb](../Shared.md#savedfolderbreadcrumb)).

## ExpandToggle

- **Purpose** — a tree row's chevron: one rotation for every tree — closed, it
  points the way the text runs; open, down. `aria-expanded`, and its click
  never reaches the row.
- **Props** — `expanded`, `onToggle`, `label`, `controls?`, `testId`
  (`-icon`).
- **Variations** — closed, open.
- **Replaces** — the two chevron styles: the sidebar's `ExpandLess` /
  `ExpandMore` swap and `FolderTreeTable`'s rotated `KeyboardArrowRight`.

## NavDrawer

- **Purpose** — a navigation sheet: what a rail becomes under a narrow window
  (CTA-118). A temporary drawer off the *start* edge of the window (MUI reads
  the theme's direction, so it opens from the right under RTL) over a
  backdrop, holding whatever the rail held.
- **Props** — `open`, `onClose`, `label` (**required** — it is a modal
  `dialog`), `children`, `width?` (280 px, never more than 85 % of the
  window), `id?` (so its opener can point at it), `testId` (the surface
  behind it is `-root`).
- **Variations** — the shell's navigation, a wider sheet.
- **Accessibility** — a named `role="dialog"` with `aria-modal`; it keeps the
  focus while open and hands it back to its opener; Escape and the backdrop
  close it. The caller closes it on a navigation.
- **Replaces** — nothing: the shell had no narrow-window navigation at all
  (ACCESSIBILITY.md's reflow gap).
