import { demoTable, textCell } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import PickHeaderCell from "./PickHeaderCell";

const noop = () => {};

const withPicks = (total: number, picked: number) =>
  demoTable(
    <>
      <PickHeaderCell total={total} picked={picked} onToggleAll={noop} label="Select all" testId="gallery-pick-all" />
      {textCell("Game")}
    </>,
    [],
  );

const gallery: GalleryModule = {
  section: "tables",
  title: "PickHeaderCell",
  demos: [
    { name: "None picked", render: () => withPicks(4, 0) },
    { name: "Some picked — indeterminate", render: () => withPicks(4, 2) },
    { name: "All picked", render: () => withPicks(4, 4) },
    { name: "Nothing to pick — off", render: () => withPicks(0, 0) },
  ],
};

export default gallery;
