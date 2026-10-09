import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import EvalGraph from "./EvalGraph";
import { GAME, ONE } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "EvalGraph",
  demos: [
    {
      name: "A game, clickable — the chosen move marked (hover, or focus and use the arrows)",
      render: () => (
        <WithState<string | null> initial="n9">
          {(current, setCurrent) => (
            <Box sx={{ maxWidth: 480, pt: 4 }}>
              <EvalGraph points={GAME} currentNodeId={current} onSelect={(point) => setCurrent(point.nodeId)} label="Evaluation graph" testId="gallery-eval-graph" />
            </Box>
          )}
        </WithState>
      ),
    },
    {
      name: "Read only — no move to go to",
      render: () => (
        <Box sx={{ maxWidth: 480, pt: 4 }}>
          <EvalGraph points={GAME} label="Evaluation graph" testId="gallery-eval-graph-read" />
        </Box>
      ),
    },
    {
      name: "One evaluated move",
      render: () => (
        <Box sx={{ maxWidth: 480, pt: 4 }}>
          <EvalGraph points={ONE} label="Evaluation graph" testId="gallery-eval-graph-one" />
        </Box>
      ),
    },
    {
      name: "No evaluations",
      render: () => <EvalGraph points={[]} label="Evaluation graph" testId="gallery-eval-graph-empty" />,
    },
  ],
};

export default gallery;
