import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { ArrowPaletteId, ArrowWidthSource } from "../../../lib/arrowSettings";
import type { BlockFamilyId } from "../../families";
import ArrowSettingsFields from "./ArrowSettingsFields";
import { EVAL_AND_GAMES, UNTAGGED } from "./fixtures";

type State = { source: ArrowWidthSource; palette: ArrowPaletteId };

const demo = (initial: State, available?: ReadonlySet<ArrowWidthSource>) => (
  <WithState<State> initial={initial}>
    {(state, set) => (
      <Box sx={{ width: 340 }}>
        <ArrowSettingsFields
          widthSource={state.source}
          onWidthSourceChange={(source) => set((before) => ({ ...before, source }))}
          available={available}
          palette={state.palette}
          onPaletteChange={(palette) => set((before) => ({ ...before, palette }))}
          testId="gallery-arrows"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "ArrowSettingsFields",
  demos: [
    { name: "A record's settings — every source offered", render: () => demo({ source: "none", palette: "classic" }) },
    { name: "On the board — play chances off (no move carries them)", render: () => demo({ source: "eval", palette: "lichess" }, EVAL_AND_GAMES) },
    { name: "A chosen source the tree has lost — drawn as None", render: () => demo({ source: "games", palette: "colorblind" }, UNTAGGED) },
  ],
};

export default gallery;
