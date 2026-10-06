---
paths:
  - "src/lib/tournament*"
  - "src/lib/knockout*"
  - "src/lib/match.*"
  - "src/lib/teamTournament*"
  - "src/lib/federations*"
  - "src/lib/tournamentKind*"
  - "src/views/library/TournamentCollection.tsx"
  - "src/blocks/tables/tournamentTable.ts"
  - "src/blocks/tables/SwissStandingsTable/**"
  - "src/blocks/tables/RoundRobinCrossTable/**"
  - "src/blocks/tables/KnockoutBracket/**"
  - "src/blocks/tables/MatchTable/**"
  - "src/blocks/tables/TeamStandingsTable/**"
  - "src/design-system/patterns/tables/StandingsTable/**"
  - "src/design-system/patterns/tables/CrossTable/**"
  - "src/design-system/patterns/tables/Bracket/**"
  - "src/design-system/patterns/tables/paging.ts"
  - "src/design-system/patterns/tables/competitor*"
  - "src/design-system/components/tables/ResultMark/**"
  - "src/design-system/components/tables/LabelChip/**"
  - "src/design-system/components/tables/Flag/**"
  - "src/views/home/frontPage/*Embed*"
  - "src/views/home/frontPage/pgnTournament.ts"
  - "src/views/home/frontPage/embedSource.tsx"
  - "src/views/home/frontPage/tournamentEmbedViews.tsx"
  - "src/lib/embedSource*"
  - "src/views/blog/articles/tournaments/**"
  - "src/views/blog/articles/writing-an-article/demo-tables/**"
  - "src/test/fixtures/tournamentGames.ts"
  - "src/test/fixtures/formatGames.ts"
---

# Tournament tables — and the Blog's tournament articles

Every competition table the app draws, from a PGN of the event's games:
a **Swiss's standings**, a **round robin's crosstable** (single or double),
a **knockout's bracket** (and a double elimination's two, and a team
knockout's), a **two-player match**, a **team event's standings**. Built
ahead of their screen (CTA-120, CTA-128); their consumers are the Blog —
the *Tournaments* folder (`/blog/tournaments/…`), and *Writing an article →
Demo tables*, a page per format
(`/blog/writing-an-article/demo-tables/<format>`, its files under
`articles/writing-an-article/demo-tables/`) — and, since CTA-142, **the
Library's tournament view** (§4.1): a collection marked as a tournament
shows its table on its Info tab.

This file is the one reference: the layers, how each format is read from its
tags, the rules each table ranks by, the MDX embeds with every prop, how a
page is added and credited, how a new format or table is added, and how all
of it is tested. The component-level references stay where they are
(`docs/design/sections/patterns/tables.md`, `docs/design/sections/tables.md`,
`docs/design/hierarchy.md`); this file points at them.

---

## 1. The layers

Each format is the component hierarchy (CLAUDE.md, `docs/design/hierarchy.md`)
top to bottom — a pure reader in `src/lib/`, a generic pattern, a
presentational block, an MDX embed:

```
an article (.mdx)        import games from "./event.pgn?raw"   <KnockoutBracket pgn={games} />
   │
embed  views/home/frontPage/…Embed.tsx   <EmbedSource> reads any source (embedSource.tsx), a view draws it
   │
block  blocks/tables/<Block>/            the words (tournament.*), chips and flags, a11y labels
   │
pattern design-system/patterns/tables/   generic: StandingsTable · CrossTable · Bracket (+ paging)
   │
base   design-system/components/tables/  ResultMark · LabelChip · Flag · TablePager · TableFrame
   │
lib    src/lib/                          tournamentOf · knockoutOf · matchOf · teamTournamentOf · federations
```

