import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { EngineOption } from "../../../lib/engineTypes";
import type { EngineSettings } from "../../../lib/engineSettings";
import type { BlockFamilyId } from "../../families";
import EngineSettingsForm from "./EngineSettingsForm";
import { NO_OPTIONS, PINNED_SKILL_OPTIONS, SETTINGS, SETTINGS_LINK, SHIPPED_OPTIONS, SKILL_ONLY_OPTIONS } from "./fixtures";

type State = { settings: Pick<EngineSettings, "skillLevel" | "elo">; evalBar: boolean };

/** The form over an engine's declared options, its strength held by the demo as a screen holds it. */
const demo = (
  engineOptions: ReadonlyMap<string, EngineOption>,
  testId: string,
  { strengthOff = false, evalBar = false }: { strengthOff?: boolean; evalBar?: boolean } = {},
) => (
  <WithState<State> initial={{ settings: SETTINGS, evalBar: true }}>
    {(state, set) => (
      <Box sx={{ maxWidth: 360 }}>
        <EngineSettingsForm
          settings={state.settings}
          onChange={(patch) => set((before) => ({ ...before, settings: { ...before.settings, ...patch } }))}
          engineOptions={engineOptions}
          strengthOff={strengthOff ? { settingsLink: SETTINGS_LINK } : undefined}
          evalBar={evalBar ? { checked: state.evalBar, onChange: (next) => set((before) => ({ ...before, evalBar: next })) } : undefined}
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
    { name: "The default build, Stockfish 19 — the strength an Elo, its preset limiting it", render: () => demo(SHIPPED_OPTIONS, "gallery-engine-shipped") },
    {
      name: "The preset has UCI_LimitStrength off — the Elo off, and where to turn it on (CTA-181)",
      render: () => demo(SHIPPED_OPTIONS, "gallery-engine-off", { strengthOff: true }),
    },
    { name: "The Lobby's new-game form — with the eval bar", render: () => demo(SHIPPED_OPTIONS, "gallery-engine-lobby", { evalBar: true }) },
    { name: "An engine strengthened by Skill Level alone — its Elo an estimate", render: () => demo(SKILL_ONLY_OPTIONS, "gallery-engine-skill") },
    { name: "A build that pins its Skill Level — said so", render: () => demo(PINNED_SKILL_OPTIONS, "gallery-engine-pinned") },
    { name: "Before the handshake — nothing called unsupported", render: () => demo(NO_OPTIONS, "gallery-engine-loading") },
  ],
};

export default gallery;
