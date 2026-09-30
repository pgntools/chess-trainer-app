# Screen-reader pass — results

What a person heard running [the protocol](./screen-reader-testing.md) at a
screen reader. One row per **screen × reader and browser × language**; a
**pass** means every point of the protocol's §2 and the screen's script (§3)
was heard as written. An **issue** says the step, what was expected and what
was heard, and where it went: fixed (the change and its test) or a known gap
in [`ACCESSIBILITY.md`](../../ACCESSIBILITY.md#known-gaps).

Newest pass first. A module's migration adds its own section.

## CTA-113 — the rest of the app: Home, Analyses, Repertoires, the Library, Openings

**Status: not yet run.** The scripts are [§3.6–3.14](./screen-reader-testing.md#36-home---cta-113);
the maintainer runs them on the PR's branch and fills the rows. Until then,
what automation can check is checked: axe on every screen's main states, the
keyboard walks with `userEvent`, and every page's outline
(`src/pageOutline.test.tsx`).

Build: the CTA-113 branch, `yarn dev` (or `yarn build && yarn preview`).

| Reader + browser | Versions | System | Date | Tester |
| --- | --- | --- | --- | --- |
| Orca + Firefox | Orca ___, Firefox ___ | ___ | ___ | ___ |
| NVDA + Firefox / Chrome | NVDA ___, ___ | Windows ___ | ___ | ___ |
| VoiceOver + Safari | macOS ___, Safari ___ | macOS ___ | ___ | ___ |

| Screen | Reader + browser | Language | Date | Result | Notes / issue |
| --- | --- | --- | --- | --- | --- |
| Home — `/` | Orca + Firefox | English | | | |
| Home — `/` | Orca + Firefox | Hebrew | | | |
| Saved analyses — `/tools/analysis/saved` | Orca + Firefox | English | | | |
| Saved analyses — `/tools/analysis/saved` | Orca + Firefox | Hebrew | | | |
| The Analysis Board — `/tools/analysis` | Orca + Firefox | English | | | |
| The Analysis Board — `/tools/analysis` | Orca + Firefox | Hebrew | | | |
| A saved analysis' settings | Orca + Firefox | English | | | |
| A saved analysis' settings | Orca + Firefox | Hebrew | | | |
| Repertoires — the list | Orca + Firefox | English | | | |
| Repertoires — the list | Orca + Firefox | Hebrew | | | |
| Repertoires — `/repertoires/new` | Orca + Firefox | English | | | |
| Repertoires — `/repertoires/new` | Orca + Firefox | Hebrew | | | |
| The repertoire player and a game | Orca + Firefox | English | | | |
| The repertoire player and a game | Orca + Firefox | Hebrew | | | |
| A repertoire's settings | Orca + Firefox | English | | | |
| A repertoire's settings | Orca + Firefox | Hebrew | | | |
| The Library — `/library` | Orca + Firefox | English | | | |
| The Library — `/library` | Orca + Firefox | Hebrew | | | |
| A collection — `/library/<c>` | Orca + Firefox | English | | | |
| A collection — `/library/<c>` | Orca + Firefox | Hebrew | | | |
| Adding a collection and the import popup | Orca + Firefox | English | | | |
| Adding a collection and the import popup | Orca + Firefox | Hebrew | | | |
| A Library game — `/library/<c>/<n>` | Orca + Firefox | English | | | |
| A Library game — `/library/<c>/<n>` | Orca + Firefox | Hebrew | | | |
| The Openings explorer — `/openings` | Orca + Firefox | English | | | |
| The Openings explorer — `/openings` | Orca + Firefox | Hebrew | | | |
| The Library and a collection | NVDA or VoiceOver | English | | | |
| The Analysis Board | NVDA or VoiceOver | English | | | |

### Issues

| # | Screen, step | Reader | Expected | Heard | Where it went |
| --- | --- | --- | --- | --- | --- |
| — | not yet run | | | | |

## CTA-112 — the Engine and Settings screens, the gallery's patterns and blocks

**Status: passed** — the maintainer's check, 2026-09-29, on the PR's branch
(#123): "somehow works", no issue reported. The reader, its version and the
languages were not recorded, so the rows below stay blank; a later pass that
records them (and the NVDA or VoiceOver half) fills them in.

Build: `development` at the CTA-112 merge, `yarn dev` (or `yarn build && yarn preview`).

| Reader + browser | Versions | System | Date | Tester |
| --- | --- | --- | --- | --- |
| Orca + Firefox | Orca ___, Firefox ___ | ___ | ___ | ___ |
| NVDA + Firefox / Chrome | NVDA ___, ___ | Windows ___ | ___ | ___ |
| VoiceOver + Safari | macOS ___, Safari ___ | macOS ___ | ___ | ___ |

| Screen | Reader + browser | Language | Date | Result | Notes / issue |
| --- | --- | --- | --- | --- | --- |
| Lobby — `/engine/games` | Orca + Firefox | English | | | |
| Lobby — `/engine/games` | Orca + Firefox | Hebrew | | | |
| Play with Engine — `/engine/play` | Orca + Firefox | English | | | |
| Play with Engine — `/engine/play` | Orca + Firefox | Hebrew | | | |
| Masked Pieces — `/engine/masked` | Orca + Firefox | English | | | |
| Masked Pieces — `/engine/masked` | Orca + Firefox | Hebrew | | | |
| Settings → Export | Orca + Firefox | English | | | |
| Settings → Export | Orca + Firefox | Hebrew | | | |
| Settings → Import (and its two dialogs) | Orca + Firefox | English | | | |
| Settings → Import (and its two dialogs) | Orca + Firefox | Hebrew | | | |
| Settings → Storage | Orca + Firefox | English | | | |
| Settings → Storage | Orca + Firefox | Hebrew | | | |
| Settings → Appearance | Orca + Firefox | English | | | |
| Settings → Appearance | Orca + Firefox | Hebrew | | | |
| The app shell: skip link, landmarks, titles, focus on a move | Orca + Firefox | English | | | |
| The app shell: skip link, landmarks, titles, focus on a move | Orca + Firefox | Hebrew | | | |
| Gallery: DataTable, PlayedGamesTable, StorageTable | Orca + Firefox | English | | | |
| Gallery: TreeView, FolderTree (both directions) | Orca + Firefox | English | | | |
| Gallery: PanelTabs, the import dialogs | Orca + Firefox | English | | | |
| Lobby — `/engine/games` | NVDA or VoiceOver | English | | | |
| Play with Engine — `/engine/play` | NVDA or VoiceOver | English | | | |
| Masked Pieces — `/engine/masked` | NVDA or VoiceOver | English | | | |
| Settings — all four tabs | NVDA or VoiceOver | English | | | |
| The app shell | NVDA or VoiceOver | Hebrew | | | |

### Issues

| # | Screen, step | Reader | Expected | Heard | Where it went |
| --- | --- | --- | --- | --- | --- |
| — | none reported | | | | |
