import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { EngineSearchSettings } from "../../../lib/engineSearchSettings";
import type { EngineEntry } from "../../../lib/engines";
import type { BlockFamilyId } from "../../families";
import EngineSearchSettingsForm from "./EngineSearchSettingsForm";
import {
  HOSTED_ASKED,
  HOSTED_ENGINE,
  HOSTED_LIMITS,
  LITE,
  LITE_MULTI,
  MULTI_THREAD_LIMITS,
  PLAIN_HOST_ENGINES,
  PRESETS,
  SERVER_ENGINES,
  SETTINGS,
  SINGLE_THREAD_LIMITS,
  TUNED,
} from "./fixtures";

type DemoState = { settings: EngineSearchSettings; engineId: string; presetId: string };

const demo = (
  initial: EngineSearchSettings,
  limits: { threads: number; hashMb: number },
  engines: readonly EngineEntry[] = PLAIN_HOST_ENGINES,
  engineId = LITE.id,
  presetId = "default",
) => (
  <WithState<DemoState> initial={{ settings: initial, engineId, presetId }}>
    {(state, set) => (
      <Box sx={{ width: 320 }}>
        <EngineSearchSettingsForm
          settings={state.settings}
          onChange={(patch) => set((before) => ({ ...before, settings: { ...before.settings, ...patch } }))}
          limits={limits}
          engines={engines}
          engineId={state.engineId}
          onEngineChange={(id) => set((before) => ({ ...before, engineId: id }))}
          presets={PRESETS}
          presetId={state.presetId}
          onPresetChange={(id) => set((before) => ({ ...before, presetId: id }))}
          testId="gallery-engine-menu"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "EngineSearchSettingsForm",
  demos: [
    {
      name: "The defaults, on the single-thread build — Threads fixed at one, the multi-thread build listed disabled, move time on ∞ (its box off)",
      render: () => demo(SETTINGS, SINGLE_THREAD_LIMITS),
    },
    {
      name: "A reader's own — depth 24, 1 s a move, five lines, four threads on the multi-thread build, their own preset",
      render: () => demo(TUNED, MULTI_THREAD_LIMITS, SERVER_ENGINES, LITE_MULTI.id, "p-deep"),
    },
    {
      name: "A move time typed off the marks — 7.5 s, the slider between 5 and 10",
      render: () => demo({ ...SETTINGS, moveTimeMs: 7500 }, SINGLE_THREAD_LIMITS),
    },
    {
      name: "An engine server's engine — Threads to 15, Hash to 4096 MB, a preset named in Hebrew",
      render: () => demo(HOSTED_ASKED, HOSTED_LIMITS, SERVER_ENGINES, HOSTED_ENGINE.id, "p-he"),
    },
    {
      name: "The same request on an in-browser build — shown held to what it takes, the store keeping what was asked",
      render: () => demo(HOSTED_ASKED, SINGLE_THREAD_LIMITS),
    },
  ],
};

export default gallery;
