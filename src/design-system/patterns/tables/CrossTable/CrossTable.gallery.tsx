import type { ReactNode } from "react";
import Box from "@mui/material/Box";

import {
  DEMO_HEBREW_NAMES,
  DEMO_LABELS,
  DEMO_LEGEND,
  DEMO_LONG_NAMES,
  DEMO_NAMES,
  demoNames,
  DEMO_TIE_BREAKS,
  crossTableRowsOf,
  demoLeague,
  type DemoLeagueOptions,
} from "../../../gallery/demoLeague";
import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import type { PatternSectionId } from "../../sections";
import CrossTable, { type CrossTableProps } from "./CrossTable";

const TITLES = ["Dr", "Prof", undefined, "Dr"];
const extras = (index: number) => ({ prefix: TITLES[index % TITLES.length], rating: index % 5 === 3 ? undefined : 2400 - index * 37 });
const points = (value: number) => value.toFixed(1);
/** The opponents' points alone — everyone meets everyone, so the wins say little more. */
const TIE_BREAKS = DEMO_TIE_BREAKS.slice(0, 1);

/**
 * A demo's box: a definite height and the preview's own width (it asks for
 * none and takes all there is), so the frame scrolls inside it — both ways —
 * as it does in a screen, rather than the gallery growing to fit the table.
 */
const box = (children: ReactNode, height = 340) => (
  <Box sx={{ height, width: 0, minWidth: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>{children}</Box>
);

/** The table over a made-up league; `props` adds a demo's own. */
const demo = (league: DemoLeagueOptions, props: Partial<CrossTableProps> = {}, height?: number) =>
  box(
    <CrossTable
      rows={crossTableRowsOf(demoLeague(league))}
      labels={DEMO_LABELS}
      tieBreaks={TIE_BREAKS}
      formatPoints={points}
      legend={DEMO_LEGEND.slice(0, 1)}
      emptyLabel="No games yet"
      ariaLabel="Crosstable"
      testId="gallery-crosstable"
      // A demo names its table its own way (a caption), so the name above gives way to it.
      {...(props as object)}
    />,
    height,
  );

const gallery: GalleryModule<PatternSectionId> = {
  section: "tables",
  title: "CrossTable",
  demos: [
    {
      name: "A double round robin — eight members, fourteen rounds, two results a cell; titles, ratings, a tie-break",
      render: () => demo({ names: DEMO_NAMES, rounds: 14, extras }),
    },
    { name: "A single round robin — one result a cell", render: () => demo({ names: DEMO_NAMES.slice(0, 6), rounds: 5, extras }, {}, 280) },
    {
      name: "An unfinished double round robin — nine of fourteen rounds played, a game still going (*): cells with fewer results than the rest",
      render: () => demo({ names: DEMO_NAMES, rounds: 14, playedRounds: 9, extras, unfinished: true }),
    },
    {
      name: "The bare table — no rating column, no tie-breaks, no legend, the points as they are",
      render: () =>
        demo(
          { names: DEMO_NAMES.slice(0, 4), rounds: 3 },
          { labels: { ...DEMO_LABELS, rating: undefined }, tieBreaks: undefined, formatPoints: undefined, legend: undefined },
          220,
        ),
    },
    { name: "Still being read", render: () => demo({ names: [], rounds: 0 }, { loading: true, loadingLabel: "Reading…" }, 160) },
    { name: "No games yet", render: () => demo({ names: [], rounds: 0 }, {}, 160) },
    { name: "Long names — one line each, and a sideways scroll", render: () => demo({ names: DEMO_LONG_NAMES, rounds: 6, extras }, {}, 260) },
    {
      name: "Hebrew names, named by a caption (switch the direction to RTL)",
      render: () => demo({ names: DEMO_HEBREW_NAMES, rounds: 10, unfinished: true }, { ariaLabel: undefined, caption: "טבלת התוצאות" }),
    },
    {
      name: "Thirty members, paged — 25 rows a page, every member's column kept (CTA-128)",
      render: () => (
        <WithState initial={{ page: 0, rowsPerPage: 25 }}>
          {(state, setState) =>
            demo({ names: demoNames(30), rounds: 3, extras }, {
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
    { name: "Dense, the header not sticky", render: () => demo({ names: DEMO_NAMES, rounds: 7, extras }, { density: "dense", stickyHeader: false }, 260) },
  ],
};

export default gallery;
