import type { ReactNode } from "react";

import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { JobEngineChange } from "../../../lib/jobs/engineJobSettings";
import type { BlockFamilyId } from "../../families";
import JobSettingsChangedDialog from "./JobSettingsChangedDialog";
import { DEPTH_ONLY, EVERYTHING_CHANGED, TOO_MANY } from "./fixtures";

const noop = () => {};

const framed = (changes: readonly JobEngineChange[], extra: { busy?: boolean; error?: ReactNode } = {}, height = 480) => (
  <DialogFrame height={height}>
    {(dialogProps) => (
      <JobSettingsChangedDialog
        open
        name="Carlsen – Nakamura"
        changes={changes}
        onKeep={noop}
        onCurrent={noop}
        onClose={noop}
        testId="gallery-job-settings-changed"
        dialogProps={dialogProps}
        {...extra}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "JobSettingsChangedDialog",
  demos: [
    { name: "Engine, preset, its options and the search changed", render: () => framed(EVERYTHING_CHANGED, {}, 560) },
    { name: "The depth alone", render: () => framed(DEPTH_ONLY, {}, 340) },
    { name: "The new job being queued", render: () => framed(DEPTH_ONLY, { busy: true }, 340) },
    { name: "The new job refused, its problem in the dialog", render: () => framed(DEPTH_ONLY, { error: TOO_MANY }, 400) },
  ],
};

export default gallery;
