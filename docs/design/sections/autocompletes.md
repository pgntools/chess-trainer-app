# Autocompletes — `src/design-system/components/autocompletes/`

Typed-to-find pickers (CTA-108). Import from `components/autocompletes`. MUI's
own words in them ("No options", "Clear", "Open") come from the theme's locale
bundle; everything else is a prop.

Gallery: `/dev/design/autocompletes`.

## ChipsAutocomplete

- **Purpose** — several names as chips: small, free text allowed, the list
  kept open while picking, chosen names left out of the suggestions.
- **Props** — `label`, `value: string[]`, `onChange(string[])` (typed words
  trimmed, empties dropped), `options`, `onOpen?` (refresh the options as the
  list opens — for options costly to work out), `freeSolo?` (default true),
  `limitTags?`, `placeholder?`, `disabled?`, `testId` (the root; the input is
  `-input`). Chips and suggestions take `dir="auto"`.
- **Variations** — free text; `limitTags` 1; suggestions only, refreshed on
  open; disabled.
- **Replaces** — the player chips of the collection filters (`limitTags={1}`)
  and the import popup (options refreshed on open) —
  [Shared.md → Filter bar](../Shared.md#filter-bar), [Library.md](../Library.md).

## SelectAutocomplete

- **Purpose** — one choice out of many, typed to find, grouped when the
  options carry a `group`.
- **Props** — `label`, `value: string | null`, `onChange(string | null)`,
  `options: { value, label, group? }[]`, `placeholder?`, `optionDir?`
  (`ltr` for ECO codes and SAN), `clearable?` (default true), `disabled?`,
  `fullWidth?`, `testId` (`-input`). A value no option holds reads as none.
- **Variations** — grouped with LTR options; flat with a value; not clearable.
- **Replaces** — the select-style pickers over long lists (every opening,
  every event) that are `TextField select`s today.

## SuggestAutocomplete

- **Purpose** — free text with suggestions (CTA-150): the field *is* its text,
  typed or pasted whole, and the list only offers to fill it — a record's name
  found, its address put in. Where a value must be one of the options, use
  `SelectAutocomplete`.
- **Props** — `label`, `value: string`, `onChange(string)`, `options:
  { value, label, group? }[]` (**already narrowed by the screen**, which knows
  what a name is — the field does not filter again), `onPick?(option)` (after
  `onChange` has been given the option's `value`), `placeholder?`,
  `helperText?`, `error?`, `dir?` (the text's: `ltr` for a path),
  `optionDir?` (`auto` for names), `disabled?`, `testId` (`-input`). Enter with
  nothing highlighted is the form's, so a dialog still submits on it.
- **Variations** — grouped suggestions over a path; no suggestions, invalid.
- **Used by** — the MDX editor's *Add / update PGN* dialog, "An address in the
  app" (`src/mdxEditor/client/GallerySourceDialog.tsx`).
