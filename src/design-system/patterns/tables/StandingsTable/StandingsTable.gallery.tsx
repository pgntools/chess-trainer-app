import type { ReactNode } from "react";
import Box from "@mui/material/Box";

import {
  DEMO_HEBREW_NAMES,
  DEMO_LABELS,
  DEMO_LEGEND,
  DEMO_LONG_NAMES,
  DEMO_NAMES,
  DEMO_TIE_BREAKS,
  demoLeague,
  demoNames,
  standingsRowsOf,
  type DemoLeagueOptions,
} from "../../../gallery/demoLeague";
import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import type { PatternSectionId } from "../../sections";
import StandingsTable, { type StandingsTableProps } from "./StandingsTable";

const LABELS = { ...DEMO_LABELS, round: (round: number) => `Round ${round}` };
const TITLES = ["Dr", "Prof", undefined, "Dr"];
const CITIES = ["London", "Manchester", "New York", undefined];
const extras = (index: number) => ({
  prefix: TITLES[index % TITLES.length],
  suffix: CITIES[index % CITIES.length],
  rating: index % 5 === 3 ? undefined : 2400 - index * 37,
});
const points = (value: number) => value.toFixed(1);
/** The leader alone, one round in. */
const ONE_ROW = standingsRowsOf(demoLeague({ names: DEMO_NAMES.slice(0, 2), rounds: 5, playedRounds: 1, extras }), 5).slice(0, 1);

/**
 * A demo's box: a definite height and the preview's own width (it asks for
 * none and takes all there is), so the frame scrolls inside it — both ways —
 * as it does in a screen, rather than the gallery growing to fit the table.
 */
const box = (children: ReactNode, height = 320) => (
  <Box sx={{ height, width: 0, minWidth: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>{children}</Box>
);

/** The table over a made-up league of `rounds` rounds; `props` adds a demo's own. */
const demo = (league: Omit<DemoLeagueOptions, "rounds">, rounds: number, props: Partial<StandingsTableProps> = {}, height?: number) =>
  box(
    <StandingsTable
      rows={standingsRowsOf(demoLeague({ ...league, rounds }), rounds)}
      rounds={rounds}
      labels={LABELS}
      tieBreaks={DEMO_TIE_BREAKS}
      formatPoints={points}
      legend={DEMO_LEGEND}
      emptyLabel="No games yet"
      ariaLabel="Standings"
      testId="gallery-standings"
      // A demo names its table its own way (a caption), so the name above gives way to it.
      {...(props as object)}
    />,
    height,
  );

const gallery: GalleryModule<PatternSectionId> = {
  section: "tables",
  title: "StandingsTable",
  demos: [
    {
      name: "Eight members over five rounds — a win, a draw, a loss, an unfinished game (*), a round sat out (–); titles, where from, ratings, two tie-breaks",
      render: () => demo({ names: DEMO_NAMES, extras, unfinished: true, absent: (index, round) => index === 5 && round === 2 }, 5),
    },
    {
      name: "The bare table — no rating column, no tie-breaks, no legend, the points as they are",
      render: () =>
        demo({ names: DEMO_NAMES.slice(0, 4) }, 3, { labels: { ...LABELS, rating: undefined }, tieBreaks: undefined, formatPoints: undefined, legend: undefined }, 220),
    },
    { name: "Still being read", render: () => demo({ names: [] }, 5, { loading: true, loadingLabel: "Reading…" }, 160) },
    { name: "No games yet", render: () => demo({ names: [] }, 5, {}, 160) },
    { name: "One row — the rounds after the first still to come", render: () => demo({ names: [] }, 5, { rows: ONE_ROW }, 160) },
    {
      name: "Ninety-nine rows, no paging — the rows scroll under the header",
      render: () => demo({ names: demoNames(99), extras, unfinished: true, absent: (index, round) => (index + round) % 9 === 0 }, 9, { density: "dense" }, 360),
    },
    {
      name: "Ninety-nine rows, paged — 25 a page, the pager under the frame, each row keeping its own rank (CTA-128)",
      render: () => (
        <WithState initial={{ page: 0, rowsPerPage: 25 }}>
          {(state, setState) =>
            demo({ names: demoNames(99), extras }, 5, {
              density: "dense",
              paging: {
                ...state,
                onPageChange: (page) => setState((old) => ({ ...old, page })),
                onRowsPerPageChange: (rowsPerPage) => setState({ page: 0, rowsPerPage }),
                labelRowsPerPage: "Rows per page",
              },
            }, 420)
          }
        </WithState>
      ),
    },
    {
      name: "Titles as chips, federations as flags — a code with no flag falls back to its words (CTA-128)",
      render: () =>
        demo({ names: DEMO_NAMES.slice(0, 6), extras }, 4, {
          rows: standingsRowsOf(demoLeague({ names: DEMO_NAMES.slice(0, 6), rounds: 4, extras }), 4).map((row, index) => ({
            ...row,
            badge: ([
              { label: "GM", tone: "warning", name: "Grandmaster" },
              { label: "IM", tone: "info", name: "International Master" },
              { label: "FM", tone: "success", name: "FIDE Master" },
              { label: "CM", tone: "secondary", name: "Candidate Master" },
              undefined,
              { label: "WGM", tone: "warning", name: "Woman Grandmaster" },
            ] as const)[index],
            flag: [
              { code: "gb-eng", label: "England" },
              { code: "de", label: "Germany" },
              { code: "us", label: "United States" },
              undefined,
              { code: "zz", label: "Nowhere" },
              { code: "in", label: "India" },
            ][index],
            suffix: ["ENG", "GER", "USA", undefined, "ZZZ", "IND"][index],
          })),
        }, 300),
    },
    {
      name: "Names and results as links — a name to the player's games, a result to its game, each a 24 px target (CTA-128)",
      render: () =>
        demo({ names: DEMO_NAMES.slice(0, 4), extras }, 3, {
          rows: standingsRowsOf(demoLeague({ names: DEMO_NAMES.slice(0, 4), rounds: 3, extras }), 3).map((row, index) => ({
            ...row,
            link: { href: `#player-${index + 1}` },
            rounds: row.rounds.map((results, round) => results.map((result) => (result.outcome === "none" ? result : { ...result, link: { href: `#game-${index + 1}-${round + 1}` } }))),
          })),
        }, 240),
    },
    { name: "Thirty rounds — the frame scrolls sideways", render: () => demo({ names: demoNames(12), extras }, 30) },
    { name: "Long names — one line each, and a sideways scroll", render: () => demo({ names: DEMO_LONG_NAMES, extras }, 3, {}, 240) },
    {
      name: "Hebrew names, named by a caption (switch the direction to RTL)",
      render: () => demo({ names: DEMO_HEBREW_NAMES, unfinished: true }, 5, { ariaLabel: undefined, caption: "טבלת הדירוג" }),
    },
    { name: "The header not sticky", render: () => demo({ names: demoNames(20), extras }, 5, { stickyHeader: false }, 240) },
  ],
};

export default gallery;
