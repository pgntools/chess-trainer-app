import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { Arena, ArenaScoring } from "../../../lib/arena";
import type { BlockFamilyId } from "../../families";
import ArenaStandingsTable, { type ArenaStandingsTableProps } from "./ArenaStandingsTable";
import { BIG_ARENA, EMPTY, HEBREW_ARENA, ONE_GAME, TITLED_ARENA } from "./fixtures";

type Scored = Readonly<Record<ArenaScoring, Arena>>;

/**
 * The block on a fixture scored both ways — the switch live — in a box of a
 * definite height and the preview's own width, so the frame scrolls inside
 * it, as it does in a screen.
 */
const demo = (arenas: Scored | undefined, ariaLabel: string, height = 340, extra: Partial<ArenaStandingsTableProps> = {}) => (
  <WithState<{ scoring: ArenaScoring; page: number; rowsPerPage: number }> initial={{ scoring: "lichess", page: 0, rowsPerPage: 25 }}>
    {(state, set) => (
      <Box sx={{ height, width: 0, minWidth: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ArenaStandingsTable
          arena={arenas?.[state.scoring]}
          scoring={state.scoring}
          onScoringChange={(scoring) => set((before) => ({ ...before, scoring, page: 0 }))}
          ariaLabel={ariaLabel}
          testId="gallery-arena-standings"
          {...extra}
          {...(extra.paging !== undefined && {
            paging: {
              ...extra.paging,
              page: state.page,
              rowsPerPage: state.rowsPerPage,
              onPageChange: (page) => set((before) => ({ ...before, page })),
              onRowsPerPageChange: (rowsPerPage) => set((before) => ({ ...before, page: 0, rowsPerPage })),
            },
          })}
        />
      </Box>
    )}
  </WithState>
);

/** Asks the demo for paging — its state is the demo's own. */
const PAGED: Partial<ArenaStandingsTableProps> = {
  paging: { page: 0, rowsPerPage: 25, onPageChange: () => {}, onRowsPerPageChange: () => {}, labelRowsPerPage: "Rows per page" },
};

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "ArenaStandingsTable",
  demos: [
    {
      name: "A titled arena — every mark: wins on fire (warning fill), berserk (a bolt), a draw too early or in a draw streak (0), an unfinished game (*); the switch rescoring as game points",
      render: () => demo(TITLED_ARENA, "Titled Arena June '26 — standings"),
    },
    {
      name: "The same, every name and game a link",
      render: () =>
        demo(TITLED_ARENA, "Titled Arena June '26 — standings, linked", 340, {
          playerLink: (player) => ({ href: `#player-${player.name}` }),
          gameLink: (game) => ({ href: `#game-${game + 1}` }),
        }),
    },
    {
      name: "A big arena — 120 players, 40 games each: long score sheets wrapping, 25 rows a page, dense",
      render: () => demo(BIG_ARENA, "Big Arena — standings", 520, { ...PAGED, density: "dense" }),
    },
    { name: "Still being read", render: () => demo(undefined, "Standings, loading", 180) },
    { name: "A file with no game in it", render: () => demo({ lichess: EMPTY, game: EMPTY }, "Standings, empty", 180) },
    { name: "One game — two rows", render: () => demo(ONE_GAME, "One game — standings", 200) },
    {
      name: "Hebrew names, every game finished (switch the direction to RTL)",
      render: () => demo(HEBREW_ARENA, "ארנה — טבלת הדירוג", 260),
    },
  ],
};

export default gallery;
