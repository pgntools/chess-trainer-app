import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { GAMES } from "./fixtures";
import GamesPickerDialog, { type GamesPickerDialogProps } from "./GamesPickerDialog";

const noop = () => {};

const framed = (props: Pick<GamesPickerDialogProps, "mode" | "rows"> & Partial<GamesPickerDialogProps>, testId: string) => (
  <DialogFrame height={720}>
    {(dialogProps) => <GamesPickerDialog open onSubmit={noop} onClose={noop} testId={testId} dialogProps={dialogProps} {...props} />}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "GamesPickerDialog",
  demos: [
    { name: "Select games — tick, find by words, sort, page", render: () => framed({ mode: "many", rows: GAMES, max: 1000 }, "gallery-games-picker") },
    {
      name: "More picked than the cap — Select off, and why",
      render: () => framed({ mode: "many", rows: GAMES, max: 10, initialPicked: GAMES.slice(0, 12).map((row) => row.number) }, "gallery-games-picker-cap"),
    },
    { name: "Choose one game — a click chooses it", render: () => framed({ mode: "one", rows: GAMES }, "gallery-games-picker-one") },
  ],
};

export default gallery;
