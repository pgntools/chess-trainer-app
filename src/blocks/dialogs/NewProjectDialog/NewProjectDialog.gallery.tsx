import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import NewProjectDialog from "./NewProjectDialog";

const noop = () => {};

const framed = ({ busy = false, problem = null }: { busy?: boolean; problem?: string | null }, testId: string) => (
  <DialogFrame height={420}>
    {(dialogProps) => (
      <NewProjectDialog open onClose={noop} onCreate={noop} busy={busy} problem={problem} testId={testId} dialogProps={dialogProps} />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "NewProjectDialog",
  demos: [
    { name: "A name, and optionally a .pgn — pick one to see it", render: () => framed({}, "gallery-new-project") },
    { name: "A file that would not read", render: () => framed({ problem: "No game could be read in that file." }, "gallery-new-project-problem") },
    { name: "Reading and writing", render: () => framed({ busy: true }, "gallery-new-project-busy") },
  ],
};

export default gallery;
