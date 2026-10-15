import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { RepertoireGameId } from "../../../lib/repertoireGames";
import type { BlockFamilyId } from "../../families";
import RepertoireDetails, { type RepertoireDetailsTab, type RepertoireSide } from "./RepertoireDetails";
import { DESCRIPTION, HEBREW_DESCRIPTION, HEBREW_NAME, NAME } from "./fixtures";

type Session = { tab: RepertoireDetailsTab; side: RepertoireSide; autoplay: boolean; arrows: boolean; chances: boolean; evalBar: boolean };

const demo = ({
  name = NAME,
  description = DESCRIPTION,
  tab = "settings" as RepertoireDetailsTab,
  game,
}: {
  name?: string;
  description?: string;
  tab?: RepertoireDetailsTab;
  game?: RepertoireGameId;
} = {}) => (
  <WithState<Session> initial={{ tab, side: "black", autoplay: false, arrows: true, chances: false, evalBar: true }}>
    {(session, setSession) => (
      <Box sx={{ width: 400, height: 520, display: "flex", flexDirection: "column" }}>
        <RepertoireDetails
          name={name}
          description={description}
          onRestart={() => {}}
          onDownload={() => {}}
          downloadDisabled={false}
          tab={session.tab}
          onTabChange={(next) => setSession((now) => ({ ...now, tab: next }))}
          side={session.side}
          onSideChange={(next) => next !== null && setSession((now) => ({ ...now, side: next }))}
          // A game's trainer always plays, and a game shows no odds: no such switches.
          autoplay={game === undefined ? session.autoplay : undefined}
          onAutoplayChange={(next) => setSession((now) => ({ ...now, autoplay: next }))}
          showArrows={session.arrows}
          onShowArrowsChange={(next) => setSession((now) => ({ ...now, arrows: next }))}
          chanceArrows={game === undefined ? session.chances : undefined}
          onChanceArrowsChange={(next) => setSession((now) => ({ ...now, chances: next }))}
          showEvalBar={session.evalBar}
          onShowEvalBarChange={(next) => setSession((now) => ({ ...now, evalBar: next }))}
          onOpenSettings={() => {}}
          settingsOpen={false}
          backLink={{ href: game === undefined ? "#repertoires" : "#repertoire" }}
          gameLink={(id) => ({ href: `#games-${id}` })}
          currentGame={game}
          repertoireLink={game === undefined ? undefined : { href: "#repertoire" }}
          testId="gallery-repertoire-details"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "RepertoireDetails",
  demos: [
    { name: "The repertoire's own view, on Settings", render: () => demo() },
    { name: "Its games on Games", render: () => demo({ tab: "games" }) },
    { name: "In a game — Backtracking current, the way back first, no Autoplay or play chances", render: () => demo({ tab: "games", game: "backtrack" }) },
    { name: "A game's Settings", render: () => demo({ game: "end" }) },
    { name: "Jobs — coming", render: () => demo({ tab: "jobs" }) },
    { name: "No description", render: () => demo({ description: "" }) },
    { name: "A Hebrew name and description (switch to RTL — the way back turns)", render: () => demo({ name: HEBREW_NAME, description: HEBREW_DESCRIPTION, tab: "games", game: "end" }) },
  ],
};

export default gallery;
