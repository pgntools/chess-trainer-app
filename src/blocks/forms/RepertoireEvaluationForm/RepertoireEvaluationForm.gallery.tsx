import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { EngineOption } from "../../../lib/engineTypes";
import { describeEngines } from "../../../lib/engines";
import { repertoireEvaluationSettingsFrom, type RepertoireEvaluationSettings } from "../../../lib/jobs/kinds/repertoireEvaluation/core";
import type { BlockFamilyId } from "../../families";
import RepertoireEvaluationForm, { type RepertoireEvaluationFormProps } from "./RepertoireEvaluationForm";
import { BEFORE_HANDSHAKE, BLACK_EVERYTHING, LONG_NAME, MULTI_THREAD, NO_TIME_LIMIT, PRESETS, SINGLE_THREAD, WHITE } from "./fixtures";

const demo = (
  initial: RepertoireEvaluationSettings,
  engineOptions: ReadonlyMap<string, EngineOption>,
  extra: Partial<Omit<RepertoireEvaluationFormProps, "settings" | "onChange" | "engineOptions" | "testId">> = {},
) => (
  <WithState<RepertoireEvaluationSettings> initial={initial}>
    {(settings, set) => (
      <Box sx={{ maxWidth: 380 }}>
        <RepertoireEvaluationForm
          settings={settings}
          onChange={(patch) => set((before) => repertoireEvaluationSettingsFrom({ ...before, ...patch }))}
          repertoireName="Queen's Gambit Declined"
          engineOptions={engineOptions}
          testId="gallery-repertoire-evaluation"
          {...extra}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "RepertoireEvaluationForm",
  demos: [
    { name: "A White repertoire — the report alone, the single-thread build", render: () => demo(WHITE, SINGLE_THREAD) },
    {
      name: "The engine and its preset as selects, before the handshake",
      render: () =>
        demo(WHITE, BEFORE_HANDSHAKE, {
          multiThread: false,
          engineChoice: {
            engines: describeEngines(),
            engineId: describeEngines()[0].descriptor.id,
            onEngineChange: () => {},
            presets: PRESETS,
            presetId: "deep",
            onPresetChange: () => {},
          },
        }),
    },
    { name: "A Black repertoire, 30 plies, every output, stricter thresholds", render: () => demo(BLACK_EVERYTHING, MULTI_THREAD) },
    { name: "No time limit — the depth alone decides", render: () => demo(NO_TIME_LIMIT, SINGLE_THREAD) },
    { name: "A long repertoire name", render: () => demo(BLACK_EVERYTHING, SINGLE_THREAD, { repertoireName: LONG_NAME }) },
  ],
};

export default gallery;
