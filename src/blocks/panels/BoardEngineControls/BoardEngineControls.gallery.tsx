import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import BoardEngineControls from "./BoardEngineControls";
import { OFF, ON_NO_BAR } from "./fixtures";

type State = { engineOn: boolean; showEvalBar: boolean; writeEvals: boolean };

const demo = (initial: { engineOn: boolean; showEvalBar: boolean }, writeEvals: boolean) => (
  <WithState<State> initial={{ ...initial, writeEvals: false }}>
    {(state, set) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <BoardEngineControls
          engineOn={state.engineOn}
          onEngineOnChange={(engineOn) => set((before) => ({ ...before, engineOn }))}
          showEvalBar={state.showEvalBar}
          onShowEvalBarChange={(showEvalBar) => set((before) => ({ ...before, showEvalBar }))}
          writeEvals={
            writeEvals ? { checked: state.writeEvals, onChange: (next) => set((before) => ({ ...before, writeEvals: next })) } : undefined
          }
          testId="gallery-board"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "BoardEngineControls",
  demos: [
    { name: "A board as it opens — the engine off, play to start it; the menu holds the eval bar", render: () => demo(OFF, false) },
    { name: "The engine on — pause, pressed; the eval bar off", render: () => demo(ON_NO_BAR, false) },
    { name: "The Analysis Board's — Write evaluations into the game in the menu (CTA-167)", render: () => demo(OFF, true) },
  ],
};

export default gallery;
