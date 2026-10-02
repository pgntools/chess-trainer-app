# The front page's sample data

What the front page's demo boards replay (CTA-126,
`src/views/home/samples.ts`) — bundled as text and parsed the first time a
board asks.

| File | What it is | How the board reads it |
| --- | --- | --- |
| `game.pgn` | one game — Morphy's Opera Game, Paris 1858 | its moves (and any side lines): the next move's arrow, the game's line |
| `repertoire.pgn` | a small 1. e4 repertoire for White, side lines and all | each branch weighted by its play chance — `{ prc:N }` on the move, else the lines under it (`src/lib/playChance.ts`), as the repertoire trainer plays it |
| `collection.pgn` | a slice of a Library collection: the first 24 games of `src/data/library/Capablanca.pgn` | merged into the opening tree the Library's opening-moves filter draws: each move with its games, their share and their results |

**Swapping one** is replacing the file: any PGN that parses from the standard
start. Keep the files small — they are in the front page's bundle. If a
sample's subject changes, change its title and line in the catalogs
(`home.samples.<id>` in `src/locales/en.ts` and `he.ts`) and the assertions
of `src/views/home/samples.test.ts`.

This folder is not the Library's: `scripts/wirepgn.js` and
`src/lib/shippedCollections.ts` read `src/data/library/` only.
