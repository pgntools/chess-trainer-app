import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { HEBREW_PROJECTS, MANY_PROJECTS, PROJECTS } from "./fixtures";
import ProjectPickerDialog, { type ProjectPickerDialogProps } from "./ProjectPickerDialog";

const noop = () => {};

const framed = (props: Partial<ProjectPickerDialogProps> & Pick<ProjectPickerDialogProps, "projects">, testId: string) => (
  <DialogFrame height={720}>
    {(dialogProps) => (
      <ProjectPickerDialog
        open
        title="Move 3 cases to another project"
        submitLabel="Move"
        current={props.projects[0].id}
        excludeCurrent
        onSubmit={noop}
        onClose={noop}
        testId={testId}
        dialogProps={dialogProps}
        {...props}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "ProjectPickerDialog",
  demos: [
    { name: "Move the picked Cases — the Project they are in left out (CTA-226)", render: () => framed({ projects: PROJECTS }, "gallery-project-picker-move") },
    {
      name: "1,200 Projects in nested folders — find by words, sort, page",
      render: () => framed({ projects: MANY_PROJECTS }, "gallery-project-picker-many"),
    },
    {
      name: "Duplicate — a name, its own Project chosen first, on its page",
      render: () =>
        framed(
          {
            projects: MANY_PROJECTS,
            title: "Duplicate case",
            submitLabel: "Duplicate",
            current: "p0777",
            excludeCurrent: false,
            initialName: "Lucena position (copy)",
          },
          "gallery-project-picker-copy",
        ),
    },
    {
      name: "A game handed to Analysis — a new Project offered first (CTA-192)",
      render: () =>
        framed(
          {
            projects: PROJECTS,
            title: "Open in Analysis",
            submitLabel: "Open",
            current: "",
            excludeCurrent: false,
            newProject: { initialName: "Club games — 2 games", onSubmit: noop },
          },
          "gallery-project-picker-send",
        ),
    },
    {
      name: "A refused write — said under the table, busy off",
      render: () => framed({ projects: PROJECTS, problem: "That could not be saved — the browser refused it." }, "gallery-project-picker-problem"),
    },
    {
      name: "Hebrew names (switch to RTL)",
      render: () =>
        framed(
          { projects: HEBREW_PROJECTS, title: "Duplicate case", submitLabel: "Duplicate", excludeCurrent: false, initialName: "סיום (עותק)" },
          "gallery-project-picker-he",
        ),
    },
  ],
};

export default gallery;
