import DialogFrame from "../../../gallery/DialogFrame";
import type { GalleryModule } from "../../../gallery/types";
import DeleteManyDialog, { type DeleteManyDialogProps } from "./DeleteManyDialog";

const noop = () => {};

const framed = (props: Partial<DeleteManyDialogProps>, height = 240) => (
  <DialogFrame height={height}>
    {(dialogProps) => (
      <DeleteManyDialog
        open
        onClose={noop}
        onConfirm={noop}
        title="Delete 7 picked games?"
        message="They are removed from this collection for good."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        testId="gallery-delete-many"
        dialogProps={dialogProps}
        {...props}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule = {
  section: "dialogs",
  title: "DeleteManyDialog",
  demos: [
    { name: "Default", render: () => framed({}) },
    { name: "With a failed delete in the error slot", render: () => framed({ error: "The games could not be deleted: storage is full." }, 300) },
    { name: "Busy", render: () => framed({ busy: true }) },
  ],
};

export default gallery;
