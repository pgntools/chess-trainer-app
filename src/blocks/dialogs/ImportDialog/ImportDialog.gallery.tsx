import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { ImportCaps, ImportCurrent, ImportDump } from "../../../lib/dataImport";
import type { BlockFamilyId } from "../../families";
import { CAPS, CLASHING_APP, DUMP, EMPTY_APP, HEBREW_APP, HEBREW_DUMP, TIGHT_CAPS } from "./fixtures";
import ImportDialog from "./ImportDialog";

const noop = () => {};

/** The dialog open in a frame of its own, over the demo's zip and app. */
const framed = (dump: ImportDump, current: ImportCurrent, caps: ImportCaps, testId: string, height = 560) => (
  <DialogFrame height={height}>
    {(dialogProps) => (
      <ImportDialog fileName="chessapp-export-2026-09-21.zip" dump={dump} current={current} caps={caps} onCancel={noop} onImport={noop} testId={testId} dialogProps={dialogProps} />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "ImportDialog",
  demos: [
    { name: "Into an app that has some of it — clashing folders, each opening to its own choice", render: () => framed(DUMP, CLASHING_APP, CAPS, "gallery-import") },
    { name: "Into an empty app — only the top levels clash", render: () => framed(DUMP, EMPTY_APP, CAPS, "gallery-import-empty") },
    { name: "Past the caps — the played games' warning, a refused category", render: () => framed(DUMP, EMPTY_APP, TIGHT_CAPS, "gallery-import-caps") },
    { name: "One category, a Hebrew folder name (switch the direction to RTL)", render: () => framed(HEBREW_DUMP, HEBREW_APP, CAPS, "gallery-import-hebrew", 420) },
  ],
};

export default gallery;
