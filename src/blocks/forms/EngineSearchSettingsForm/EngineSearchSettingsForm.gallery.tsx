import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { EngineSearchSettings } from "../../../lib/engineSearchSettings";
import type { BlockFamilyId } from "../../families";
import EngineSearchSettingsForm from "./EngineSearchSettingsForm";
import {
  HOSTED_ASKED,
  HOSTED_ENGINE,
  HOSTED_LIMITS,
  LITE,
  MULTI_THREAD_LIMITS,
  SETTINGS,
  SETTINGS_LINK,
  SINGLE_THREAD_LIMITS,
  TUNED,
} from "./fixtures";

const demo = (
  initial: EngineSearchSettings,
  limits: { threads: number; hashMb: number },
  engine: { name: string; version: string } = LITE,
  presetName = "Default",
) => (
  <WithState<EngineSearchSettings> initial={initial}>
    {(settings, set) => (
      <Box sx={{ width: 320 }}>
        <EngineSearchSettingsForm
          settings={settings}
          onChange={(patch) => set((before) => ({ ...before, ...patch }))}
          limits={limits}
          engine={engine}
          presetName={presetName}
          settingsLink={SETTINGS_LINK}
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
    { name: "The defaults, on the single-thread build — Threads fixed at one", render: () => demo(SETTINGS, SINGLE_THREAD_LIMITS) },
    { name: "A reader's own — infinite analysis, five lines, four threads on the multi-thread build", render: () => demo(TUNED, MULTI_THREAD_LIMITS, LITE, "Fast blitz") },
    {
      name: "An engine server's engine — Threads to 15, Hash to 4096 MB",
      render: () => demo(HOSTED_ASKED, HOSTED_LIMITS, HOSTED_ENGINE),
    },
    {
      name: "The same request on an in-browser build — shown held to what it takes, the store keeping what was asked",
      render: () => demo(HOSTED_ASKED, SINGLE_THREAD_LIMITS),
    },
  ],
};

export default gallery;
