import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { AnalysisSettings } from "../../../lib/analysisSettings";
import type { EngineOption } from "../../../lib/engine";
import type { BlockFamilyId } from "../../families";
import AnalysisEngineForm from "./AnalysisEngineForm";
import { ABSENT, BEFORE_HANDSHAKE, PINNED, SETTINGS, SHIPPED } from "./fixtures";

type State = { settings: AnalysisSettings; evalBar: boolean };

const demo = (options: ReadonlyMap<string, EngineOption>, { engineOn = true, clear = true } = {}) => (
  <WithState<State> initial={{ settings: SETTINGS, evalBar: true }}>
    {(state, set) => (
      <Box sx={{ width: 320 }}>
        <AnalysisEngineForm
          settings={state.settings}
          onChange={(patch) => set((before) => ({ ...before, settings: { ...before.settings, ...patch } }))}
          engineOptions={options}
          engineOn={engineOn}
          showEvalBar={state.evalBar}
          onShowEvalBarChange={(evalBar) => set((before) => ({ ...before, evalBar }))}
          onClear={clear ? () => {} : undefined}
          testId="gallery-analysis"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "AnalysisEngineForm",
  demos: [
    { name: "The shipped engine — lines up to 10, with Clear", render: () => demo(SHIPPED) },
    { name: "The engine off — the search's sliders off", render: () => demo(SHIPPED, { engineOn: false }) },
    { name: "Lines pinned at one", render: () => demo(PINNED) },
    { name: "No MultiPV at all, no Clear (a Library game)", render: () => demo(ABSENT, { clear: false }) },
    { name: "Before the handshake", render: () => demo(BEFORE_HANDSHAKE) },
  ],
};

export default gallery;
