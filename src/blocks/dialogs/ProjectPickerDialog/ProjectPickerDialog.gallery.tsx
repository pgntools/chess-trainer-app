import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { AnalysisProject } from "../../../lib/analysisProjects";
import type { BlockFamilyId } from "../../families";
import { HEBREW_PROJECTS, PROJECTS } from "./fixtures";
import ProjectPickerDialog from "./ProjectPickerDialog";

const noop = () => {};

const framed = (projects: readonly AnalysisProject[], duplicate: boolean, testId: string) => (
  <DialogFrame height={duplicate ? 460 : 380}>
    {(dialogProps) => (
      <ProjectPickerDialog
        open
        title={duplicate ? "Duplicate case" : "Move case to another project"}
        submitLabel={duplicate ? "Duplicate" : "Move"}
        projects={projects}
        current={projects[0].id}
        excludeCurrent={!duplicate}
        initialName={duplicate ? "Lucena position (copy)" : undefined}
        onSubmit={noop}
        onClose={noop}
        testId={testId}
        dialogProps={dialogProps}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "ProjectPickerDialog",
  demos: [
    { name: "Move — the Project it is in left out", render: () => framed(PROJECTS, false, "gallery-project-picker-move") },
    { name: "Duplicate — a name, its own Project chosen first", render: () => framed(PROJECTS, true, "gallery-project-picker-copy") },
    { name: "Hebrew names (switch to RTL)", render: () => framed(HEBREW_PROJECTS, true, "gallery-project-picker-he") },
  ],
};

export default gallery;
