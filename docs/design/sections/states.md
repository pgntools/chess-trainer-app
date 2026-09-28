# States — `src/design-system/components/states/`

Loading, empty and missing (CTA-108), from
[Shared.md → Empty / loading / error state](../Shared.md#empty--loading--error-state).
Import from `components/states`.

Gallery: `/dev/design/states`.

## LoadingLine

- **Purpose** — the "reading…" line while a store's first read has not landed:
  `text.secondary`, `p: 2`, announced as a `status`.
- **Props** — `children`, `testId`.
- **Replaces** — the reading line written nine times (`PlayedGameRead`,
  `PlayedGames`, `CollectionScreen`, `LibraryUploadRoute`,
  `LibraryGameScreen`, `SavedAnalyses`, `AnalysisBoardRoute`,
  `AnalysisSettingsScreen`, `ReadingRepertoires`).

## LoadingSpinnerLine

- **Purpose** — a small spinner before a line, the pair a `status` — the spinner `aria-hidden`, the words announced.
- **Props** — `children`, `size?: "small" | "medium"`, `testId`.
- **Variations** — small (beside `body2`), medium.
- **Replaces** — the `CircularProgress size={16}` + `body2` lines of the
  repertoire upload and the player.

## EmptyState

- **Purpose** — an empty list: the words centred and muted (`py: 4`), with an
  optional icon above and action below.
- **Props** — `children`, `icon?`, `action?`, `testId`.
- **Variations** — words alone; with an icon and an action.
- **Replaces** — the empty-list texts (they already agreed: `body2
  text.secondary`, centred, `py: 4`).

## MissState

- **Purpose** — nothing here (a URL naming a record that is not there): a
  centred note and one way back, the arrow pointing back in either direction.
- **Props** — `title?`, `children`, `backLabel`, `onBack?`, `backLink?`,
  `testId` (`-back`).
- **Variations** — title + words + a button; words only, back by a link.
- **Replaces** — the two "miss" looks: `LibraryMiss` (left-aligned, `body1`, a
  medium button) and the repertoires' / analysis settings' (centred, `py: 4`,
  `body2`, a small button).

## ProgressLine

- **Purpose** — a bar with a caption (6 px, rounded), named by its `label`
  and described by the caption; a determinate bar reports `aria-valuenow`,
  an indeterminate one none.
- **Props** — `value?` (0–100, clamped; absent: indeterminate), `label`
  (the bar's accessible name, required — CTA-111), `caption?`,
  `color?: "primary" | "success"`, `testId` (`-bar`, `-caption`).
- **Variations** — determinate; success (a coverage bar); indeterminate.
- **Replaces** — the `LinearProgress` bars of indexing, import and the
  Backtracking coverage line.
