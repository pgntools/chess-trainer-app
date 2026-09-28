# Lists — `src/design-system/components/lists/`

Rows of saved things and pickers (CTA-108), from
[Shared.md → List](../Shared.md#list). Import from `components/lists`.

Gallery: `/dev/design/lists`.

## RecordRow

- **Purpose** — a saved record in a list: the name (`dir="auto"`) over a
  caption and an optional italic description, then Open (contained), the
  record's other actions and its pick, over a bottom divider.
- **Props** — `name`, `caption?`, `description?`, `primaryAction?: { label,
  onClick? | link? }`, `actions?`, `pick?: { checked, onToggle, label }`,
  `testId` (`-name`, `-open`, `-pick`).
- **Variations** — full; name and caption only; Open as a link, no pick.
- **Replaces** — `SavedAnalysisRow` ([Analyses.md](../Analyses.md)) and
  `RepertoireRow` ([Repertoires.md](../Repertoires.md)) — the same row twice,
  only one of them with `dir="auto"`.

## FolderRow

- **Purpose** — a folder in a list: one button over the icon, the name and the
  count (a drill-in or a real link), and the folder's actions at the row's end
  **outside** the button (MUI's `secondaryAction` role), laid out in flow so
  any number fit.
- **Props** — `name`, `count?`, `onOpen?`, `link?`, `icon?`, `actions?`,
  `testId` (`-open`, `-actions`).
- **Variations** — four actions; a link with its own icon and no actions.
- **Replaces** — `SavedFolderRow` (`onClick`, actions in a `Box`) and
  `RepertoireFolderRow` (a `Link`, `secondaryAction`, a fixed
  `paddingInlineEnd: 8.5rem`) —
  [Shared.md → SavedFolderRow / SavedFolderCard](../Shared.md#savedfolderrow--savedfoldercard).

## PickerList

- **Purpose** — pick one from a list: dense rows, the chosen one selected and
  `aria-current`, a tree's depth as an indent from the inline start (`2 +
  depth × 2.5`), icons with a logical gap; optionally framed and scrolling.
- **Props** — `items: { id: string | null, label, depth?, icon?, disabled?
  }[]` (`null` is the "none" row), `value: string | null | undefined`,
  `onChange(id)`, `ariaLabel`, `maxHeight?`, `testId` (rows `<testId>-<id>`,
  the none row `-none`).
- **Variations** — a folder tree; framed and scrolling with a row disabled.
- **Replaces** — `FolderPicker`'s list (its physical `mr: 1.5`) and the
  repertoire settings' hand-built `FolderSection`
  ([Shared.md → FolderPicker](../Shared.md#folderpicker)).
