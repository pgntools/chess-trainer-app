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
    {
      name: "A game handed to Analysis — a new Project offered first (CTA-192)",
      render: () => (
        <DialogFrame height={460}>
          {(dialogProps) => (
            <ProjectPickerDialog
              open
              title="Open in Analysis"
              submitLabel="Open"
              projects={PROJECTS}
              current=""
              newProject={{ initialName: "Club games — 2 games", onSubmit: noop }}
              onSubmit={noop}
              onClose={noop}
              testId="gallery-project-picker-send"
              dialogProps={dialogProps}
            />
          )}
        </DialogFrame>
      ),
    },
  ],
};

export default gallery;
