import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import EngineResourceSlider, { type EngineResource } from "./EngineResourceSlider";
import { HOSTED, HOSTED_16GB, MULTI_THREAD, SINGLE_THREAD, type ResourceLimits } from "./fixtures";

const demo = (resource: EngineResource, initial: number, limits: ResourceLimits, testId: string) => (
  <WithState initial={initial}>
    {(value, set) => (
      <Box sx={{ maxWidth: 420 }}>
        <EngineResourceSlider
          resource={resource}
          value={value}
          sliderMax={limits.slider[resource]}
          typedMax={limits.typed[resource]}
          onChange={set}
          testId={testId}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "EngineResourceSlider",
  demos: [
    { name: "Threads on the multi-thread build — the slider to the device's 7, typed up to 32", render: () => demo("threads", 4, MULTI_THREAD, "gallery-resource-threads") },
    { name: "Threads past the slider's top — 16 typed, the slider at its end", render: () => demo("threads", 16, MULTI_THREAD, "gallery-resource-threads-past") },
    { name: "Threads on the single-thread build — fixed at one, and said", render: () => demo("threads", 1, SINGLE_THREAD, "gallery-resource-threads-fixed") },
    { name: "Hash on a 4 GB device — the slider to 512 MB, typed up to 1024", render: () => demo("hashMb", 256, SINGLE_THREAD, "gallery-resource-hash") },
    { name: "Hash on an engine server's engine — its own 4096 MB", render: () => demo("hashMb", 2048, HOSTED, "gallery-resource-hash-hosted") },
    { name: "Hash on a server capped at 16 GB — marks in proportion, 2 GB unlabelled", render: () => demo("hashMb", 16, HOSTED_16GB, "gallery-resource-hash-16gb") },
  ],
};

export default gallery;
