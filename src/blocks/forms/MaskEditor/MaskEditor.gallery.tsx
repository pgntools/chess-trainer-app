import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { PieceMask } from "../../../lib/pieceMask";
import type { BlockFamilyId } from "../../families";
import { CUSTOM, IDENTITY, NON_PAWNS } from "./fixtures";
import MaskEditor from "./MaskEditor";

type State = { mask: PieceMask; notation: boolean; showLines: boolean };

/** The editor in a panel's width, its costume held by the demo as Masked Pieces holds it. */
const demo = (initial: State, testId: string) => (
  <WithState<State> initial={initial}>
    {(state, set) => (
      <Box sx={{ maxWidth: 360 }}>
        <MaskEditor
          mask={state.mask}
          onMaskChange={(mask) => set((before) => ({ ...before, mask }))}
          notation={state.notation}
          onNotationChange={(notation) => set((before) => ({ ...before, notation }))}
          showLines={state.showLines}
          onShowLinesChange={(showLines) => set((before) => ({ ...before, showLines }))}
          testId={testId}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "MaskEditor",
  demos: [
    { name: "Arriving — non-pawns as pawns, the notation hidden, the lines off", render: () => demo({ mask: NON_PAWNS, notation: true, showLines: false }, "gallery-mask") },
    { name: "A mask of the reader's own — no preset pressed", render: () => demo({ mask: CUSTOM, notation: true, showLines: false }, "gallery-mask-custom") },
    { name: "Real pieces, the notation and the lines shown", render: () => demo({ mask: IDENTITY, notation: false, showLines: true }, "gallery-mask-identity") },
  ],
};

export default gallery;
