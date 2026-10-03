import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { CollectionImportSource } from "../../../lib/libraryCollections";
import type { BlockFamilyId } from "../../families";
import CollectionImportDialog from "./CollectionImportDialog";
import { ONE_EVENT, ONE_FILE, PASTE, ZIP } from "./fixtures";

const noop = () => {};

const framed = (source: CollectionImportSource, extra: { intoName?: string; problem?: string } = {}) => (
  <DialogFrame height={620}>
    {(dialogProps) => (
      <CollectionImportDialog source={source} onCancel={noop} onImport={noop} testId="gallery-import" dialogProps={dialogProps} {...extra} />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "CollectionImportDialog",
  demos: [
    { name: "One file — the Elo range, the dates and the players filter it", render: () => framed(ONE_FILE) },
    { name: "A zip of two files, one with Hebrew names (switch to RTL)", render: () => framed(ZIP) },
    { name: "A paste with nothing to filter on", render: () => framed(PASTE) },
    { name: "Add games to a collection", render: () => framed(ONE_FILE, { intoName: "Club games" }) },
    { name: "The last try failed", render: () => framed(ONE_FILE, { problem: "The browser refused to store the games — its storage may be full." }) },
    // Split by event (CTA-127): the zip's first file carries two events, so
    // its switch can be tried on in the preview; the one-event file's reads
    // off with its reason.
    { name: "A tournament export — nothing to split", render: () => framed(ONE_EVENT) },
  ],
};

export default gallery;
