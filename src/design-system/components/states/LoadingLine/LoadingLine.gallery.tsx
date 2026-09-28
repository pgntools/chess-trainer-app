import type { GalleryModule } from "../../../gallery/types";
import LoadingLine from "./LoadingLine";

const gallery: GalleryModule = {
  section: "states",
  title: "LoadingLine",
  demos: [{ name: "Reading a store", render: () => <LoadingLine testId="gallery-loading-line">Reading your games…</LoadingLine> }],
};

export default gallery;
