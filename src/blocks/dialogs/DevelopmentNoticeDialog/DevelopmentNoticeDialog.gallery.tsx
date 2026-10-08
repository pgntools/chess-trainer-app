import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import DevelopmentNoticeDialog from "./DevelopmentNoticeDialog";
import { NOTICE_TEST_ID } from "./fixtures";

const noop = () => {};

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "DevelopmentNoticeDialog",
  demos: [
    {
      name: "Open — the app's one notice, with its Dismiss",
      render: () => (
        <DialogFrame height={520}>
          {(dialogProps) => <DevelopmentNoticeDialog open onDismiss={noop} testId={`gallery-${NOTICE_TEST_ID}`} dialogProps={dialogProps} />}
        </DialogFrame>
      ),
    },
  ],
};

export default gallery;
