import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { ALL_DONE, INDEXING_FAILED, SOME_FAILED } from "./fixtures";
import ImportReport from "./ImportReport";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "ImportReport",
  demos: [
    { name: "Every category written — a success", render: () => <ImportReport results={ALL_DONE} testId="gallery-import-report" /> },
    { name: "One refused past its cap, one the browser refused — a warning", render: () => <ImportReport results={SOME_FAILED} testId="gallery-import-report-failed" /> },
    { name: "A collection that could not be indexed", render: () => <ImportReport results={INDEXING_FAILED} testId="gallery-import-report-indexing" /> },
  ],
};

export default gallery;
