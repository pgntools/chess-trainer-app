import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { TeamTournament } from "../../../lib/teamTournament";
import type { BlockFamilyId } from "../../families";
import { CLUB_LEAGUE, EMPTY, HEBREW, NATIONS } from "./fixtures";
import TeamStandingsTable, { type TeamStandingsTableProps } from "./TeamStandingsTable";

/** The block in a box of a definite height and the preview's own width, so the frame scrolls inside it, both ways. */
const demo = (tournament: TeamTournament | undefined, ariaLabel: string, height = 300, extra: Partial<TeamStandingsTableProps> = {}) => (
  <Box sx={{ height, width: 0, minWidth: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
    <TeamStandingsTable tournament={tournament} ariaLabel={ariaLabel} testId="gallery-team-standings" {...extra} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "TeamStandingsTable",
  demos: [
    {
      name: "A club league — board points in each round's cell, toned as the match went; a match with a game unfinished (*); a round with no match (–)",
      render: () => demo(CLUB_LEAGUE, "Club league — standings"),
    },
    {
      name: "National teams — each its flag, the one its players all share; a team of mixed federations none (CTA-128)",
      render: () => demo(NATIONS, "Nations' cup — standings", 260),
    },
    { name: "Still being read", render: () => demo(undefined, "Team standings, loading", 160) },
    { name: "A file with no game in it", render: () => demo(EMPTY, "Team standings, empty", 160) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW, "ליגה — טבלה", 180, { density: "dense" }) },
    {
      name: "Linked (CTA-128) — each team's name to its games, each round's match to its first board",
      render: () =>
        demo(CLUB_LEAGUE, "Club league — standings", 300, {
          teamLink: (team) => ({ href: `#team-${encodeURIComponent(team)}` }),
          gameLink: (game) => ({ href: `#game-${game + 1}` }),
        }),
    },
  ],
};

export default gallery;
