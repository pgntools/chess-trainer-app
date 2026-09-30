import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { PositionFields as Fields } from "../../../lib/positionEditor";
import type { BlockFamilyId } from "../../families";
import { AFTER_E4, START } from "./fixtures";
import PositionFields from "./PositionFields";

const demo = (initial: Fields) => (
  <WithState<Fields> initial={initial}>
    {(fields, set) => (
      <Box sx={{ width: 300 }}>
        <PositionFields
          testId="gallery-editor"
          fields={fields}
          onTurnChange={(turn) => set((before) => ({ ...before, turn, enPassant: "-" }))}
          onCastlingChange={(flag, allowed) => set((before) => ({ ...before, castling: { ...before.castling, [flag]: allowed } }))}
          onEnPassantChange={(enPassant) => set((before) => ({ ...before, enPassant }))}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "PositionFields",
  demos: [
    { name: "The start — White to move, every castle", render: () => demo(START) },
    { name: "After 1. e4 — Black to move, e3 the target, no White 0-0-0", render: () => demo(AFTER_E4) },
  ],
};

export default gallery;
