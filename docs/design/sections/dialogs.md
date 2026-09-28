# Dialogs — `src/design-system/components/dialogs/`

The dialog family (CTA-108): one base and the five shapes the app's 22 dialog
compositions reduce to. Import from `components/dialogs` only. Every dialog
takes `testId` (its root) and derives its parts' ids from it, takes every word
as a prop, and passes `dialogProps` (anything else MUI's `Dialog` takes —
`container`, `keepMounted`, …) through. Each carries the theme's direction as
`dir`, so a portalled dialog reads the right way under Hebrew.

Gallery: `/dev/design/dialogs` — every variation open in its own frame
(`gallery/DialogFrame.tsx`).

## BaseDialog

- **Purpose** — the dialog every dialog is built on: a title, a body, an
  actions row, at one of two widths, labelled by its title.
- **Props** — `open`, `onClose`, `title`, `children?` (the body, in
  `DialogContent`), `actions?` (in `DialogActions`), `width?: "xs" | "sm"`
  (default `xs`), `fullWidth?` (default `true`), `dividers?`, `testId`,
  `dialogProps?`. Ids: `<testId>`, `-title`, `-content`, `-actions`.
- **Variations** — `xs` / `sm`; full width or sized to the content; dividers
  (a scrolling body); no actions row.
- **Replaces** — the bare `Dialog` + `DialogTitle` + `DialogContent` +
  `DialogActions` stack of every entry in
  [Shared.md → Dialog](../Shared.md#dialog), and the "width: default vs `xs` /
  `sm` full" and "root test id: yes / no" differences it lists.

## ConfirmDialog

- **Purpose** — a question with two answers, Cancel then the confirm.
- **Props** — `open`, `onClose`, `onConfirm`, `title`, `message?` (one
  `DialogContentText`), `children?` (under it), `confirmLabel`,
  `cancelLabel`, `tone?: "default" | "destructive"`, `confirmVariant?:
  "contained" | "text"` (default contained), `busy?` (both buttons off, a
  spinner in the confirm, Escape ignored), `confirmDisabled?`, `width?`,
  `testId`, `dialogProps?`. Ids: `-message`, `-cancel`, `-confirm`.
- **Variations** — default / destructive tone; contained / text confirm; busy.
- **Replaces** — the destructive confirms' two looks (Engine and Library's
  text `error` button over `DialogContentText`, the shared and repertoire
  ones' contained `error` over `Typography body2`): Replay / Resign
  ([Engine.md](../Engine.md)), Delete collection ([Library.md](../Library.md)),
  `FolderDeleteDialog` ([Shared.md](../Shared.md#folderdeletedialog)),
  `RepertoireFolderDeleteDialog` ([Repertoires.md](../Repertoires.md)), the move
  menu's delete ([Shared.md → MoveContextMenu](../Shared.md#movecontextmenu)).

## DeleteManyDialog

- **Purpose** — delete the picked rows: a destructive confirm with an error
  slot, so a failed write stays in the dialog beside the question.
- **Props** — as `ConfirmDialog` less `tone` / `confirmVariant`, plus
  `error?` (an error `Alert`, `-error`).
- **Variations** — plain, with a failed delete, busy.
- **Replaces** — the three "Delete N picked" dialogs: the Lobby's
  ([Engine.md](../Engine.md)), the collection table's
  ([Library.md](../Library.md)) and `RepertoireBulkDeleteDialog`, which Saved
  analyses borrows across modules ([Repertoires.md](../Repertoires.md),
  [Analyses.md](../Analyses.md)).

## FormDialog

- **Purpose** — a dialog that is a form: its fields, Cancel and Save.
- **Keyboard** — **Enter** in a one-line field submits; **Ctrl / ⌘ + Enter**
  submits from anywhere, a multiline field included, where a plain Enter is a
  new line; Enter mid-composition (an IME) and Shift + Enter do not. A
  `submitDisabled` or `busy` form submits by no route.
- **Props** — `open`, `onClose`, `onSubmit`, `title`, `children` (the fields),
  `submitLabel`, `cancelLabel`, `submitDisabled?`, `busy?`, `width?`,
  `testId`, `dialogProps?`. Ids: `-form`, `-cancel`, `-submit`.
- **Variations** — one-line (Enter), multiline at `sm` (Ctrl / ⌘ + Enter), busy.
- **Replaces** — `FolderNameDialog`, `RepertoireFolderNameDialog`,
  `SaveAnalysisDialog`'s name half (Enter) and `CommentDialog` (Ctrl / ⌘ +
  Enter) — [Shared.md → Dialog](../Shared.md#dialog), "Enter to submit".

## ProgressDialog and `useCancellableJob`

- **Purpose** — a job under way, in a dialog, that can be cancelled until it
  starts writing.
- **`useCancellableJob()`** → `{ phase: "idle" | "working" | "writing",
  progress, busy, run, cancel }`. `run({ work(signal, report), write? })`
  answers `{ status: "done", value } | { status: "cancelled" } | { status:
  "failed", error }`. `cancel()` aborts the work and is **refused while
  writing**; a second `run` cancels the first; **unmounting cancels**; a work
  that throws once aborted is `cancelled`, never `failed`.
- **ProgressDialog props** — `open`, `title`, `children?` (above the bar),
  `progress?: { done, total } | null` (absent: indeterminate), `caption?`
  (the bar is named by the dialog's title and described by the caption),
  `cancelLabel`, `onCancel` (the button, Escape, the backdrop),
  `cancelDisabled?` (while writing), `width?`, `testId`, `dialogProps?`. Ids:
  `-progress`, `-caption`, `-cancel`.
- **Variations** — indeterminate, determinate, writing (Cancel off), and a
  live job in the gallery.
- **Replaces** — the abort-controller / determinate `LinearProgress` /
  "Cancel disabled while writing" logic `ImportOptionsDialog`
  ([Library.md](../Library.md#importoptionsdialog)) and `MultiGameDialog`
  ([Analyses.md](../Analyses.md)) share line for line.

## FullScreenDialog

- **Purpose** — a dialog that takes the whole window: a header (title, the
  caller's controls, close at the inline end) over a body that fills the rest.
- **Props** — `open`, `onClose`, `title`, `closeLabel`, `actions?`,
  `children`, `testId`, `dialogProps?`. Ids: `-header`, `-title`, `-close`,
  `-body`.
- **Variations** — plain; with header actions.
- **Replaces** — the map's full-screen `Dialog`
  ([Shared.md → TreeMap — the chrome](../Shared.md#treemap--the-chrome)).
