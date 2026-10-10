import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import { computerAnalysisOptionsFrom, type ComputerAnalysisOptions } from "../../../lib/computerAnalysis";
import type { EngineOption } from "../../../lib/engineTypes";
import type { BlockFamilyId } from "../../families";
import ComputerAnalysisForm, { type ComputerAnalysisFormProps } from "./ComputerAnalysisForm";
import { BEFORE_HANDSHAKE, MULTI_THREAD, NO_HASH, NO_TIME_LIMIT, NONE_TICKED, OPTIONS, RANGED, SINGLE_THREAD } from "./fixtures";

const demo = (
  initial: ComputerAnalysisOptions,
  engineOptions: ReadonlyMap<string, EngineOption>,
  extra: Partial<Omit<ComputerAnalysisFormProps, "options" | "onChange" | "engineOptions" | "onStart" | "testId">> = {},
) => (
  <WithState<ComputerAnalysisOptions> initial={initial}>
    {(options, set) => (
      <Box sx={{ maxWidth: 360 }}>
        <ComputerAnalysisForm
          options={options}
          onChange={(patch) => set((before) => computerAnalysisOptionsFrom({ ...before, ...patch }))}
          engineOptions={engineOptions}
          engineName="Stockfish 19 Lite"
          lastMove={42}
          onStart={() => {}}
          testId="gallery-computer-analysis"
          {...extra}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "ComputerAnalysisForm",
  demos: [
    { name: "The single-thread build — Threads pinned at 1, the light variant ticked", render: () => demo(OPTIONS, SINGLE_THREAD) },
    { name: "The multi-thread build — Threads adjustable", render: () => demo(OPTIONS, MULTI_THREAD) },
    {
      name: "Before the engine's handshake — a single-thread engine still says Threads is 1",
      render: () => demo(OPTIONS, BEFORE_HANDSHAKE, { multiThread: false }),
    },
    { name: "No time limit — depth 35 alone decides, the time slider off", render: () => demo(NO_TIME_LIMIT, SINGLE_THREAD) },
    { name: "An engine with no Hash and no MultiPV", render: () => demo(OPTIONS, NO_HASH) },
    { name: "Black's moves, 12... to 30, every variant", render: () => demo(RANGED, MULTI_THREAD) },
    { name: "No variant ticked — Start off, saying why", render: () => demo(NONE_TICKED, SINGLE_THREAD) },
    { name: "A board with no moves", render: () => demo(OPTIONS, SINGLE_THREAD, { blocked: "noMoves" }) },
    { name: "No move in the chosen range", render: () => demo(RANGED, SINGLE_THREAD, { blocked: "noRange" }) },
    { name: "Queuing", render: () => demo(OPTIONS, SINGLE_THREAD, { busy: true }) },
    { name: "Refused — the jobs list is full", render: () => demo(OPTIONS, SINGLE_THREAD, { problem: "too-many" }) },
  ],
};

export default gallery;
