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