| Format | lib (pure, tags only) | pattern | block | MDX embed | demo page |
| --- | --- | --- | --- | --- | --- |
| Swiss | `tournamentOf(headers)` (`SWISS_TIE_BREAKS`) | `StandingsTable` | `SwissStandingsTable` | `<SwissStandingsTable>` | `swiss` (British Ch. 2026) |
| Round robin, single or double | `tournamentOf(headers, ROUND_ROBIN_TIE_BREAKS)` | `CrossTable` | `RoundRobinCrossTable` | `<RoundRobinCrossTable>` | `single-round-robin`, `double-round-robin` |
| Knockout | `knockoutOf(headers)` | `Bracket` | `KnockoutBracket` | `<KnockoutBracket>` | `knockout` (Dutch Ch. 2026) |
| Double elimination | `knockoutOf(headers, { losersFromRound: 51 })` | `Bracket` ×2 | `KnockoutBracket` | `<KnockoutBracket losersFromRound="51">` | `double-elimination` (Esports World Cup 2026) |
| Two-player match | `matchOf(headers)` | `StandingsTable` | `MatchTable` | `<MatchTable>` | `match` (Clutch Chess 2026) |
| Team Swiss / round robin | `teamTournamentOf(headers)` | `StandingsTable` | `TeamStandingsTable` | `<TeamStandingsTable>` | `team` (World Rapid Team 2026); the article `tournaments/olympiad-2026` (both Olympiads, with flags) |
| Team knockout | `knockoutOf(headers)` — teams detected | `Bracket` | `KnockoutBracket` | `<KnockoutBracket>` | `team` (World Blitz Team final) |
| **A Library collection** (Swiss, round robin or match) — **the same embeds, `src="/library/<c>"`** (CTA-140) | the collection's games' tags → `tournamentOf` / `matchOf` | as above | `SwissStandingsTable`, `RoundRobinCrossTable`, `MatchTable` with `playerLink` / `gameLink` | `<SwissStandingsTable src="/library/<c>">` (…); the older `<CollectionTournamentTable _id>`, an alias | `from-a-collection` (the shipped Candidates 2026, `/library/candidates2026`) |
| **A Library collection**: a knockout (players or teams) | `knockoutOf` | `Bracket` (its `link`s, its `games` row) | `KnockoutBracket` with `playerLink` / `gameLink` | `<KnockoutBracket src="/library/<c>">`; the older `<CollectionKnockoutBracket _id>`, an alias | `knockout-from-a-collection` (`/library/netherlands2026`, `/library/worldblitzteam2026`) |
| **A Library collection**: a double elimination | `knockoutOf(headers, { losersFromRound: 51 })` | `Bracket` ×2 | `KnockoutBracket` with `playerLink` / `gameLink` | `<KnockoutBracket src="/library/<c>" losersFromRound="51">`; the older `<CollectionDoubleEliminationBracket _id>`, an alias | `double-elimination-from-a-collection` (`/library/esportsplayin2026`) |
| **A Library collection**: a team Swiss / round robin | `teamTournamentOf` + `teamPlayersOf` | `StandingsTable` | `TeamStandingsTable` with `teamLink` / `gameLink` | `<TeamStandingsTable src="/library/<c>">`; the older `<CollectionTeamStandingsTable _id>`, an alias | `team-from-a-collection` (`/library/worldrapidteam2026`) |

Every reader takes `GameHeaders[]` — `splitPgnGames(pgn).map(readPgnTags)` —
and **replays no move**: a 1,650-game team file reads in ~50 ms.

