# The front page's sample data

The sample repertoires a front-page `<RepertoireBoard fallback="…" />` shows
when the repertoire it names is not on the reader's device (CTA-126,
`src/views/home/repertoireSamples.ts`) — repertoires are the reader's own,
and none ships with the app. Bundled as text and parsed the first time a
board asks.

| File | `fallback` | Played from | What it is |
| --- | --- | --- | --- |
| `repertoires/e4-white.pgn` | `e4-white` | White | 1. e4 against 1... e5, the Sicilian, the French and the Caro-Kann |
| `repertoires/caro-kann-black.pgn` | `caro-kann-black` | Black | the Caro-Kann against 2. d4, 2. Nc3 and 2. c4, the Advance and the Exchange |

Each branch is weighted by its play chance — `{ prc:N }` on the move, else the
lines under it (`src/lib/playChance.ts`) — as the repertoire trainer plays it.

**Adding one** is a PGN file here, an entry in `repertoireSamples.ts` (its id
and side) and its name under `home.repertoire.samples` in both catalogs
(`src/locales/en.ts`, `he.ts`). Keep the files small — they are in the front
page's bundle. `src/views/home/repertoireSamples.test.ts` checks they read.

The games the page shows are not here: they are the Library's shipped
collections (`src/data/library/`), embedded by address.
