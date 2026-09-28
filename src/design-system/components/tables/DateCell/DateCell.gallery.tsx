import { demoTable, textCell } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import DateCell from "./DateCell";

const gallery: GalleryModule = {
  section: "tables",
  title: "DateCell",
  demos: [
    {
      name: "A full date, a PGN's partial dates, and none",
      render: () =>
        demoTable(
          <>
            {textCell("Source")}
            {textCell("Date")}
          </>,
          [
            <>
              {textCell("A saved game (a timestamp)")}
              <DateCell value={Date.UTC(2026, 8, 28, 12)} />
            </>,
            <>
              {textCell("PGN 1927.11.??")}
              <DateCell value="1927.11" />
            </>,
            <>
              {textCell("PGN 1848.??.??")}
              <DateCell value="1848" />
            </>,
            <>
              {textCell("PGN ????.??.??")}
              <DateCell value={undefined} />
            </>,
          ],
        ),
    },
  ],
};

export default gallery;
