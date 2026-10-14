import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { JobsDefaultPreset } from "../../../lib/jobsSettings";
import type { BlockFamilyId } from "../../families";
import JobsSettingsForm from "./JobsSettingsForm";
import { BOARD_DEFAULT, DEEP_DEFAULT, ENGINES, EVAL_SOURCES_LINK, PRESETS } from "./fixtures";

/** The settings with every control live. */
const demo = (initial: JobsDefaultPreset | null) => (
  <WithState<JobsDefaultPreset | null> initial={initial}>
    {(defaultPreset, set) => (
      <JobsSettingsForm
        defaultPreset={defaultPreset}
        onDefaultPresetChange={set}
        initialDefault={BOARD_DEFAULT}
        engines={ENGINES}
        presets={PRESETS}
        evalSourcesLink={EVAL_SOURCES_LINK}
        testId="gallery-jobs-settings"
      />
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "JobsSettingsForm",
  demos: [
    { name: "The defaults — the board's engine and its preset", render: () => demo(null) },
    { name: "A default engine and preset", render: () => demo(DEEP_DEFAULT) },
  ],
};

export default gallery;
