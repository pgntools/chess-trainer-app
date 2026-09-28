# Feedback — `src/design-system/components/feedback/`

Telling the reader what happened (CTA-108), from
[Shared.md → Feedback](../Shared.md#feedback-alert--snackbar). Import from
`components/feedback`.

Gallery: `/dev/design/feedback`.

## SnackbarProvider + `useSnackbar()`

- **Purpose** — the app's one snackbar and its queue.
  `src/main.tsx` mounts the provider once, inside `AppThemeWithLang`; a screen
  calls `const { show } = useSnackbar()` and
  `show({ message, severity?, action?, duration?, testId? })`.
- **Rules** (`snackbarQueue.ts`, pure) — one at a time, in order: a message
  arriving while one shows **cuts it short**, and each waits for the last to
  leave. A message is cut short only once it has **begun to enter** — MUI's
  `Snackbar` forwards only `onEnter` / `onExited` of its transition, and a
  snackbar closed before it was drawn open would never exit and stall the
  queue. A click elsewhere does not dismiss it (`clickaway`); Escape, its
  close button, its action and its timer do.
- **Message** — `severity` absent: a plain dark bar; present: a filled `Alert`
  (success, info, warning, error). `action: { label, onClick }` — one button,
  which also closes it. `duration` in ms (default 6000), `null` until
  dismissed. `testId` its own (else the provider's, `app-snackbar`); the parts
  `-message`, `-action`.
- **Announced by its weight** (CTA-111) — an `error` or `warning` as an
  `alert` (read at once), anything else — plain, `success`, `info` — as a
  `status` (read when the reader is idle). A snackbar goes by itself, so an
  action in one must be reachable some other way too, or the message must
  stay (`duration: null`).
- **Outside a provider** `useSnackbar` throws, naming the fix: a test of a
  component that uses it wraps it in a `SnackbarProvider`.
- **Variations** — plain (3 s), each severity, with an action (10 s), until
  dismissed, a queue of three.
- **Replaces** — the two snackbars and their two looks: the collection's
  Analyse notice (filled `Alert`, a button, 10 s) and the move menu's copy (a
  plain message, 3 s).

## InlineAlert

- **Purpose** — an alert in the page's flow, with an optional title, action,
  close, and a **detail block** — machine words in monospace, pinned `dir="ltr"`.
- **Props** — `severity`, `title?`, `children`, `detail?`, `action?`,
  `onClose?`, `variant?: "standard" | "outlined"`, `dense?`, `testId`
  (`-detail`).
- **Variations** — error; error with a title and detail; success; outlined
  warning with an action; dense, dismissible info.
- **Replaces** — the inline `Alert severity="error"` nearly everywhere, the
  repertoire upload's problem with its LTR detail, the Export tab's success
  `Alert`.

## FeedbackStrip

- **Purpose** — the raised strip: a paper box with a one-pixel border in its
  tone, optional actions at its end, optionally capped and scrolling.
- **Props** — `tone: "info" | "success" | "neutral"`, `children`,
  `maxHeight?`, `actions?`, `ariaLabel?` (a named `region`), `testId`.
- **Variations** — info (the comment block), success with actions (the changes
  strip), neutral and capped (the next-moves bar).
- **Replaces** — `AnnotationsBar`'s strip (`info.main`), `RepertoireChangesBar`
  (`success.main`), `NextMovesBar` and the pinned variations' box (`divider`)
  — "a de-facto `Callout` with a colour"
  ([Shared.md → AnnotationsBar](../Shared.md#annotationsbar)).

## StatusText

- **Purpose** — a one-line outcome in its tone's colour, announced: an
  `error` as an `alert`, anything else as a `status`.
- **Props** — `tone: "error" | "success" | "warning" | "info" | "neutral"`
  (`neutral` the text's own colour — CTA-109), `children`, `emphasis?`
  (`body2` in 600 rather than a caption — a game's result), `testId`.
- **Replaces** — the board screens' save problems (a `caption` in
  `error.main` with `role="alert"`: `PlayScreen`, `AnalysisBoard`,
  `RepertoireChangesBar`) and the success captions (the Load tab,
  `CopyableValue`).
