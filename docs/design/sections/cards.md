# Cards — `src/design-system/components/cards/`

Card grids (CTA-108), from [Shared.md → Card grid](../Shared.md#card-grid).
Import from `components/cards`. `RecordCard` and `FolderCard` are one shape
(`cardShell.tsx`): an outlined card, a **square** action area on top, then a
caption row whose two lines are always there — so in one grid a folder stands
exactly as tall as the boards beside it.

Gallery: `/dev/design/cards` — the previews are drawn in the theme's own
squares.

## CardGrid

- **Purpose** — as many columns as fit at a card size's least width, and
  **`gridAutoRows: max-content`** (an `auto` row in a box of definite height is
  stretched and squashes its cards — [`chessboard.md`](../../../.claude/rules/chessboard.md) §5).
- **Props** — `children`, `size?: "compact" | "medium" | "comfortable"`
  (160 / 220 / 260 px), `scroll?` (be the one scrolling region), `ariaLabel?`
  (a named `group`), `testId`.
- **Variations** — compact, medium, comfortable.
- **Replaces** — `savedListGridSx` / `cardSizeTrack` and Home's own grid
  ([Shared.md → The saved-list grid](../Shared.md#the-saved-list-grid-savedlistts-cardsizets)).

## RecordCard

- **Purpose** — a saved record as a card: the preview in a square that opens
  it, the name and its line, the actions and the pick.
- **Props** — `preview`, `name`, `caption?`, `onOpen?` / `link?`,
  `openLabel` (the square's accessible name), `actions?`, `pick?`
  (`indeterminate?` — CTA-147), `testId`
  (`-open`, `-name`, `-pick`).
- **Variations** — full; name only, opened by a link.
- **Replaces** — `SavedAnalysisCard` and `RepertoireCard`, the same card twice.

## FolderCard

- **Purpose** — a folder as a card: a large icon on a tinted square where a
  record card has its preview, then the same caption row.
- **Props** — `name`, `count?`, `onOpen?` / `link?`, `openLabel`, `icon?`,
  `actions?`, `pick?` (CTA-147: a lobby picks folders and records alike, a
  folder's covering its whole subtree), `testId`.
- **Variations** — with a count and an action; its own icon, no count; picked
  and partly picked.
- **Replaces** — `SavedFolderCard` (`minHeight: 140`, shorter than its
  neighbours) and `RepertoireFolderCard` (square, `action.hover`) — two
  differing folder cards.

## IconCard

- **Purpose** — a way somewhere as a card: an icon in the primary colour
  beside the label (and a line), the whole card one action area.
- **Props** — `icon`, `label`, `description?`, `onClick?` / `link?`, `testId`
  (`-open`).
- **Variations** — Home's cards in a medium grid; with a description, as a
  button.
- **Replaces** — Home's cards ([Shared.md → Home](../Shared.md#home)).
