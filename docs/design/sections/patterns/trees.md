# Trees patterns — `src/design-system/patterns/trees/`

The tree view (CTA-110): one collapsible tree for every tree the app draws —
the sidebar's navigation, the gallery's own menu, the reader's folders — and
a tree hung from a button for picking a node out of one. Import
from `patterns/trees`. Where a pattern belongs in the hierarchy:
[`hierarchy.md`](../../hierarchy.md).

Gallery: `/dev/design/patterns/trees/TreeView` and
`/dev/design/patterns/trees/TreePicker`. Its first block is
`FolderTree` (`/dev/design/blocks/trees/FolderTree`, `src/blocks/trees/`).

## TreeView

- **Purpose** — a collapsible tree in the sidebar's look: branches that open
  in place (a chevron, `aria-expanded`, the children mounted only while
  open), leaves that link or select, the node on screen marked
  (`aria-current="page"`, selected), each level set in by the **inline
  start** (`paddingInlineStart`: two units, two more per level — the
  sidebar's rule), so the tree mirrors under RTL. Nested lists (`ul > li >
  ul`), no `ForceLTR`.
- **WAI-ARIA's tree pattern** (CTA-111) — the root is a named `tree`, each
  row a `treeitem` (a link where the node has one) with its `aria-level`, a
  branch's row `aria-expanded` and owning its open `group` (`aria-owns`).
  **One tab stop** — the row last focused, else the node on screen, else the
  first. ↓ / ↑ move through the rows in view, Home / End to the first and
  last, → opens a closed branch or steps into an open one, ← closes an open
  branch or steps out to its parent — the two arrows swapped under RTL — and
  Enter follows the link, selects the node or opens a folder.
- **Nodes** — `TreeNode = { id, label, icon?, secondary? (a count at the
  row's end), link? (a LinkTarget), children? (a branch; `[]` is an empty
  one), selectable?, dir? }`.
- **Two kinds of branch** —
  - a **folder that only opens** (the sidebar's, the gallery's): the row is
    the toggle, and stays out of the link count;
  - a **destination** (`selectable`, or with a `link` — a folder whose
    contents can be shown): the row selects or links, and its chevron is a
    button of its own for the pointer (`-<id>-toggle`, `toggleLabel` its
    tooltip) — `aria-hidden` and out of the tab order, since → / ← open
    and close the branch from its row.
- **Props** — `nodes`, `open: ReadonlySet<string>` + `onToggle(id)`
  (controlled: the caller opens the chain to what is on screen, and keeps
  the rest as the reader left it), `activeId?`, `onSelect?(node)` (a
  selectable node with no link), `toggleLabel?(node, open)`, `ariaLabel`
  (required), `hint` (required, CTA-112 — how the tree is worked, "Up and
  down arrows to move, right to open, left to close, Enter to go.": read
  with the tree by a screen reader, its `aria-describedby`, out of sight; the
  app's words are `hints.tree`), `testId`.
- **Test ids** — `testId` (the root list), `-<id>` (a row), `-<id>-toggle`,
  `-<id>-group` (a branch's open children), `-hint`.
- **Also exports** `ancestorsOf(nodes, id)` — the branches above a node,
  outermost first: what to open so it is in view — and `visibleNodes(nodes,
  open)`, the rows in view top to bottom, each with its branch: what the
  keyboard walks.
- **Variations** (one demo each) — a menu opened on the page on screen;
  folders as destinations with counts; nothing open; long names (an
  ellipsis); Hebrew names (RTL); 1,000 leaves; empty.
- **Used by** — the design gallery's menu (`gallery/DesignGallery.tsx`), and
  the `FolderTree` block.
- **Replaces** — the sidebar's `TreeRow` (`src/views/main/Sidebar.tsx`) when
  the app shell migrates, and the folder pickers' indented lists.

## TreePicker

- **Purpose** — a `TreeView` hung from a labelled button, for picking a node
  out of a tree (an "Open an article" on a toolbar): the button opens the
  tree under itself, picking a node hands it to the caller and closes, and
  Escape or a click away closes it, the focus back on the button.
- **State** — the picker's own, and nothing else is the caller's: which
  branches the reader opens lives and dies with the popover, seeded each
  time it opens from the chain to `activeId` (the node on screen, its row
  marked as `TreeView` marks it), as the sidebar opens the route's chain.
  The caller gives the nodes and takes the pick.
- **Props** — `nodes`, `activeId?`, `onSelect(node)`, `label` (the button's
  words), `icon?` (before them), `treeLabel` (the tree's accessible name),
  `hint` (`TreeView`'s, required — how the tree is worked, read with it),
  `testId`.
- **Test ids** — `testId` (the button); the tree's are `TreeView`'s under
  `<testId>-tree` (`-tree` the root list, `-tree-<id>` a row,
  `-tree-<id>-toggle` a selectable branch's chevron, `-tree-<id>-group` its
  open children).
- **Variations** (one demo each) — the chain to the node on screen open, its
  row marked; nothing on screen, the branches closed; long names (an
  ellipsis).
- **Used by** — none yet; it was born as the MDX editor's article picker
  (`src/mdxEditor/client/`), which moved to a typed autocomplete
  (`SelectAutocomplete`) once its articles grew past browsing.
