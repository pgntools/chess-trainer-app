# Contributing

Thank you for helping with the chess trainer. This page is how to get it
running, how the code is organised, what a change has to pass, and — step
by step — how to add a theme. [`CLAUDE.md`](CLAUDE.md) is the fuller map of
the code; each module's reference is under [`.claude/rules/`](.claude/rules/).

## Running it

You need **Node 24** (CI pins 24; the maintainers use [fnm](https://github.com/Schniz/fnm))
and **Yarn 1**.

```sh
yarn install
yarn dev            # the dev server — http://localhost:5173/chess-trainer-app/
```

The app is deployed under `/chess-trainer-app/`, so the dev server serves it
there too. The dev-only screens — the design gallery (`/dev/design`) and the
theme editor (`/dev/theme-editor`) — are in the sidebar's **Development**
folder, in `yarn dev` only; a production build carries none of them.

## Checking a change

| Check | Command |
| --- | --- |
| Type-check | `npx tsc -b` |
| Type-check and build | `yarn build` |
| Lint (the import boundaries between the layers, the MUI lock, `jsx-a11y`, React's rules) — **a CI gate** | `yarn lint` |
| The browser accessibility pass (every route, every theme × light / dark × English / Hebrew; builds first, then ~30 min) | `yarn test:a11y` |
| The same for the pull-request matrix (default and high-contrast themes, light, both languages) | `yarn test:a11y:quick` |
| The whole test suite | `yarn test:run` |
| One test file | `npx vitest run src/path/to/File.test.tsx` |
| Tests whose name matches | `npx vitest run -t "part of the name"` |
| Unused code | `npx knip` |

A pull request needs `npx tsc -b` clean, `yarn test:run` green, `yarn lint`
clean (CI fails on it) and `npx knip` reporting nothing new. CI also runs the
browser accessibility pass on every pull request (the reduced matrix); run
`yarn test:a11y:quick` yourself when you change what a screen looks like — it
needs Chromium once: `npx playwright install chromium`. If the suite seems
stuck or times out at random on your machine, it is running too many files at
once: lower the cap (`npx vitest run --maxWorkers 2`) and re-run a failure on
its own before treating it as real ([`CLAUDE.md`](CLAUDE.md#commands)).

**Tests** are Vitest and Testing Library on jsdom. Find things **by role and
name** (`getByRole("button", { name: "Save" })`, `getByLabelText`) and drive
the keyboard with `userEvent`, so a passing test is one a screen reader could
follow; `await expectNoAxeViolations()` (`src/test/axe.ts`) audits a render
against WCAG 2.2 AA. A board screen stubs the board and the engine with
`src/views/board/boardTestHarness.tsx`.

## Where the code goes

The UI is five layers, each built only from the ones below it —
[`docs/design/hierarchy.md`](docs/design/hierarchy.md) is the whole story:

```
screens (src/views/)  →  blocks (src/blocks/)  →  patterns  →  base components  →  MUI
                                                  (src/design-system/patterns/, components/)
```

- Reads a store, a route or global state → a **screen** (and split its
  presentational part out as a block).
- Needs a chess type or a `src/lib/` helper → a **block**: presentational, its
  rows, state and callbacks arriving as props, built in the gallery on
  fixtures first.
- Composes several base components, no chess → a **pattern**.
- Wraps one MUI job, no chess → a **base component**.

Every component is a folder — the component, its test, its gallery demo and
an `index.ts` — and takes its words as props and a `testId`; colours come
from the theme, never a literal; sides are logical (`paddingInlineStart`),
never `left` / `right`. `yarn lint` enforces the import rules between the
layers — and the **MUI lock**: a screen or a block does not import the MUI
atoms the design system wraps (`Dialog`, `Table`, `Tabs`, `Tooltip`, `Switch`,
`Slider` …); the error names the component to use
([`hierarchy.md`](docs/design/hierarchy.md#the-import-rules)). Moving a screen onto the design system follows the checklist in
[`docs/design/migration.md` §5](docs/design/migration.md#5-checklist-for-migrating-a-module).

A chessboard is composed from the board core, never written from scratch —
[`.claude/rules/chessboard.md`](.claude/rules/chessboard.md) §9.

## Accessibility

The target is **WCAG 2.2 level AA**. [`ACCESSIBILITY.md`](ACCESSIBILITY.md)
says what is covered, how it is checked and what the known gaps are. The
design system carries most of it — every control's accessible name is a
required prop, states are announced, the keyboard reaches everything, targets
are at least 24 px, motion stops under `prefers-reduced-motion` — so a screen
built from it inherits it. What automation cannot hear, a person checks with a
screen reader: [`docs/design/screen-reader-testing.md`](docs/design/screen-reader-testing.md)
is the protocol.

What jsdom cannot judge — colour contrast of what is painted, target size as
laid out, the console, direction — the **browser pass** checks: `yarn test:a11y`
opens every shipped route, seeded, under every theme, light and dark, in
English and Hebrew, against the production build, and fails on a new axe
violation (WCAG 2.2 A / AA, contrast and target size included). A new screen is
a line in `e2e/a11y/routes.ts` — a test fails without it. A violation is fixed;
it goes on the allowlist (`e2e/a11y/allowlist.ts`) only as a real gap with a
plan, listed in `ACCESSIBILITY.md` first. The reference is
[`.claude/rules/browser-a11y.md`](.claude/rules/browser-a11y.md).

## Create a theme

A theme is **data** — a `ThemeDefinition` in `src/design-system/themes/`:
its light and dark palettes, its type, its shape, its component knobs and
every colour drawn on or over a board. Two tools make one, both writing the
file through the same generator (`themes/codegen.ts`), so neither ever
writes a shape the other would not.

1. **Scaffold it.** From the repository's root:

   ```sh
   yarn theme:bootstrap --id ocean --name "Ocean" --name-he "אוקיינוס" --from brown
   ```

   `--id` is lower-case words joined by dashes (`ocean`, `deep-sea`);
   `--from` is the registered theme it starts as a copy of (`default` if you
   leave it out); leave `--name-he` out and the English name goes into
   `he.ts`, marked for translation. It writes
   `src/design-system/themes/ocean.ts` (`export oceanTheme`), registers it in
   `themes/registry.ts` and names it in `src/locales/en.ts` and `he.ts`.
   `--dry-run` prints all of that first and writes nothing; a taken or
   invalid id, or an unknown `--from`, is refused — and then nothing is
   written at all. The new theme is already in Settings → Appearance and the
   gallery's theme switch.

2. **Tune it in the theme editor.** Run `yarn dev` and open
   `/dev/theme-editor?theme=ocean`. Down the left are the theme's sections —
   the two palettes, typography, shape and components, accessibility, the
   board, the arrows, the move marks, the map and the Library's bars. Each
   token's field shows its contrast ratio against what it sits on; a section
   with a failure is badged, the summary at the top counts them, and its
   menu takes you to a failing token. The preview on the right follows the
   section, in light or dark and left to right or right to left. Undo, and
   reset a section or the whole theme, as you go. To stop halfway, **Save… →
   Export draft (JSON)**, and **Import draft** it next time — the editor keeps
   nothing between sessions, and asks before you leave with unsaved changes.

3. **Download the file and replace it.** **Save… → Download ocean.ts** (or
   copy the source from the same dialog), and replace
   `src/design-system/themes/ocean.ts` with it. The editor writes nothing to
   the repository — there is no server; this step is yours.

4. **Run the contrast test, then the suite:**

   ```sh
   npx vitest run src/design-system/themes/contrast.test.ts
   yarn test:run
   ```

   The contrast test holds every registered theme to WCAG AA: text at 4.5:1
   on every surface, the focus ring and a control's border at 3:1. The
   editor reports the same checks (from `themes/contrast.ts`), so a theme
   with no red badge passes. The board's coordinates, move marks and result
   bars are advisory — shown in amber, not enforced.

5. **Open a pull request** against `development`, with a screenshot of the
   theme in both schemes if you can.

Changing an **existing** theme is steps 2–5: open it in the editor
(`?theme=<id>`), download its file and replace it. Never rename a theme's id
— it is what a reader's choice is stored as. Something the editor cannot
edit — a MUI component override beyond its knobs — goes in the file's
optional `overrides` by hand; the editor warns that it cannot carry one.
Doing it all by hand, without the script, is in
[`docs/design/README.md`](docs/design/README.md#adding-things).