**What kind of tournament a file is — the guess** (`src/lib/tournamentKind.ts`,
CTA-137; moved from the MDX editor into `src/lib/` by CTA-142, so a shipped
screen can use it): `guessTournamentKind(headers)` → `{ kind, reason, facts }`
— a match (two players), a double elimination (rounds from 51), a knockout
or team knockout (each round's field among the round before's, fewer at the
end), a round robin (≥ 90 % of the pairs met; twice for a double), an
**arena** (no round number in any game and more games than players —
Lichess writes `Round "-"`; CTA-142), else a Swiss or a team event. `reason` is one English line (the MDX editor's);
`facts` (competitors, rounds, a knockout's field round by round, twice, teams)
let a screen say it in the reader's language
(`library.settings.suggestion.reasons.*`). Its kinds are exactly the
Library's stored formats (`formatOfKind`, `lib/libraryCollections.ts`) —
an arena among them, which has no table: the MDX editor offers the Swiss
standings for one (players ranked by points). Used by the MDX editor (Components' Add a
component, the Components gallery), the Library's settings (the suggested
type), its tournament view (the misfit's suggestion) and `wirepgn
--tournament`. Held to every TWIC file the Blog ships
(`src/lib/tournamentKind.test.ts`).

---

## 2. Reading a PGN — The Week in Chess's conventions

The readers follow how TWIC (theweekinchess.com) writes each format; a file
from elsewhere that writes the same tags reads the same.

| Tag | Read as |
| --- | --- |
| `White` / `Black` | the players. A game naming no one, or the same player twice, is left out. |
| `WhiteFideId` / `BlackFideId` | **who a player is** — the id where there is one (a `"0"` is none), else the name. Two spellings of one FIDE id are one player. |
| `WhiteTitle` / `BlackTitle` | the title chip (§5). A tag one game leaves out is taken from another game of the player's. |
| `WhiteElo` / `BlackElo` | the rating column. |
| `WhiteCountry` / `BlackCountry` | the federation — a **FIDE** 3-letter code (`GER`, `NED`, `ENG`), shown as a flag (§5). **TWIC's files carry none**: the demo pages show no flags. |
| `WhiteTeam` / `BlackTeam` | a team event: **every** game naming both makes the file a team file. |
| `Result` | `1-0`, `0-1`, `1/2-1/2`; anything else (`*`) is an **unfinished** game — shown, scoring nothing. |
| `Round "R.n"` | R is the round. **n depends on the format** — below. |
| `Event` | the table's accessible name ("FIDE Candidates 2026 — crosstable") and the slug of its test ids. |
| `EventRounds` | a Swiss's number of rounds, where the file has fewer. |
| `Board` | a team knockout's board (unused by the readers: the leg is in `Round`). |

What `n` of `Round "R.n"` is:

| Format | `n` | Example |
| --- | --- | --- |
| Swiss, round robin | the board | `"3.2"` round 3, board 2 |
| Knockout | the game of the match — **tiebreaks continue the count** | `"2.5"` round 2, its fifth game (a rapid tiebreak) |
| Final in parts | the part and game, as TWIC numbers them — one match all the same | `"3.11"`–`"3.14"`, `"3.21"`–`"3.24"` |
| Double elimination | as a knockout; the **losers' bracket's rounds start at 51** | `"51.1"` the losers' bracket's round 1 |
| Team Swiss | the file's running count of boards over the round | `"1.7"`–`"1.12"`: round 1, the second match's six boards |
| Team knockout | the **leg** (a mini-match on every board at once); `Board` is the board | `"2.3"` round 2, leg 3 |
| Match | absent (`Round "5"`): the game's number | |

**Shown as the file has it.** A table never invents: no byes, no forfeits, no
official standings. A round with no game for a player is a dash — "no game in
the file", not a bye, worth nothing — so a **partial file** (TWIC often has
only the top boards of a Swiss: the Werner-Obermeyer and the Sofia Cup) gives
the standings of the games in it, and the article says so.

---

## 3. The rules each table ranks by

| Table | Points | Then | Then |
| --- | --- | --- | --- |
| Swiss standings | game points | **Buchholz** (the opponents' points) | **Sonneborn-Berger** (beaten opponents' points + half the drawn ones') |
| Round-robin crosstable | game points | Sonneborn-Berger (Buchholz is near-constant when everyone meets everyone) | |
| Team standings | **match points**: 2 a won match, 1 a drawn (the Olympiad's, `TEAM_MATCH_POINTS`) | **board points** (the games' points summed) | the team's name |
| Match | game points, every game 1 — an event that weighs its games (Clutch Chess) keeps its own score, which no tag carries | | |

After the tie-breaks: the higher rating, then the name — so the order is total
and every rank unique. An unfinished game counts for no tie-break; a team
match with an unfinished game scores no match point (its board points so far
show, toned as unfinished).

**A knockout match** is every game two sides play in a round, tiebreaks
included. Its **winner** is the higher score; on a level score (an Armageddon
draw, a tiebreak the file leaves out) the side that **plays on in a later
round of the same bracket**; else none (no side marked). A **team knockout**
is scored in **legs**: each leg won on its board points (a drawn leg ½ each),
the match's score the legs, the board points kept beside them. **A match for
third place** — in a bracket's last round, between two sides that both lost
the round before — is marked `thirdPlace`, ordered after the final, and
captioned; its round is still titled "Final". A double elimination's
winners' and losers' brackets are each a bracket of their own.

**Bracket order** is computed from the last round back: the two matches whose
winners meet next sit side by side. A plain knockout's last rounds take their
names when they halve to the final (Quarter-finals, Semi-finals, Final);
otherwise, and in a double elimination, "Round n".

---

## 4. The MDX embeds

Registered by name in `views/home/frontPage/index.ts` (`mdxComponents`), with
no `import`; documented in `views/home/frontPage/README.md`.

**One component, any source** (CTA-140): each table is **one** embed, and
only its source changes — `pgn={games}` (or `load`) for a PGN of the
article's own, or `src="<app path>"` for anything the app keeps
(`lib/embedSource.ts`: a Library collection `/library/<c>`, or a saved
analysis, a played game, a repertoire — pasted as the address bar shows
it). `<EmbedSource>` (`frontPage/embedSource.tsx`) reads it — a reader per
kind of source, so each calls only its own hooks — and hands one
`SourceRead` (the games, their tags, the event, and a Library source's
links) to the table's view (`frontPage/tournamentEmbedViews.tsx`:
`StandingsView`, `KnockoutView`, `TeamStandingsView`). A Library source's
names and results link into the Library (`playerLink`, `gameLink`,
`teamLink`, on by default); a PGN has nowhere to link. The `Collection…`
embeds of CTA-128 are **aliases** now (`MDX_ALIASES`), kept for the
articles written with them; the MDX editor writes the new form. A PGN of
the article's own is imported beside it with `?raw`:

```mdx
import games from "./chgbr26.pgn?raw"

<SwissStandingsTable pgn={games} density="dense" rowsPerPage="25" />
```

| Embed | Props | Test ids |
| --- | --- | --- |
| `<SwissStandingsTable>` | `pgn`, `load` or `src`, `density?: "normal" \| "dense"`, `rowsPerPage?`, `playerLink?` / `gameLink?` (a Library source) | `tournament-standings-<event slug>` |
| `<RoundRobinCrossTable>` | `pgn`, `load` or `src`, `density?`, `rowsPerPage?`, `playerLink?` / `gameLink?` | `tournament-crosstable-<event slug>` |
| `<KnockoutBracket>` | `pgn`, `load` or `src`, `losersFromRound?` (a double elimination: `"51"`), `density?`, `playerLink?` / `gameLink?` | `tournament-bracket-<event slug>` (`-winners`, `-losers`) |
| `<MatchTable>` | `pgn`, `load` or `src`, `density?`, `rowsPerPage?`, `playerLink?` / `gameLink?` | `tournament-match-<event slug>` |
| `<TeamStandingsTable>` | `pgn`, `load` or `src`, `density?`, `rowsPerPage?`, `teamLink?` / `gameLink?` | `tournament-team-standings-<event slug>` — a Library source's, as each alias's below |
| `<CollectionTournamentTable>` | `_id="/library/<c>"`, `format?: "swiss" \| "roundRobin" \| "match"`, `playerLink?` (default on), `gameLink?` (default on), `density?`, `rowsPerPage?` | `tournament-collection-<c>-<format>` (`-loading` while read) |
| `<CollectionKnockoutBracket>` | `_id="/library/<c>"`, `losersFromRound?`, `playerLink?` (default on), `gameLink?` (default on), `density?` | `tournament-collection-<c>-knockout` (`-winners`, `-losers`) |
| `<CollectionDoubleEliminationBracket>` | as `<CollectionKnockoutBracket>`, `losersFromRound` `51` by default | `tournament-collection-<c>-doubleElimination` |
| `<CollectionTeamStandingsTable>` | `_id="/library/<c>"`, `teamLink?` (default on), `gameLink?` (default on), `density?`, `rowsPerPage?` | `tournament-collection-<c>-team` |

**`<CollectionTournamentTable>`** (CTA-128) — a tournament from the
**Library** instead of a PGN beside the article: add the event's PGN to the
Library, mark it a tournament in its settings (or pass `format`), and embed it
by its address. It reads the collection's **games** (their own tags — titles,
FIDE ids, countries — which the index rows do not keep), exactly as the PGN
embeds read a file. The format: `format`, else the collection's stored mark
where its games still share one event (`isTournamentCollection`), else a
Swiss. A shipped tournament carries the mark its manifest entry names
(CTA-142, `wirepgn --tournament`) — the demo still names its format. **The links**, both on by default:
`playerLink` makes each name a link to the collection's table filtered by that
player (`/library/<c>?player=<name>`), `gameLink` each result a link to its
game (`/library/<c>/<n>`, `n` the game's place in the collection) with the
article as `state.from`, so the board's back button returns to it;
`playerLink={false}` / `gameLink={false}` leave them text. An upload is on its
own device only: an article naming one says "not in this browser's Library"
to every other reader — the demo uses the shipped Candidates 2026.

**The knockouts and team events from the Library** (CTA-128) are three
aliases of the tables over `src` (CTA-140), each a fixed table (no
`format`), read by `<EmbedSource>`'s Library reader (the collection's games'
tags, its event's name, the two links):

- **`<CollectionKnockoutBracket>`** — `KnockoutBracket` over `knockoutOf`; a
  team knockout too, where every game names its teams.
  **`<CollectionDoubleEliminationBracket>`** is the same with
  `losersFromRound` defaulting to TWIC's `51`.
- **`<CollectionTeamStandingsTable>`** — `TeamStandingsTable` over
  `teamTournamentOf`; a collection whose games name no teams says so
  (`tournament.embed.notATeamEvent`).
- **A name's link** — a player's, `?player=<name>`; **a team's, every one of
  its players** (`teamPlayersOf`: every name its games give it,
  `?player=a&player=b…`), since the Library filters by player, not by team —
  its filter keeps a game any of them played, a name matched as a
  substring, so a player whose name is part of another's brings that
  player's games too.
- **A game's link** — in a bracket, a row of links under each match
  (`Bracket`'s `games`, a list named "Games"): **one per game**, showing the
  first side's points (1, ½, 0) and read whole ("Game 1: Vrolijk, Liam –
  Tiviakov, Sergei, 0–1"); in a **team** match **one per leg** ("Legs"),
  showing the leg's board points both ways and opening its first board. In
  the team standings, **each round's cell opens its match's first board**
  (`TeamMatch.games[0]`). A team match's boards follow one another in a
  TWIC file, so the Library board's Next walks the rest.
- The ids add the table's word, not its format: `-knockout`,
  `-doubleElimination`, `-team` — so one collection shows once per embed on
  a page (the demo pages show the links-off markup without rendering it).

- **`load`** in place of `pgn`, for a large file (CTA-128): a function that
  imports it — `load={() => import("./olym26.pgn?raw")}` — so the file is a
  chunk of its own, fetched when the page opens, and the article does not
  carry it. The table shows its "reading" state meanwhile (named "The
  tournament — …", test id `tournament-…-loading`), then the event's. Every
  table embed takes it (`usePgnSource`, `pgnTournament.ts`); `load` is
  called once, on mount; `pgn` wins if both are given; a load that fails is
  the unreadable warning. Use it from ~1 MB up: the Olympiad's 5 MB files.
- **`rowsPerPage`** pages a long table — **25, 50, 100 or 250** (the one
  `TABLE_PAGE_SIZES`); any other value, or none, shows every row. The pager
  sits under the table and each row keeps its own rank. The bracket has no
  paging: it is not a table of rows.
- **A PGN with no game** shows a warning in the table's place
  (`tournament.embed.unreadable`); `<MatchTable>` over games that are not all
  between the same two players says it is not a match. `Blog.test.tsx` fails
  an article whose table cannot read its PGN.
- **Each table is named after its `Event` tag**, so embed one event's table
  once per page (its test ids would repeat).
- More examples:

```mdx
import cand from "./wchcand26.pgn?raw"
import ko from "./chned26.pgn?raw"
import playIn from "./esportswcuppl26.pgn?raw"
import match from "./clutchlegends26.pgn?raw"
import rapid from "./fidewrt26.pgn?raw"
import blitz from "./fidewrbtf26.pgn?raw"

<RoundRobinCrossTable pgn={cand} />
<KnockoutBracket pgn={ko} />
<KnockoutBracket pgn={playIn} losersFromRound="51" />
<MatchTable pgn={match} />
<TeamStandingsTable pgn={rapid} density="dense" rowsPerPage="25" />
<KnockoutBracket pgn={blitz} density="dense" />
```

A game of the same PGN goes on a board with `<InlinePgnGame pgn={games}
game="13" start="27" />` (`game` is 1-based in the file) — the tournament
articles' "Selected games" sections. **Chess960 boards are not supported**:
`chess.js` does not castle in 960, so a 960 event (the Clutch Chess match)
shows its table and no boards, and its page says so.

### 4.1 The Library's tournament view (CTA-142)

A collection marked as a tournament opens at `/library/<collection>` on
Info, Participants and Games tabs (`views/library/TournamentCollection.tsx`;
the whole of it is `game-collections.md` §6.4.3). Its Info tab draws the
table for the stored format **with the embeds' own views** — `<EmbedSource
src="/library/<c>">` and `StandingsView` / `KnockoutView` /
`TeamStandingsView` — so the Library and the Blog draw a collection the
same way; only the player links differ (the view's open its Games tab,
`?tab=games&player=…`). The format → table map:

| Stored format | Table |
| --- | --- |
| `swiss`, `roundRobin`, `match` | `StandingsView` (`SwissStandingsTable`, `RoundRobinCrossTable`, `MatchTable`), 50 rows a page |
| `knockout`, `teamKnockout` | `KnockoutView` (teams detected from the tags) |
| `doubleElimination` | `KnockoutView` with `losersFromRound` 51 |
| `teamSwiss` | `TeamStandingsView`, 50 rows a page |
| `arena` | none yet — said so, pointing at the Participants tab (every player's record) |

Its Participants tab reads every player's record with
`lib/tournamentParticipants.ts` (`participantsOf` over `tournamentOf`, so a
player is told apart, titled and rated as the tables do it; `topPlayersOf`),
for a team event beside `teamTournamentOf` and `teamPlayersOf`.

---

## 5. What the tables show

- **A result** is a `ResultMark`: `1`, `½`, `0` toned (win bold), `*`
  unfinished, `–` no game; read by its words ("Round 3, White against Giri,
  Anish: draw"). A team's round cell shows its **board points** ("4½",
  `ResultMark`'s `glyph`), toned as the match went.
- **A title is a chip** (`LabelChip`, `titleBadgeOf` in
  `blocks/tables/tournamentTable.ts`): GM and WGM gold (`warning`), IM and WIM
  blue (`info`), FM and WFM green (`success`), CM and WCM purple
  (`secondary`), any other title the `primary` colour. Each tone's
  `contrastText` on its `main` is measured in every theme. A FIDE title is
  read in full (`tournament.titles.*`, "Grandmaster"), shown on hover.
- **A federation is a flag** (`Flag` over the `flag-icons` package, MIT):
  `lib/federations.ts` turns a FIDE code into a flag code (FIDE's codes are
  the IOC's, not ISO's — `GER` is `de`, `NED` `nl`, `SUI` `ch`; `ENG`, `SCO`,
  `WLS` have their own flags) and names it in the reader's language
  (`Intl.DisplayNames`). A code with no flag shows its letters. Each SVG is its
  own file, fetched when shown (`?url&no-inline`); a team's name is **never**
  guessed into a flag — flags come from the tags alone. **A team's flag** is
  its players' federation where every tagged game of theirs agrees
  (`teamTournamentOf`, `knockoutOf`: an Olympiad's national teams); a club of
  several federations, or players under FIDE's flag (`FID`, no flag), has
  none.
- **Paging** — every table pattern takes the optional `paging` prop
  (`TablePaging`, `patterns/tables/paging.ts`, `DataTable`'s shape); the
  patterns' conventions test fails a `…Table` pattern without it. **A table
  added later takes it too.**
- **Links** (CTA-128) — a block takes optional `playerLink(player)` and
  `gameLink(game)` (`TournamentLinks`, `blocks/tables/tournamentTable.ts`; a
  `LinkTarget` or `undefined`): the name becomes a link (its chip and flag
  outside it), and every result a link read by its words, a 24 px target
  (`Competitor.link`, `ResultEntry.link` in the patterns). Swiss standings,
  the crosstable and the match table take them; the bracket and the team
  table do not.
- **Accessibility** — every table named by its event; rows' (and a
  crosstable's columns') headers real `th`s; a bracket a named region that
  scrolls sideways, each round a named list, each match read whole ("Burg,
  Twan 1½, Sokolov, Ivan 2½: Sokolov, Ivan goes through"); the words follow
  the language (`tournament.*`, `en` and `he`).

---

## 6. Adding a tournament article or a demo page

1. **The PGN** beside the article, under `src/views/blog/articles/tournaments/`
   — TWIC's own file name (`chgbr26.pgn`). One copy: the articles share it
   (`../../tournaments/chgbr26.pgn?raw` from `writing-an-article/demo-tables/`).
2. **The article** `…/tournaments/<name>.mdx` (or
   `writing-an-article/demo-tables/<format>.mdx`):
   an intro, the table, the markup or selected games, and **a Source
   section crediting TWIC** — the event's page and its PGN:

   ```mdx
   ## Source

   The games are from [The Week in Chess](https://theweekinchess.com) (TWIC), by Mark Crowther — the event's page, [<Event title>](https://theweekinchess.com/chessnews/events/<slug>), and its PGN, [<file>.pgn](https://theweekinchess.com/assets/files/pgn/<file>.pgn).
   ```

   A file with only TWIC's issue in its tags credits the issue
   (`https://theweekinchess.com/html/twic<n>.html#<anchor>`). Every fact the
   prose states is read off the file (`tournamentOf` & co. in a scratch test).
3. **Its frontmatter** (CTA-135) is the whole registration: `title`,
   `summary` and `date` (the event's, from its PGN's `EventDate` — the
   *Tournaments* folder sorts newest first) at the top of the `.mdx`, and a
   frontmatter-only `<path>.he.mdx` with its Hebrew `title` and `summary`; a
   new folder is a directory with an `index.mdx` naming it. The Blog's one
   route serves it and the browser pass reads it from the file; add
   `ready: "tournament-…-<event slug>"` to `BLOG_READY` in
   `e2e/a11y/routes.ts` (and the path to `BLOG_SAMPLE` for a new kind of
   table). `articles.test.ts` holds the folder counts and orders.
4. `npx vitest run src/views/blog src/views/home`.

## 7. Adding a format or a table

0. **the Library's format** — a value appended to `TOURNAMENT_FORMATS`
   (`lib/libraryCollections.ts`; never removed or reordered away), its name
   and one-line description in `library.settings.formats` /
   `formatDescriptions` (both catalogs), a case in the tournament view's
   table switch (`TournamentCollection.tsx`), and — where the tags can tell
   it — a kind in `guessTournamentKind` with its reason's words.
1. **lib** — a pure reader over `GameHeaders[]` beside `tournament.ts`
   (reuse `outcomesOf`, `playerOf`, `roundPartsOf`, `POINTS`), with a test on
   a real file (`src/test/fixtures/formatGames.ts`) and on hand-made games.
2. **pattern** — reuse `StandingsTable` / `CrossTable` / `Bracket` if they
   fit (the match and the team standings are `StandingsTable`s); a new table
   pattern is named `…Table` and **takes `paging?: TablePaging`**; docs
   heading in `docs/design/sections/patterns/tables.md`, a gallery, a test.
3. **block** — `src/blocks/tables/<Name>/` (component, test, gallery,
   `fixtures.ts`, `index.ts`), chips and flags through `playerMarks`, words in
   `tournament.*` (both catalogs), a row in `hierarchy.md`'s Blocks table.
4. **embed** — a view in `views/home/frontPage/tournamentEmbedViews.tsx`
   over a `SourceRead` (its `make` in a `useMemo`; the ids a Library
   source's or the event's; `useEmbedPaging`), and
   `views/home/frontPage/<Name>Embed.tsx` — `<EmbedSource>` and the view,
   so it reads every source at once; a line in `mdxComponents`, its table
   and `README.md`; a test in `TournamentTableEmbeds.test.tsx` (and
   `EmbedSource.test.tsx` for a source of its own).
5. **a demo page** (§6) and a row in §1's table here.

---

## 8. Testing

```sh
npx vitest run src/lib/tournament.test.ts src/lib/knockout.test.ts src/lib/match.test.ts src/lib/teamTournament.test.ts src/lib/federations.test.ts src/lib/tournamentKind.test.ts src/lib/tournamentParticipants.test.ts
npx vitest run src/views/library/LibraryTournament.test.tsx   # the Library's tournament view
npx vitest run src/blocks/tables src/design-system/patterns/tables src/design-system/components/tables
npx vitest run src/views/home src/views/blog           # every article renders, every PGN reads
# the gallery's axe matrix for the tournament galleries only (not in the PR gate):
npx vitest run --project gallery -t "KnockoutBracket|MatchTable|TeamStandingsTable|SwissStandingsTable|RoundRobinCrossTable|Bracket|StandingsTable|CrossTable|ResultMark|LabelChip|Flag"
# the browser pass on the tournament routes (after yarn build; A11Y_CHROMIUM in a cloud container — CLAUDE.md):
A11Y_MATRIX=reduced npx playwright test -g "blog-tournaments|seed"
```

- Fixtures: `src/test/fixtures/tournamentGames.ts` (Sofia Cup, Candidates)
  and `formatGames.ts` (the knockout, the double elimination and its final
  stage, the match, the team knockout — the articles' own PGNs). The team
  Swiss's 1.6 MB file is read only by `lib/teamTournament.test.ts`.
- A test lists rows by their **accessible words** with `readText`
  (`src/test/readText.ts`): a chip read in full, a flag by its country —
  "Grandmaster Firouzja, Alireza France", where `textContent` would be
  "GMGrandmaster Firouzja, Alireza ".

## 9. Known limits

- **No Chess960 boards** (§4).
- **No byes, forfeits or official standings** — the file's games only (§2).
- **Flags only where the tags are** — most TWIC files carry no country
  tags (the Olympiads do).
- **Bundle**: an article chunk holds its PGNs (the team page ~1.9 MB, lazy);
  the flags' URL map (~14 KB) is in the main chunk, the 272 SVGs only fetched
  when shown.
- **A team's link is its players'** — the Library filters by player, so a
  team's name links to every one of its players' games (§4); a player whose
  name is part of another's (a substring) brings that player's games too.
  A team match's link opens its first board, not the match.
- **Arenas** have no table, from a PGN or from the Library.
