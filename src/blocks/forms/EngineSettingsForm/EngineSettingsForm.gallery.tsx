import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { EngineOption } from "../../../lib/engine";
import type { EngineSettings } from "../../../lib/engineSettings";
import type { BlockFamilyId } from "../../families";
import EngineSettingsForm from "./EngineSettingsForm";
import { ADJUSTABLE_OPTIONS, ELO_OPTIONS, NO_OPTIONS, SETTINGS, SHIPPED_OPTIONS, SPARSE_OPTIONS } from "./fixtures";

type State = { settings: EngineSettings; showEvalBar: boolean };

/** The form over an engine's declared options, its settings held by the demo as a screen holds them. */
const demo = (engineOptions: ReadonlyMap<string, EngineOption>, testId: string) => (
  <WithState<State> initial={{ settings: SETTINGS, showEvalBar: true }}>
    {(state, set) => (
      <Box sx={{ maxWidth: 360 }}>
        <EngineSettingsForm
          settings={state.settings}
          onChange={(patch) => set((before) => ({ ...before, settings: { ...before.settings, ...patch } }))}
          engineOptions={engineOptions}
          showEvalBar={state.showEvalBar}
          onShowEvalBarChange={(showEvalBar) => set((before) => ({ ...before, showEvalBar }))}
          testId={testId}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "EngineSettingsForm",
  demos: [
    { name: "The shipped build — Threads and Hash pinned, each saying what it is fixed at", render: () => demo(SHIPPED_OPTIONS, "gallery-engine-shipped") },
    { name: "Stockfish 19 — the strength is an Elo (UCI_Elo with UCI_LimitStrength), Hash adjustable", render: () => demo(ELO_OPTIONS, "gallery-engine-elo") },
    { name: "A build that takes every knob — all live", render: () => demo(ADJUSTABLE_OPTIONS, "gallery-engine-adjustable") },
    { name: "A build without Threads and Hash — absent, not pinned; a smaller MultiPV and strength", render: () => demo(SPARSE_OPTIONS, "gallery-engine-sparse") },
    { name: "Before the handshake — nothing called unsupported", render: () => demo(NO_OPTIONS, "gallery-engine-loading") },
  ],
};

export default gallery;
