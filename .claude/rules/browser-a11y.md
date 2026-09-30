---
paths:
  - "e2e/**"
  - "playwright.config.ts"
  - ".github/workflows/a11y.yml"
  - "eslint.config.js"
  - "ACCESSIBILITY.md"
---

# The browser accessibility pass, and the MUI lock

CTA-116 locked in what the design system built (CTA-106…113) two ways, so a
contributor to this open-source app cannot quietly undo it: `yarn lint` is a CI
gate that includes **the MUI lock**, and **`yarn test:a11y`** checks every
shipped route in a real browser. This file is the whole reference for both.
The *what* of accessibility is [`ACCESSIBILITY.md`](../../ACCESSIBILITY.md);
where a component goes is [`design-system.md`](./design-system.md).

## 1. The MUI lock

`src/views/**` and `src/blocks/**` may not import the MUI atoms the design
system wraps — `Dialog*`, the `Table*` family, `Tabs` / `Tab`, `Switch`,
`Snackbar`, `Alert`, `Tooltip`, `ToggleButtonGroup` / `ToggleButton`,
`Breadcrumbs`, `Menu` / `MenuItem`, `Pagination`, `Slider`, `Autocomplete`.
`MUI_LOCK` in `eslint.config.js` is the list (data: atoms + the component to
use), turned into `no-restricted-imports` `paths` (the barrel) and `patterns`
(`@mui/material/Dialog`); each message names its replacement and points to
[`hierarchy.md`](../../docs/design/hierarchy.md#the-import-rules).

- **Flat config replaces, it does not merge.** A later `no-restricted-imports`
  entry replaces an earlier one for the files both match, so the blocks' entry
  holds all three of its rules (router, presentational, MUI) and the views'
  holds the lock alone. A new rule for `src/blocks/` goes *into* that entry.
- **`DialogContentText` is not locked** (a dialog body's text, not a dialog);
  neither is anything the design system does not wrap (`Box`, `Button`, `Chip`,
  the icons, the theme cards' `Radio`, the language `Select`).
- **A job no component does yet** is an exception: the import is disabled on
  its own line, `// eslint-disable-next-line no-restricted-imports --
  migration.md §4.4: <reason>`, and listed in
  [`migration.md`](../../docs/design/migration.md#the-mui-locks-exceptions-cta-116).
  **Five, in four files.** `src/views/boundary.test.ts` holds the source to the
  list — the files, the count, the reason on every line — and lints a probe for
  every locked atom, in both spellings. A sixth is an edit of both places, and
  usually a component instead.
- A locked atom that needs wrapping is a **design-system change first**
  (backward compatible, tested, demoed — `migration.md` §2), never an exception
  to save the trouble.
- `yarn lint` runs in CI (`ci.yml`: build → lint → tests) and exits 0 on the
  whole tree; keep it there.

## 2. The browser pass

```sh
yarn test:a11y          # yarn build, then playwright test — the full matrix
yarn test:a11y:quick    # the pull-request matrix
npx playwright install chromium     # once, for a new machine
A11Y_MATRIX=reduced npx playwright test -g "high-contrast · light · he"     # part of it, built already
```

Playwright + `@axe-core/playwright` over `vite preview` of the **production
build** under `/chess-trainer-app/` (`playwright.config.ts`; `A11Y_PORT` moves
the port). It is kept out of Vitest (`vite.config.ts` excludes `e2e/`).
`--reporter` on the command line replaces the config's reporters, summary
included — leave it off.

| File (`e2e/a11y/`) | Does |
| --- | --- |
| `seedZip.ts` | The data: a played game still on, a mated, a resigned, a masked and an unreadable one; two saved analyses, two repertoires and two uploaded collections (each kind once at the top level, once in a folder). Built by the app's own `buildExport` / `zipExport` — no store, no schema of the suite's own. `SEED` names the ids the routes use. |
| `seed.setup.ts` | The `setup` project: puts the zip in through **Settings → Import** and saves the browser's storage (localStorage **and IndexedDB**) as the state every test starts from. |
| `routes.ts` | `ROUTES` — every shipped route (21 pages): its path (**no leading slash**, or the base is dropped), the pattern in `src/routes.tsx` it visits an instance of, what shows it has its data, whether it draws a `board` or `pieces`. |
| `routes.spec.ts` | Holds `ROUTES` to `src/routes.tsx`: a shipped route with no line fails; so does a line for a route that is gone. |
| `matrix.ts` | `MATRICES.full` (every registered theme — a new theme joins with no edit — × light, dark × en, he: 20) and `reduced` (default, high-contrast × light × en, he: 4). `A11Y_MATRIX` picks; full is the default. |
| `checks.ts` | `applyPreferences` (the app's own keys: `chessapp.theme`, `mui-mode`, `i18nextLng`), `open` (heading, data, board, the engine's first line, nothing `aria-busy`), `check`. |
| `a11y.spec.ts` | Every route × every combination: `check`. |
| `allowlist.ts` | The known gaps — the only violations let through. |
| `allowlist.spec.ts` | Each entry's `gap` is a phrase in ACCESSIBILITY.md's Known gaps. |
| `reflow.spec.ts` | Every route at 320 × 256, once per language: **the reflow gate** (CTA-118) — no sideways scroll, `main` at least the viewport less the shell's inset, nothing past the edge outside a scrolling box of its own. |
| `summaryReporter.ts` | `a11y-report/summary.md` and `.json`; **fails the run on a stale allowlist entry**. |

**What `check` asks of a page**, soft-asserted so one page reports all of it:
axe's WCAG 2.2 A / AA tags with **colour contrast and target size on** (what
`src/test/axe.ts` must switch off under jsdom); no console error and no uncaught
exception; `<html dir>` `rtl` under Hebrew and `ltr` under English, `<html
lang>` the language; every board's squares (`[id$="-square-a8"]`'s parent) with
computed `direction: ltr`; a board on every `board` route.

**The allowlist.** An entry: `rule`, `target` (a regex over axe's selector),
`on` (`pieces`, `themes` — where it can occur), `gap` (a phrase of the
ACCESSIBILITY.md row) and `why`. Today: `board-pieces-unnamed` — `aria-command-name`
on react-chessboard's drag handles, every board and the position editor's
palette, until the board accessibility Story (CTA-114). **It fails when it
stops occurring**: after the run the reporter finds, per entry, the pages in its
scope and whether any met it; none did → stale → the run fails, telling you to
remove the entry and its ACCESSIBILITY.md row. Scope is what ran, so a reduced or
filtered run never fails an entry it did not visit. Adding one is the last resort:
**fix the finding**; list it only as a real gap with a plan, in ACCESSIBILITY.md
first.

**Reflow.** WCAG 1.4.10 asks for content usable at 320 CSS px wide. Each route is
opened at 320 × 256, in both languages, and held to three things (CTA-118 —
until then this was measured and never failed, because the sidebar was a fixed
280 px with no breakpoint and `main` came out 0 px wide everywhere):

- `pageOverflowPx` — the page does not scroll sideways;
- `mainWidthPx` — `main` has at least the viewport less the shell's inset
  (320 − 2 × 16 = 288 px; `SHELL_INSET_PX` in the spec repeats
  `Layout.tsx`'s `BOARD_INSET_PX`, which a node spec cannot import);
- `offenders` — nothing reaches past the edge that no scrolling box of its own
  contains, so a table scrolls inside its region rather than widening the page.

All three are soft, so a route reports everything wrong with it at once, and
all three are still recorded in `summary.md`'s reflow table. **A new screen
passes them or it does not ship**: under the shell's breakpoint (`md`, a media
query in `Layout.tsx`) the sidebar is a drawer opened from the header
(`NavDrawer`, the design system's) and the board's panel stacks under the
square.

**Adding a route**: a line in `routes.ts` (`routes.spec.ts` fails without), and
seed what it lists in `seedZip.ts`. **Adding a theme**: nothing — the full matrix
reads the registry. **A page that draws pieces** without a board (the position
editor's palette) is `pieces: true`, so the allowlist's scope reaches it.

**Seeding notes.** `storageState({ indexedDB: true })` carries the imported
stores to every test; a play-through is not needed. The engine runs on the
boards (a WASM Stockfish per page), so a full run is CPU-heavy: locally 4 workers,
CI 2, and a generous per-test timeout — a page that waits for the engine's first
line waits up to 45 s.

## 3. CI

`.github/workflows/a11y.yml`, separate from `ci.yml` (a browser, minutes not
seconds): every **pull request** runs the reduced matrix in one job; the
**nightly** schedule (02:17 UTC) and **workflow_dispatch** (`matrix: full |
reduced`) run the full one. A `plan` job picks the matrix and the shard count;
the full matrix (~470 page loads, a WASM engine on each board page — about two
hours of a four-core runner) is split over **six jobs** with Playwright's
`--shard`, and every shard seeds the app itself (the `setup` project runs in
each). The stale-entry check is per shard, and holds: an entry is judged on the
pages of its own shard that are in its scope. Chromium is cached by Playwright's
version (`~/.cache/ms-playwright`; the system libraries are installed each run),
the build is `yarn build`, and each shard uploads `a11y-report/` (the HTML
report, `results.json`, `summary.md`, the failed pages' traces) as an artifact,
its summary also going to the job's summary.

## 4. What must not happen

- A finding **skipped** by loosening `check`, a route left out of `ROUTES`, or
  an allowlist entry whose `target` is broader than the gap it names.
- A matrix that quietly shrinks: the full one reads the theme registry and the
  scheme and language lists; do not hard-code a subset.
- `page.goto("/…")` — a leading slash drops the base path.
- Playwright code in the app's bundle (`yarn build` and grep `dist/` for
  `playwright` — nothing) or a gallery / dev route in it.
