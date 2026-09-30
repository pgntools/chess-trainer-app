# Menus — `src/design-system/components/menus/`

Menus (CTA-108), from [Shared.md → Menu](../Shared.md#menu). Import from
`components/menus`. Both carry the theme's direction as `dir`, and choosing
an entry closes the menu before the entry runs.

Gallery: `/dev/design/menus` — right-click the box, or click the button.

## ContextMenu

- **Purpose** — a menu at the pointer: dense, an optional heading, icons,
  rules between groups, a destructive entry in the error colour.
- **Props** — `position: { top, left } | null` (the pointer's `clientY` /
  `clientX`; `null` is closed), `onClose`, `entries: { id, label, icon?,
  onClick, disabled?, divider?, destructive? }[]`, `subheader?`, `testId`
  (entries `<testId>-<id>`, `-subheader`).
- **Variations** — with a subheader, icons and a destructive group; plain
  entries, one disabled.
- **Replaces** — `MoveContextMenu`'s `Menu`
  ([Shared.md → MoveContextMenu](../Shared.md#movecontextmenu)).

## AnchoredMenu

- **Purpose** — a menu hanging from a button, aligned to its inline end
  (right in LTR, left under RTL — `Popover` places by the page's sides, so the
  end is picked from the theme); entries that are actions or real links, the
  current one marked (`aria-current`).
- **Props** — `anchorEl: HTMLElement | null`, `onClose`, `entries: { id,
  label, icon?, onClick?, link?, selected?, disabled? }[]`, `testId`.
- **Variations** — link entries with the current one marked; action entries
  with icons.
- **Replaces** — `RepertoireGamesMenu` ([Repertoires.md](../Repertoires.md)).
