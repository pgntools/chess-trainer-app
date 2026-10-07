import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { Knockout } from "../../../lib/knockout";
import type { BlockFamilyId } from "../../families";
import { BLITZ_TEAMS, DUTCH, EMPTY, ESPORTS, ESPORTS_FINAL, HEBREW, UNFINISHED } from "./fixtures";
import KnockoutBracket, { type KnockoutBracketProps } from "./KnockoutBracket";

/** The block at the preview's own width (it asks for none and takes all there is), so its brackets scroll sideways inside it. */
const demo = (knockout: Knockout | undefined, ariaLabel: string, extra: Partial<KnockoutBracketProps> = {}) => (
  <Box sx={{ width: 0, minWidth: "100%" }}>
    <KnockoutBracket knockout={knockout} ariaLabel={ariaLabel} testId="gallery-knockout" {...extra} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "KnockoutBracket",
  demos: [
    {
      name: "The Dutch championship 2026 — the real file: 16 players, tiebreak games in the scores, the last three rounds by name",
      render: () => demo(DUTCH, "Dutch championship 2026 — bracket"),
    },
    {
      name: "The Esports World Cup 2026 play-in — the real file: a double elimination, the winners' bracket over the losers'",
      render: () => demo(ESPORTS, "Esports World Cup play-in — bracket"),
    },
    {
      name: "The World Blitz Team final stage 2026 — the real file: teams, the legs won, the board points muted",
      render: () => demo(BLITZ_TEAMS, "World Blitz Team final stage — bracket", { density: "dense" }),
    },
    { name: "Unfinished — a level final, nobody marked; a title before a name", render: () => demo(UNFINISHED, "Club cup — bracket") },
    { name: "Still being read", render: () => demo(undefined, "Bracket, loading") },
    { name: "A file with no game in it", render: () => demo(EMPTY, "Bracket, empty") },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW, "גביע — טבלת נוקאאוט") },
    {
      name: "Linked (CTA-128) — the Esports final stage: each name to its games, each match's games under it",
      render: () =>
        demo(ESPORTS_FINAL, "Esports World Cup final stage — bracket", {
          playerLink: (player) => ({ href: `#player-${encodeURIComponent(player.id)}` }),
          gameLink: (game) => ({ href: `#game-${game + 1}` }),
        }),
    },
    {
      name: "Linked (CTA-128) — the World Blitz Team final stage: each team to its games, each leg to its first board",
      render: () =>
        demo(BLITZ_TEAMS, "World Blitz Team final stage — bracket", {
          density: "dense",
          playerLink: (team) => ({ href: `#team-${encodeURIComponent(team.id)}` }),
          gameLink: (game) => ({ href: `#game-${game + 1}` }),
        }),
    },
  ],
};

export default gallery;
