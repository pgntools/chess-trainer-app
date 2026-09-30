import { demoTableOfRows, textCell } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import EmptyTableRow from "./EmptyTableRow";

const gallery: GalleryModule = {
  section: "tables",
  title: "EmptyTableRow",
  demos: [
    {
      name: "No rows yet",
      render: () =>
        demoTableOfRows(
          <>
            {textCell("White")}
            {textCell("Black")}
            {textCell("Result")}
          </>,
          <EmptyTableRow colSpan={3} testId="gallery-empty-row">No games yet</EmptyTableRow>,
        ),
    },
    {
      name: "No row matches the filters",
      render: () =>
        demoTableOfRows(
          <>
            {textCell("White")}
            {textCell("Black")}
          </>,
          <EmptyTableRow colSpan={2} testId="gallery-no-match-row">No game matches the filters</EmptyTableRow>,
        ),
    },
  ],
};

export default gallery;
