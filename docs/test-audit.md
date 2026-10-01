# The test suite audit (CTA-124)

A pass over the suite after it was split into the `unit`, `ui` and `gallery`
groups (CTA-123): every file over about 3 s, every overlap the issue named,
and what was done about each. Times are CI's (`ubuntu-latest`, four cores,
`--maxWorkers 3`), from the CTA-123 pull request's run (#36859242210) unless
said otherwise. **CI's runners differ in speed by up to 2.5× between the jobs
of one run** (this branch's first run: 0.73× to 1.80× the baseline, measured
on the files neither run changed), so a shard's wall time is not comparable
across runs; compare a file's time divided by its job's factor. The gallery's are from the last development push before the
split (#36850661425), its only CI run so far. The before/after group timings
are in the pull request.

**Measure on CI.** A local run is no measure of a small change: with the CPU
governor at `powersave`, the same file swings by a third from run to run.
`ci.yml` on `main` has no `workflow_dispatch`, so a pull request's run is the
way to time a branch. `nightly.yml` is not on `main` either, so it cannot be
dispatched yet, and its schedule (which fires on `main`) will not run until
`development` is released.

## What made tests slow — the causes found

1. **Style rules piling up in one file** (the gallery). The app's two emotion
   caches (`design-system/theme/rtlCache.ts`) live for the whole file, so
   every rule a render inserts stays in `document.head`, and jsdom's
   `getComputedStyle` matches each element against every rule there. axe
   asks for every node's computed style. A matrix test renders a new theme,
   scheme and direction each time, so each page made the next one slower:
   the StandingsTable page takes 8 s on its own, but over 100 s late in the
   old one-file matrix. That timed out, which is why the last pre-split
   development push failed. **Fix:** `src/test/emotionCaches.ts`
   (`flushEmotionCaches`, after each matrix test). Flushing in `setup.ts` for
   every file was tried and dropped. A `ui` file renders one theme, so its
   rules stop growing after its first tests and there is little to save, and
   each test's first render then paid to insert its styles again.
2. **Role queries over a big DOM.** `getByRole` computes the accessible name
   of every candidate, and (unless `hidden: true`) the computed style of each
   one and its ancestors. Over a 99 × 9 table or 1,704 options that is
   seconds. **Fix:** scope the query to the row it asks about, read the name
   off the list already found, or pass `hidden: true` for a list that is
   open (the options are all shown).
3. **The real opening book where nothing asks for it.** In jsdom, where there
   is no `Worker`, an import indexes a collection on the main thread, and the
   index pass loads the ~3 MB eco book. **Fix:** the shared `openingsMock`,
   as every other Library and board test already has.
4. **Renders per edit.** The theme editor re-renders its whole preview on
   every change. `retype` cleared and then pasted, which is two changes, and
   user-event's pointer-events check computed styles up the tree before each
   click. **Fix:** select and paste over the text (one change), and switch
   the check off for that file.
5. **One long file decides a shard.** `vitest --shard` splits by file, and
   a file runs on one worker. `Library.test.tsx` (62 s) sat on the slowest
   of the three `ui` shards (107 s against 61 s and 85 s). **Fix:** split by
   screen into four files and a kit.

## Every file over ~3 s

| File | Group | CI | Decision |
| --- | --- | --- | --- |
| `views/library/Library.test.tsx` | ui | 62.0 s, 93 tests | **Split** into `Library.test.tsx` (the list, folders, a table, a game, settings), `LibraryFilters.test.tsx`, `LibraryPicks.test.tsx` and `LibraryImport.test.tsx`, with `libraryTestKit.tsx`. All 93 tests kept, unchanged but for the next row. |
| ↳ *lists every opening of a real 5,722-game collection* | ui | 10.5 s | **Trimmed**: the 1,704 options are read with `hidden: true` from the open listbox. Kept the real fixture, since its scale is the point: the list is complete, not a first page. |
| `views/dev/themeEditor/ThemeEditor.test.tsx` | ui | 45.8 s, 19 tests | **Trimmed**: one select-and-paste per edit instead of a clear and a paste; the pointer-events check off; the four axe-per-section tests folded into one that walks the same four sections on one mount. The same assertions. Faster locally by 10–30 %; on CI, with the runner's speed taken out, about the same (45.8 s → 48.5 s): the cost is the preview's re-renders themselves. |
| `views/tools/analysis/saved/SavedAnalyses.test.tsx` | ui | 23.2 s, 46 tests | **Kept.** No hot spot: the slowest tests (a multi-game paste kept as a collection, axe in two views, a folder past one page) are each about 2–3 s of real work, and none repeats another. |
| `views/tools/analysis/AnalysisBoard.test.tsx` | ui | 20.9 s, 56 tests | **Kept.** Spread thin over 56 tests (every arrival, Save, Load, Export, Play, the Arrows tab); the axe tests audit tabs the browser pass does not open (Export, Engine). |
| `pageOutline.test.tsx` | ui | 20.0 s, 16 tests | **Kept.** Each case renders the real route in the real shell. The browser pass runs only WCAG-tagged axe, not the page-structure rules (`region`, the landmark rules) or the outline, so it does not cover these. |
| `views/engine/games/PlayedGames.test.tsx` | ui | 19.2 s, 32 tests | **Trimmed**: the keyboard test seeds 26 games at `?rows=25` instead of 52 at the default 50. Two pages either way, at half the rows. |
| `views/library/LibraryAccessibility.test.tsx` | ui | 10.6 s, 10 tests | **Trimmed** (overlap 2): the axe calls on a screen as it first opens (the list, a table, Add a collection, a game) removed; covered by the browser pass. |
| `views/engine/play/PlayWithEngine.test.tsx` | ui | 10.5 s, 38 tests | **Kept.** About 0.3 s a test on average; each is a distinct behaviour. |
| `views/repertoires/RepertoireBoard.test.tsx` | ui | 9.7 s, 9 tests | **Kept.** 7.3 s is the 7,859-node tree, the only screen test of a big tree's reading state. Its scale is the point. |
| `views/main/Sidebar.test.tsx` | ui | 8.2 s, 29 tests | **Kept.** 29 small tests of the nav tree, about 0.3 s each on average. |
| `views/repertoires/RepertoirePlayer.test.tsx` | ui | 7.9 s, 49 tests | **Kept.** About 0.16 s a test on average. |
| `views/board/boards.test.tsx` | ui | 7.3 s, 47 tests | **Kept** (overlap 3). |
| `blocks/tables/SwissStandingsTable/SwissStandingsTable.test.tsx` | ui | 7.3 s, 22 tests | **Trimmed**: *keeps an unfinished game in its round* (3.3 s) asked the whole 99 × 9 table for one cell by name; now asked within the player's row. |
| `views/shared/positionEditor/PositionEditor.test.tsx` | ui | 7.1 s, 45 tests | **Kept.** About 0.16 s a test on average. |
| `views/main/Layout.test.tsx` | ui | 6.6 s, 37 tests | **Kept.** The shell under both breakpoints; the drawer's axe is a state the browser pass does not open. |
| `views/settings/ImportTab.test.tsx` | ui | 6.0 s, 12 tests | **Trimmed**: the opening book stubbed (cause 3). Locally its tests went from about 10 s to 6 s. |
| `views/repertoires/RepertoireAccessibility.test.tsx` | ui | 6.0 s, 9 tests | **Trimmed** (overlap 2): axe on the settings and upload screens as they open, and on the player's Moves tab (the tab it opens on), removed; covered by the browser pass. The Map and Settings tabs' audits now share one mount. |
| `design-system/gallery/DesignGallery.test.tsx` | ui | 5.7 s, 25 tests | **Kept.** The gallery's own behaviour (menu, switches, pages); no axe. |
| `views/repertoires/RepertoireAnnotations.test.tsx` | ui | 5.6 s, 10 tests | **Kept.** Comment editing, each test distinct. |
| `design-system/themes/themeBootstrapScript.test.ts` | unit | 5.5 s, 9 tests | **Kept.** Each test runs the real script in a process of its own, once. |
| `lib/wirepgn.test.ts` | unit | 5.4 s, 5 tests | **Trimmed**: the usage test ran the bare script twice to read its exit code and its output. Now it runs once. The rest are one run per thing checked. |
| `views/main/pageStructure.test.tsx` | ui | 4.8 s, 17 tests | **Kept** (overlap 5). |
| `design-system/patterns/tables/StandingsTable/StandingsTable.test.tsx` | ui | 4.4 s, 26 tests | **Trimmed**: the 99-row test names its last row off the list it already has, not by a second role query. |
| `views/tools/analysis/saved/AnalysisSettingsScreen.test.tsx` | ui | 4.3 s, 7 tests | **Kept.** A form filled and saved from the keyboard. |
| `blocks/tables/RoundRobinCrossTable/RoundRobinCrossTable.test.tsx` | ui | 4.0 s, 17 tests | **Kept.** Eight players, so its role queries are over a small table. |
| `views/engine/masked/MaskedPlay.test.tsx` | ui | 3.9 s, 19 tests | **Kept.** |
| `blocks/tables/PlayedGamesTable/PlayedGamesTable.test.tsx` | ui | 3.4 s, 14 tests | **Kept** (overlap 1). |
| `views/repertoires/RepertoireUpload.test.tsx`, `Repertoires.test.tsx`, `RepertoireGames.test.tsx` | ui | 3.3, 3.2, 3.0 s | **Kept.** Each test distinct and small. |
| `test/galleryMatrix/*.matrix.test.tsx` (14 slices) | gallery | *see below* | **Fixed**: the style-rule pileup (cause 1). Every page is still rendered under every theme with axe. A theme can change markup (`linkUnderline` sets MuiLink's `underline` prop, which axe's `link-in-text-block` reads), so one theme per page would not be the same check. The table pages' big demos (the real 99-player Sofia file, 99-row and 30-round standings) are kept: they are what the gallery is for, and with the flush they cost seconds, not minutes. |

**The gallery group, before and after the flush.** The group cannot run on
CI from this branch (`nightly.yml` is not on `main`), so these are local runs,
one after the other on the same machine, with `yarn test:gallery`'s
`--maxWorkers 3`:

| | Wall | Summed test time | Failed |
| --- | --- | --- | --- |
| Before (the flush a no-op) | 1,197 s | 3,335 s | 8 of 550: StandingsTable at its 90 s timeout under four themes, and in each of those slices the next page too (TreeView three times, UploadPanel once), its preview never found while the timed-out test was still running |
| After | 617 s | 1,677 s | 0 of 550 |

Under three workers the table pages still take 40–50 s each (8 s alone):
that is contention for the CPU, not pileup, and well inside the 90 s
`AXE_PAGE_TIMEOUT_MS`. On CI the pre-split one-file matrix took 1,219 s
(`Main.test.tsx`) and 873 s (`everyTheme.test.tsx`) of test time, and failed.

## The overlaps the issue named

1. **Per-component tests vs the gallery matrix rendering the same demos —
   kept.** The matrix runs nightly, not on a pull request (CTA-123). A
   component's own axe test is the pull-request gate's only audit of it, so
   removing it would move that check from every pull request to a nightly
   run. Neither renders the other's demos: a component test asserts
   behaviour on its own props.
2. **The `*Accessibility.test.tsx` screen files vs the browser pass —
   trimmed.** On every pull request the browser pass (`e2e/a11y/`, the
   reduced matrix: default and high-contrast, light, English and Hebrew)
   opens every shipped route seeded and runs axe with colour contrast and
   target size on. jsdom's axe on the same screen as it first opens adds
   nothing, so those calls were removed. Still covering each removal is that
   route in `e2e/a11y/routes.ts`: `library`, `library-collection`,
   `library-upload`, `library-game`, `repertoire-settings`,
   `repertoire-upload` and `repertoire-player` (its Moves tab). Kept: every
   keyboard and role assertion, and axe on the states the browser pass never
   reaches (a folder opened, picks made, a dialog, a filter leaving nothing,
   the tournament mark's states, the player's other tabs).
3. **`panelPropagation.test.tsx` vs `boards.test.tsx` — kept.** They prove
   different things. One replaces `BoardPanel` with a sentinel (a board
   that grew a panel of its own fails it); the other renders the real panel
   and asserts what is in it. `chessboard.md` §9 names both as the
   propagation guarantee. Neither is slow (`panelPropagation` is under 1.4 s).
4. **Per-block tests vs the block gallery demos — kept**, as overlap 1. No
   block test renders its gallery module; the gallery's pull-request checks
   (`gallery/everyTheme.test.tsx`, `views/dev/design/Main.test.tsx`) assert
   only that the matrix meets every page and theme.
5. **Repeated full-shell renders — kept.** `pageOutline.test.tsx` renders 16
   routes in the shell for the outline and the page-structure rules, and
   `pageStructure.test.tsx` the shell's own behaviour (title, landmarks, skip
   link, focus on navigation). They share no assertion, and a smaller render
   could not hold either (the shell is the subject). `Library.test.tsx`
   against `LibraryAccessibility.test.tsx`: the second is keyboard and axe
   only, its fixtures its own; no test is in both.

## Also changed, and for the next audit

- **Waits raised from 1 s to 5 s.** `setup.ts` now sets testing-library's
  `asyncUtilTimeout` to 5 s. A screen that writes IndexedDB and then
  navigates lands within a second alone, but not always with three heavy
  files on the other workers. Library's post-write waits ran out that way,
  locally, a different one each run, each passing when re-run alone; more so
  once its four files ran side by side. A met wait returns at once, so only a
  real miss reports more slowly. This is the same reasoning as the suite's
  20 s `testTimeout`.
- A new very large fixture in a role query: query within the row, or pass
  `hidden: true` for a list known to be open.
