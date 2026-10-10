import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { EngineOption } from "../../../lib/engineTypes";
import type { DeviceEngineLimits, EngineSettings } from "../../../lib/engineSettings";
import type { BlockFamilyId } from "../../families";
import EngineSettingsForm from "./EngineSettingsForm";
import {
  ADJUSTABLE_OPTIONS,
  HOSTED_LIMITS,
  HOSTED_OPTIONS,
  NO_OPTIONS,
  SETTINGS,
  SHIPPED_OPTIONS,
  SKILL_ONLY_OPTIONS,
  SPARSE_OPTIONS,
} from "./fixtures";

type State = { settings: EngineSettings; showEvalBar: boolean };

/** The form over an engine's declared options, its settings held by the demo as a screen holds them. */
const demo = (engineOptions: ReadonlyMap<string, EngineOption>, testId: string, deviceLimits?: DeviceEngineLimits) => (
  <WithState<State> initial={{ settings: SETTINGS, showEvalBar: true }}>
    {(state, set) => (
      <Box sx={{ maxWidth: 360 }}>
        <EngineSettingsForm
          settings={state.settings}
          onChange={(patch) => set((before) => ({ ...before, settings: { ...before.settings, ...patch } }))}
          engineOptions={engineOptions}
          showEvalBar={state.showEvalBar}
          onShowEvalBarChange={(showEvalBar) => set((before) => ({ ...before, showEvalBar }))}
          deviceLimits={deviceLimits}
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
    { name: "The default build, Stockfish 19 — the strength an Elo (UCI_Elo with UCI_LimitStrength), Threads pinned", render: () => demo(SHIPPED_OPTIONS, "gallery-engine-shipped") },
    { name: "An engine strengthened by Skill Level alone — its Elo an estimate; Threads and Hash pinned, each saying what it is fixed at", render: () => demo(SKILL_ONLY_OPTIONS, "gallery-engine-skill") },
    { name: "A build that takes every knob — all live", render: () => demo(ADJUSTABLE_OPTIONS, "gallery-engine-adjustable") },
    { name: "A build without Threads and Hash — absent, not pinned; a smaller MultiPV and strength", render: () => demo(SPARSE_OPTIONS, "gallery-engine-sparse") },
    { name: "Before the handshake — nothing called unsupported", render: () => demo(NO_OPTIONS, "gallery-engine-loading") },
    {
      name: "A smaller device — Threads to 3, Hash to 512 MB, the Hash marks with it (CTA-163); the move-time marks snap",
      render: () => demo(ADJUSTABLE_OPTIONS, "gallery-engine-device", { threads: 3, hashMb: 512 }),
    },
    {
      name: "An engine server's engine — Threads to 15 and Hash to 4096 MB, as the server allows, the 2048 and 4096 marks with it (CTA-175)",
      render: () => demo(HOSTED_OPTIONS, "gallery-engine-hosted", HOSTED_LIMITS),
    },
  ],
};

export default gallery;
