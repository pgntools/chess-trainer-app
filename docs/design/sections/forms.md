# Forms — `src/design-system/components/forms/`

Fields and settings layouts (CTA-108), from
[Shared.md → Form / settings group](../Shared.md#form--settings-group). Import
from `components/forms`. Every field takes its words as props and a `testId`
— on the **input** for a single control, so a test clicks or types into it
directly.

Gallery: `/dev/design/forms`.

## FieldLabel

- **Purpose** — the one field-label style: `body2`, 600.
- **Props** — `children`, `component?: "label" | "legend" | "span"`,
  `htmlFor?`, `id?`, `testId?`.
- **Variations** — a label for one control; a `legend` heading a `fieldset`.
- **Replaces** — the four label styles: `body2` 600, `subtitle2` 700,
  `subtitle2` 600, a `FormLabel` legend in either.

## SwitchField / CheckboxField

- **Purpose** — a labelled switch or checkbox, with or without a help caption
  that also **describes** the control (`aria-describedby`).
- **Props** — `label`, `checked`, `onChange(checked)`, `help?`, `size?`,
  `disabled?`, `testId` (the input; the caption is `-help`), `testIdOn?:
  "input" | "control"` (CTA-109 — `control` puts the id on MUI's switch or
  checkbox around the input, for a screen whose tests reach the input inside
  it). `CheckboxField` adds `indeterminate?`.
- **Variations** — small / medium, plain / captioned, disabled; indeterminate
  (checkbox); the test id on the control.
- **Replaces** — the six captioned switches (`SwitchOption`, `SwitchSetting`,
  the Arrows tab, the analysis settings screen, the Masking tab twice) and the
  twelve plain ones, which differed in size, margin and test-id placement; the
  Export tab's and the save-tree dialog's checkboxes.

## RadioGroupField

- **Purpose** — one choice of several, as radios (CTA-109): a `fieldset`
  whose legend (the `FieldLabel` style) names the group, labelled radios the
  arrow keys move between, an optional help caption that describes it.
- **Props** — `label`, `options: { value, label, disabled? }[]`, `value`,
  `onChange(value)`, `row?`, `help?`, `size?` (default `small`), `disabled?`,
  `testId` (the `radiogroup`; each radio's input `<testId>-<value>`, the help
  `-help`).
- **Variations** — in a row; with a help caption that follows the choice; one
  under another, medium; a choice off and the whole group off.
- **Replaces** — the Import dialog's two unnamed Merge / Override / Skip
  groups (per category and per folder). The Appearance tab's theme cards are
  not plain radios and stay its own ([`migration.md`](../migration.md#44-left-hand-written-and-why)).

## SideToggle

- **Purpose** — White / Black: small, exclusive, never empty.
- **Props** — `value`, `onChange`, `labels: { white, black, all? }`,
  `withAll?` (a first "all" button), `fullWidth?`, `disabled?`, `ariaLabel`,
  `testId` (buttons `-white`, `-black`, `-all`).
- **Variations** — two buttons; with "all"; full width; full width with "all".
- **Replaces** — the eight side `ToggleButtonGroup`s with five `sx`
  (`NewGameForm`, the `PlayScreen` header, the two settings screens, the
  repertoire player, `PositionFields`, the Lobby's and the collection's
  filters).

## SliderField

- **Purpose** — a labelled slider: the label at the start, the value at the end
  (`dir="ltr"`), the slider under it, dimmed while off — its notice never
  (CTA-109: a dimmed warning caption fell to 2.5:1), nor its header
  (CTA-142: the dimmed value fell to 4.0:1).
- **Props** — `label`, `value`, `onChange(number)`, `min`, `max`, `step?`,
  `valueLabel?`, `notice?` (a warning caption), `disabled?`, `testId` (the
  parts `-value`, `-input`, `-notice`).
- **Variations** — the number; the caller's value words; disabled with a notice.
- **Replaces** — `OptionSlider`'s header and its four hand-written copies
  (depth and move time in `EngineSettings` and `AnalysisSettings`) —
  [Shared.md → OptionSlider](../Shared.md#optionslider). `OptionSlider`'s
  engine-aware three states stay in `views/shared/`, built on this.

## SelectField

- **Purpose** — a small select with its label always shrunk.
- **Props** — `label`, `value`, `onChange`, `options: { value, label,
  disabled? }[]`, `emptyOption?` (a first `""` choice — "All openings"),
  `helperText?`, `disabled?`, `fullWidth?`, `optionDir?`, `testId` (the
  input; options `-option`). A value its options no longer hold still shows.
  It is at least 160 px wide **or as wide as its container where that is
  narrower** (`min-width: min(160px, 100%)`, CTA-116), so a grid of selects in
  a half-panel column — the mask editor's twelve — fits without `fullWidth`.
- **Variations** — with an "any" choice; required, full width; in a column
  narrower than its floor; disabled with a helper.
- **Replaces** — the `TextField select` filters (the Lobby's opening, the
  collection's result) and the Masking tab's native `Select`.

## SearchField

- **Purpose** — a words box: a search glyph, the words (`dir="auto"`), a clear
  button while there are any, Escape to clear.
- **Props** — `value`, `onChange`, `placeholder?`, `label?`, `clearLabel`,
  `fullWidth?`, `autoFocus?`, `testId` (the input; `-clear`).
- **Replaces** — the Library home's and the collection's words boxes.

## DateRangeFields

- **Purpose** — two date fields side by side, each bounding the other.
- **Props** — `value: { from, to }` (`YYYY-MM-DD`, `""` open), `onChange`,
  `fromLabel`, `toLabel`, `disabled?`, `testId` (inputs `-from`, `-to`).
- **Replaces** — the date range written in `CollectionFilters` and
  `ImportOptionsDialog` ([Shared.md → Filter bar](../Shared.md#filter-bar)).

## FileInputButton

- **Purpose** — a button that picks files: a `label` over a hidden
  `<input type="file">`, emptied after each pick so the same file reads again.
- **Props** — `label`, `accept` (a string or a list), `onFiles(files)`,
  `multiple?`, `variant?`, `size?`, `startIcon?` (`null` for none),
  `disabled?`, `testId` (the button; the input is `-input`), `inputTestId?`
  (CTA-109 — the input's own id, for a screen whose tests named it).
- **Replaces** — the file-pick half of the five PGN inputs and the zip input,
  and their two hidden-input techniques
  ([Shared.md → Upload / import flows](../Shared.md#upload--import-flows)).

## SettingsSection / SettingsFrame (+ `useDraft`)

- **Purpose** — a settings screen: sections (an overline heading over a
  divider, then the fields) in the one scrolling region, over a fixed foot with
  Save (contained) and Cancel (text). The frame is a form: Enter in a one-line
  field saves.
- **Props** — `SettingsSection`: `title`, `description?`, `children`,
  `testId` (`-title`). `SettingsFrame`: `children`, `onSave`, `onCancel`,
  `saveLabel`, `cancelLabel`, `saveDisabled?`, `busy?`, `footer?`, `testId`
  (`-body`, `-save`, `-cancel`).
- **`useDraft(initial, same?)`** → `{ draft, update(patch), dirty, reset,
  commit }` — the draft Save and Cancel act on.
- **Replaces** — `AnalysisSettingsScreen`'s `Section` and
  `RepertoireSettingsScreen`'s inline copy of it — one layout written twice.

## CopyField

- **Purpose** — machine words to copy (a FEN, a PGN): its label over a
  read-only field in the theme's monospace, `dir="ltr"`, and a copy button
  that says it copied (CTA-113).
- **Props** — `label`, `value`, `copyLabel`, `copiedLabel`, `failedLabel`,
  `disabled?`, `disabledHint?`, `maxRows?`, `testId`.
- **Replaces** — `views/shared/CopyableValue.tsx`.

## ColorField

- **Purpose** — a colour, picked or typed (CTA-115, the theme editor's every
  token): a swatch over a checkerboard (a translucent colour shows as one)
  that opens the system's colour picker, and a text input (`dir="ltr"`) that
  takes `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` or `rgba()` — the
  forms a translucent token needs, which the native picker cannot write.
  The picker keeps a translucent colour's alpha (`rgba(r, g, b, a)`, MUI's
  own way of writing it). While the text is not a colour the field is
  invalid, says so and reports nothing; a new `value` from outside (an undo)
  replaces the text.
- **Props** — `label`, `value`, `onChange(colour)` (only ever a valid one),
  `pickerLabel` (the swatch's accessible name), `invalidText`, `help?` (a
  caption that describes the input — the editor's contrast ratio),
  `helpTone?: "success" | "error" | "warning" | "neutral"`, `disabled?`,
  `id?` (for a host that moves focus to it), `testId` (the text input; the
  parts `-picker` and `-swatch`).
- **Variations** — opaque; translucent; a passing caption; a failing one;
  disabled. The demos take their colours from the theme in view — a gallery
  draws no colour literal.
- **Replaces** — nothing: new with the theme editor.

## TextInputField

- **Purpose** — one line of words (CTA-115): the label always shrunk above
  it (as `SelectField`'s), a caption that describes it, an invalid state.
- **Props** — `label`, `value`, `onChange(text)`, `helperText?`, `error?`,
  `placeholder?`, `dir?: "ltr" | "auto"` (machine words, or a reader's own),
  `disabled?`, `id?`, `multiline?` (two to six lines, spell-checked — CTA-135),
  `type?: "text" | "number" | "date"` (the value still a string, `""` for
  none — CTA-135), `testId` (the input).
- **Variations** — a reader's words; machine words with a caption and a
  placeholder; invalid; disabled; several lines; a number; a date.
- **Replaces** — nothing yet: the theme editor's ids, names, font stacks and
  sizes, and the MDX editor's Metadata form (CTA-135). A screen's bare `TextField` for one line of words can move onto it.

## CTA-113 additions

- `DateRangeFields` — `bounds?: { min?, max? }` (neither end leaves the span —
  a collection's first and last game) and `inputTestIds?: { from?, to? }`.
- `RadioGroupField` — `optionTestId?(value)`: a radio's own id.
- `SelectField` — `testIdOn?: "input" | "display"`.
- `SideToggle` — `buttonTestIds?`.
- `SearchField` — the Library's, a collection's and the lists' words box.
