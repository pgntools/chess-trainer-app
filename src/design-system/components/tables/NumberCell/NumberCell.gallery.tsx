import { demoTable, textCell } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import NumberCell from "./NumberCell";

const bytes = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MB`;

const gallery: GalleryModule = {
  section: "tables",
  title: "NumberCell",
  demos: [
    {
      name: "As is, missing, muted, and formatted by the caller",
      render: () =>
        demoTable(
          <>
            {textCell("Player")}
            {textCell("Elo")}
            {textCell("Games")}
            {textCell("Size")}
          </>,
          [
            <>
              {textCell("Tal")}
              <NumberCell value={2700} />
              <NumberCell value={2636} secondary />
              <NumberCell value={1_610_612} format={bytes} />
            </>,
            <>
              {textCell("Petrosian")}
              <NumberCell value={undefined} />
              <NumberCell value={-12} secondary />
              <NumberCell value={524_288} format={bytes} />
            </>,
          ],
        ),
    },
  ],
};

export default gallery;
