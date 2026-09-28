import type { GalleryModule } from "../../../gallery/types";
import LoadingSpinnerLine from "./LoadingSpinnerLine";

const gallery: GalleryModule = {
  section: "states",
  title: "LoadingSpinnerLine",
  demos: [
    { name: "Small (beside body2)", render: () => <LoadingSpinnerLine testId="gallery-spinner-line">Reading…</LoadingSpinnerLine> },
    { name: "Medium", render: () => <LoadingSpinnerLine size="medium" testId="gallery-spinner-line-medium">Opening the repertoire…</LoadingSpinnerLine> },
  ],
};

export default gallery;
