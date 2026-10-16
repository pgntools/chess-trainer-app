import type { ReactNode } from "react";

import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import ProjectCaseLimitDialog from "./ProjectCaseLimitDialog";
import { FROM_LIBRARY, INTO_PROJECT, NEW_PROJECT, STORAGE_PROBLEM } from "./fixtures";

const noop = () => {};

const framed = (numbers: { count: number; existing: number; inLibrary?: boolean }, extra: { busy?: boolean; error?: ReactNode } = {}) => (
  <DialogFrame height={340}>
    {(dialogProps) => (
      <ProjectCaseLimitDialog
        open
        {...numbers}
        onCollection={noop}
        onCreateAnyway={noop}
        onClose={noop}
        testId="gallery-case-limit"
        dialogProps={dialogProps}
        {...extra}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "ProjectCaseLimitDialog",
  demos: [
    { name: "A new Project from a file of many games", render: () => framed(NEW_PROJECT) },
    { name: "New case taking a Project past the limit", render: () => framed(INTO_PROJECT) },
    { name: "The Library's picks — already in the Library", render: () => framed(FROM_LIBRARY) },
    { name: "The collection being made", render: () => framed(NEW_PROJECT, { busy: true }) },
    { name: "A refused write, its problem in the dialog", render: () => framed(NEW_PROJECT, { error: STORAGE_PROBLEM }) },
  ],
};

export default gallery;
