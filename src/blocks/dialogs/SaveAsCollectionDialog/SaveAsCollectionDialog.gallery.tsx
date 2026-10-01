import type { ReactNode } from "react";

import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import SaveAsCollectionDialog from "./SaveAsCollectionDialog";
import { DERIVED, FULL, HEBREW } from "./fixtures";

const noop = () => {};

const framed = (initial: string, extra: { busy?: boolean; error?: ReactNode } = {}) => (
  <DialogFrame height={300}>
    {(dialogProps) => (
      <SaveAsCollectionDialog
        open
        initial={initial}
        count={12}
        onSave={noop}
        onClose={noop}
        testId="gallery-save-collection"
        dialogProps={dialogProps}
        {...extra}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "SaveAsCollectionDialog",
  demos: [
    { name: "Prefilled with the derived name", render: () => framed(DERIVED) },
    { name: "A blank name keeps Create collection off", render: () => framed("") },
    { name: "At the name's cap", render: () => framed(FULL) },
    { name: "The write under way", render: () => framed(DERIVED, { busy: true }) },
    {
      name: "A failed write, its problem in the dialog",
      render: () =>
        framed(DERIVED, { error: "The collection could not be created — this browser's storage may be full or unavailable. Nothing was created." }),
    },
    { name: "A Hebrew name (switch to RTL)", render: () => framed(HEBREW) },
  ],
};

export default gallery;
