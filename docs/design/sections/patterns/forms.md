# Forms patterns — `src/design-system/patterns/forms/`

Generic compositions of the Forms section's base components (CTA-113).
Import from `patterns/forms`.

Gallery: `/dev/design/patterns/forms`.

## UploadPanel

- **Purpose** — one text brought in two ways: a file button (optional) and a
  paste box with its submit, a busy line while it is read, and a problem.
- **Props** — `fileLabel?` + `onFiles?` (absent, no file button — the host
  has one elsewhere), `accept?`, `multiple?`, `fileHint?`, `pasteLabel`,
  `pasteValue`, `onPasteChange`, `pasteHelp?`, `pasteRows?`, `onSubmit`,
  `submitLabel`, `submitVariant?`, `fileVariant?`, `size?`, `disabled?`,
  `busy?`, `problem?`, `testId`, `testIds?` (the parts' own ids).
- **Variations** — file and paste; paste only; busy; a problem; disabled.
- **Used by** — the `PgnInput` block (the Analysis Board's Load tab, the new
  analysis form, the repertoire and Library uploads).
- **Replaces** — four hand-built file button + paste box pairs.
