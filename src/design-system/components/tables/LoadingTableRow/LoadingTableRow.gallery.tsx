import { demoTableOfRows, textCell } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import LoadingTableRow from "./LoadingTableRow";

const gallery: GalleryModule = {
  section: "tables",
  title: "LoadingTableRow",
  demos: [
    {
      name: "Rows still being read",
      render: () =>
        demoTableOfRows(
          <>
            {textCell("White")}
            {textCell("Black")}
            {textCell("Result")}
          </>,
          <LoadingTableRow colSpan={3} testId="gallery-loading-row">Reading the games…</LoadingTableRow>,
        ),
    },
  ],
};

export default gallery;
