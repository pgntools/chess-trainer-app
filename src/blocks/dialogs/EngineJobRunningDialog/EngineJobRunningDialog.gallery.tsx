import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import EngineJobRunningDialog from "./EngineJobRunningDialog";
import { ANALYSIS_JOB, EVALUATION_JOB } from "./fixtures";

const noop = () => {};

const framed = (jobTitle: string) => (
  <DialogFrame height={320}>
    {(dialogProps) => (
      <EngineJobRunningDialog
        open
        jobTitle={jobTitle}
        onPause={noop}
        onWait={noop}
        testId="gallery-engine-job-running"
        dialogProps={dialogProps}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "EngineJobRunningDialog",
  demos: [
    { name: "A Case's computer analysis running", render: () => framed(ANALYSIS_JOB) },
    { name: "A repertoire's evaluation running", render: () => framed(EVALUATION_JOB) },
  ],
};

export default gallery;
