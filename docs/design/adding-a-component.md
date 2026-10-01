# Adding a component

One page, from the choice of tier to the pull request (CTA-117). It is a
checklist, not a second copy of the rules: each tick says **what** and **how
it is checked**, and the rule itself lives where the link points.

Every tick ends in one of two things:

- **`command` or `test file`** — something fails if the tick is skipped;
- **by review** — nothing does, so the reviewer looks (and the pull request
  says it was done).

Adding a **theme** is not here — it has its own tools
([`CONTRIBUTING.md`](../../CONTRIBUTING.md#create-a-theme)). Moving a whole
**screen** onto the design system is [`migration.md` §5](./migration.md#5-checklist-for-migrating-a-module).
A new **board** is [`chessboard.md` §7](../../.claude/rules/chessboard.md).

## 1. The tier

Ask in this order; the first yes decides
([`hierarchy.md`](./hierarchy.md#where-does-my-component-go)).

- [ ] **Reads a store, a route or global state?** It is a screen (or a screen's
      hook); split its presentational part out as a block. — *by review*
- [ ] **Needs a domain type or a `src/lib/` helper?** A block, even for one
      screen, when it is complex. — `yarn lint` (a block importing `src/views/`,
      a store or database module or `react-router` fails; so does the design
      system importing `src/lib/` or `src/blocks/`)
- [ ] **Composes several base components, no domain?** A pattern. A component
      wrapping one MUI job, no domain, is a base component. — `yarn lint` (a
      base component importing a pattern fails)
- [ ] A generic piece a block needs is built as a pattern first, and the block
      is that pattern over the app's data. — *by review*

## 2. The folder and its registration

Tables of the files and the rules: [`hierarchy.md`](./hierarchy.md#the-folder-layout).

- [ ] The folder is `<section>/<Name>/` with `Name.tsx`, `Name.test.tsx`,
      `Name.gallery.tsx` and `index.ts` (a block adds `fixtures.ts`), named for
      what it is ([Naming](./hierarchy.md#naming)). — the tier's `conventions.test.ts`
      (files); naming *by review*
- [ ] The section's (family's) `index.ts` has `export * from "./Name";`; a
      screen imports from that index, never the component's file. — the tier's
      `conventions.test.ts` (the re-export); a deep import *by review*
- [ ] The section is registered — a new one in `SECTIONS` (`components/sections.ts`),
      `PATTERN_SECTIONS` (`patterns/sections.ts`) or `BLOCK_FAMILIES`
      (`blocks/families.ts`) — and holds a component. — the tier's
      `conventions.test.ts`; `tsc` (the gallery's `GalleryModule<S>` names the id)
- [ ] It takes a `testId` and derives its parts' ids from it
      (`${testId}-row-${id}`). — the tier's `conventions.test.ts` (the prop);
      the derived ids *by review*
- [ ] Its words are props (screens pass `t(…)`); a block that one module alone
      uses may read the catalogs, and then adds its keys to **both** `en.ts` and
      `he.ts`. — `tsc` (`he` is typed `typeof en`); "props, not catalogs" *by review*
- [ ] A block is **presentational** — rows, state and callbacks are props, a
      link a `LinkTarget`; its `fixtures.ts` is typed with `src/lib/`'s own
      types and imported only by its gallery and its test. — `yarn lint` and
      `src/blocks/boundary.test.ts` (no store or router); the tier's
      `conventions.test.ts` (fixtures); `tsc` (the types)
- [ ] A screen or a block reaches for the design system's component, not the
      MUI atom it wraps (`Dialog`, `Table*`, `Tabs`, `Tooltip` …). — `yarn lint`
      (the MUI lock)
- [ ] A variation is an optional prop whose absence is today's behaviour, when
      the component changes a shared one. — *by review* (the existing tests
      passing unchanged is the evidence)

## 3. Theming and direction

The rules: [`README.md` → The component rules](./README.md#the-component-rules).

- [ ] **No colour literal** — a palette key, `alpha()` over one, or a `chess`
      token; a colour no token has is a **new token**, defined by every theme.
      (Watch a demo `href` like `#2025`: it reads as hex.) — the tier's
      `conventions.test.ts` (no literal); `tsc` (every theme must define a new
      token); `themes/contrast.test.ts` (a text or control token is measured)
- [ ] **Logical properties**, never `marginLeft`, `paddingRight`, `pl`, `mr`,
      `textAlign: "left"` … — the tier's `conventions.test.ts`. A physical
      `left:` / `right:` offset, a `float`, and a directional icon that is not
      mirrored under `theme.direction` are *by review*.
- [ ] `dir="ltr"` on a token (a number, a date, SAN, a FEN), `dir="auto"` on a
      reader's own words; a portalled part carries the theme's direction. —
      *by review*; the gallery's RTL switch shows a miss
- [ ] Spacing, radius and typography from the theme; a `subtitle1` / `subtitle2`
      that is a section's heading says `component="h2"` (or `h3`). — *by review*

## 4. Accessibility

WCAG 2.2 AA. The rules and what carries each:
[`hierarchy.md` → Accessibility](./hierarchy.md#accessibility),
[`ACCESSIBILITY.md`](../../ACCESSIBILITY.md).

- [ ] **Named by a required prop** — `VisibleLabel` (`components/a11y.ts`) or
      `string`, never optional; a name that goes with an optional part is
      required with it (a union). A `@ts-expect-error` case in the test proves
      it. — `npx tsc -b` (the case), the every-theme axe tests (a control with no
      name); that the case exists is *by review*
- [ ] **Announced**: an outcome `role="status"`, an error `role="alert"`, a
      region being filled `aria-busy`, a progress bar named with its value, a
      spinner beside words `aria-hidden`. — the component's test, by role
      (*by review* that it asserts them)
- [ ] **Operable by keyboard**, no trap; a composite widget follows its
      WAI-ARIA pattern; a pointer-only shortcut is `aria-hidden` with
      `tabIndex={-1}` and has a keyboard way. — a `userEvent` keyboard test in
      `Name.test.tsx`; the pattern *by review*
- [ ] **A visible focus**: MUI's buttons draw the ring; anything else focusable
      spreads `theme.mixins.focusRing` under `&:focus-visible`. — the tier's
      `conventions.test.ts` (a `:focus-visible` rule in a file that never
      mentions `focusRing`); `theme/accessibility.test.tsx` (the theme's own)
- [ ] **Targets at least 24 px** (`MIN_TARGET_PX`); never pad a control below it.
      — `theme/accessibility.test.tsx` (icon buttons); a custom target *by review*,
      then `yarn test:a11y:quick` measures a shipped one
- [ ] **Motion through `theme.transitions`**, never a literal `transition`, so
      reduced motion stops it. — the tier's `conventions.test.ts` (a literal
      `transition: "…"`); `theme/accessibility.test.tsx`
- [ ] **Explained**: a widget whose keys are not a page's (a tree, a sortable or
      pickable table) takes a **required** `hint`, read with it through
      `aria-describedby` and out of sight (`visuallyHidden`); tabs name their
      panels (`idPrefix` + `tabPanelProps`). — `tsc` (the required prop, a
      `@ts-expect-error` case); *by review* whether a new widget needs one
- [ ] **Headings**: a heading says so; a bold line is not one, and no level is
      skipped. — `src/pageOutline.test.tsx` (a shipped screen's whole outline);
      inside a component *by review*

## 5. The gallery

Build it standalone first ([`hierarchy.md`](./hierarchy.md#build-standalone-first)):
the gallery, on fixtures, before any screen uses it.

- [ ] `Name.gallery.tsx` default-exports `GalleryModule<S>` and declares no
      component (live state through `gallery/WithState.tsx` / `WithHook.tsx`);
      it needs no registration beyond its section. — `tsc`; the tier's
      `conventions.test.ts` (it has at least one demo)
- [ ] **A demo per variation and per state** — loading, empty, no match, one
      row, many rows, an unreadable one, long names, disabled, an error. —
      *by review*
- [ ] **An RTL demo**: a Hebrew name or label somewhere a reader's words are
      shown. — *by review*. (Every demo is rendered under both directions,
      every theme and both schemes, with no console error and no axe violation,
      by the gallery's axe matrix, `src/test/galleryMatrix/` — the `gallery`
      test group, not in the pull-request gate: run `yarn test:gallery`.)
- [ ] Looked at under **every theme**, light and dark (the gallery's switches),
      and worked through **from the keyboard alone**. — *by review*

## 6. Tests

- [ ] Found **by role and name** (`getByRole(…, { name })`, `getByLabelText`),
      not by test id alone, and driven with `userEvent`. — *by review*
- [ ] Every variation's prop has a test; a required-prop type has its
      `@ts-expect-error` case. — `npx tsc -b` (an unused `@ts-expect-error`
      fails); the coverage of a variation *by review*
- [ ] A test that renders more than the gallery's demos does it under axe:
      `await expectNoAxeViolations()` (`src/test/axe.ts`). — *by review*

## 7. The docs

- [ ] A **base component** has a heading (`## Name`) in its section's doc,
      [`sections/<section>.md`](./sections/) — purpose, props, variations, what it
      replaces. A **pattern** has one in [`sections/patterns/<section>.md`](./sections/patterns/).
      A **block** has a row in [`hierarchy.md`](./hierarchy.md#4-blocks--srcblocksfamilyblock)'s
      Blocks table. — the tier's `conventions.test.ts` ("has its entry in the
      docs": it fails when the entry, or the section's file, is missing)
- [ ] A new section (or family) is also counted where the docs count them, and
      has its section doc. — the same test (the file exists); the count in
      `hierarchy.md` / `README.md` *by review*
- [ ] A new prop or a variation updates the component's entry. — *by review*
- [ ] A new accessibility gap goes in [`ACCESSIBILITY.md`](../../ACCESSIBILITY.md)
      first. — *by review*

## 8. Verification

Run from the worktree, in a shell where `fnm`'s Node is on `PATH`.

- [ ] `npx tsc -b` — clean. (CI: `yarn build` type-checks.)
- [ ] `yarn lint` — no new finding. (CI gate.)
- [ ] `yarn test:run` — green; a failure on its own re-run is real, a timeout
      under load is not ([`CLAUDE.md`](../../CLAUDE.md#commands)). (CI.)
- [ ] `yarn test:gallery` — green: the gallery's axe matrix, every page under
      every theme. (Nightly, not on a pull request — CTA-123.)
- [ ] `npx knip` — reports nothing new but the design system's and the blocks'
      public surface that no screen imports yet. — *by review* (not in CI)
- [ ] `yarn build`, then nothing of the gallery, a demo or a fixture in `dist/`.
      — *by review* (CI runs the build, not the grep):

  ```sh
  grep -rlE "/dev/design|design-gallery|DesignGallery|\.gallery|<Name>|<a fixture's name>" dist/
  ```

  Expect no file (the Stockfish runtime's own `/dev/stdin` and `/dev/tty`
  are not this). The minified build keeps no component's name, so `<Name>`
  matches only a string: read a hit before calling it a leak — `ContextMenu`
  is a key's name in a dependency, `SnackbarProvider` its own error message.
- [ ] `yarn test:a11y:quick` when a **shipped screen** changed or a component
      now renders on one (~6 min; `yarn test:a11y` for the full matrix). — the
      Accessibility workflow (`a11y.yml`) on every pull request; a new screen is
      a line in `e2e/a11y/routes.ts`, which `routes.spec.ts` insists on
      ([`browser-a11y.md`](../../.claude/rules/browser-a11y.md))
- [ ] A **pull request into `development`**, its description saying which
      *by review* ticks were done and any that do not apply.

## Where each rule is written

This page points; it does not restate.

| Topic | Reference |
| --- | --- |
| Tiers, import rules, folder layout, naming | [`hierarchy.md`](./hierarchy.md) |
| The component rules, the gallery, the section docs | [`README.md`](./README.md) |
| What a session must not get wrong | [`.claude/rules/design-system.md`](../../.claude/rules/design-system.md) |
| Accessibility: what is covered, checked, known gaps | [`ACCESSIBILITY.md`](../../ACCESSIBILITY.md) |
| The checks over the source | `src/test/tierConventions.ts` (called by each tier's `conventions.test.ts`) |
