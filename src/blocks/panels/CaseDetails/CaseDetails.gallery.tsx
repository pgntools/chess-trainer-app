import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { CaseRow } from "../../../lib/analysisCaseRows";
import type { Game } from "../../../lib/gameModel";
import type { BlockFamilyId } from "../../families";
import { EvalGraph } from "../EvalGraph";
import CaseDetails, { type CaseDetailsTab } from "./CaseDetails";
import { EVAL_POINTS, GAME, GAME_ROW, HEBREW_ROW, POSITION_ROW } from "./fixtures";

const demo = (row: CaseRow, game: Game | undefined, { ends = false, graph = false, tab = "info" as CaseDetailsTab } = {}) => (
  <WithState<CaseDetailsTab> initial={tab}>
    {(open, setOpen) => (
      <Box sx={{ width: 400, height: 420, display: "flex", flexDirection: "column" }}>
        <CaseDetails
          row={row}
          game={game}
          graph={graph ? <EvalGraph points={EVAL_POINTS} currentNodeId={null} onSelect={() => {}} label="Evaluation graph" testId="gallery-case-details-eval-graph" /> : undefined}
          settings={<Typography variant="body2" sx={{ p: 1 }}>The board's settings go here (CaseSettingsTab).</Typography>}
          display={<Typography variant="body2" sx={{ p: 1 }}>The screen's display settings go here.</Typography>}
          links={<Typography variant="body2">The Case's links go here (CaseLinks).</Typography>}
          linkCount={2}
          jobs={<Typography variant="body2" sx={{ p: 1 }}>The Case's Jobs V2 go here (CaseJobs).</Typography>}
          tab={open}
          onTabChange={setOpen}
          backLink={{ href: "#cases" }}
          previous={ends ? undefined : { href: "#previous" }}
          next={{ href: "#next" }}
          testId="gallery-case-details"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "CaseDetails",
  demos: [
    { name: "A Game Case, its PGN tags on Info, and Linked cases (2) opening its links in a dialog", render: () => demo(GAME_ROW, GAME, { graph: true }) },
    { name: "The board's settings on Settings", render: () => demo(GAME_ROW, GAME, { graph: true, tab: "settings" }) },
    { name: "Its evaluations on Graph", render: () => demo(GAME_ROW, GAME, { graph: true, tab: "graph" }) },
    { name: "Its jobs on Jobs (CTA-188)", render: () => demo(GAME_ROW, GAME, { graph: true, tab: "jobs" }) },
    { name: "A Position with a long name, no tags and no evaluations — Graph disabled", render: () => demo(POSITION_ROW, undefined, { ends: true }) },
    { name: "A Hebrew name (switch to RTL — the arrows turn)", render: () => demo(HEBREW_ROW, undefined) },
  ],
};

export default gallery;
