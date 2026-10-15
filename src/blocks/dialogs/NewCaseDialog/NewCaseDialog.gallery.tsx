import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { OVER_LIMIT, TWO_GAMES } from "./fixtures";
import NewCaseDialog from "./NewCaseDialog";

const noop = () => {};

const framed = (
  {
    busy = false,
    problem = null,
    initialPgn,
    initialFileName,
  }: { busy?: boolean; problem?: string | null; initialPgn?: string; initialFileName?: string },
  testId: string,
) => (
  <DialogFrame height={760}>
    {(dialogProps) => (
      <NewCaseDialog
        open
        onClose={noop}
        onCreate={noop}
        busy={busy}
        problem={problem}
        initialPgn={initialPgn}
        initialFileName={initialFileName}
        testId={testId}
        dialogProps={dialogProps}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "NewCaseDialog",
  demos: [
    { name: "Game or Position, from a PGN or a FEN — paste one to try", render: () => framed({}, "gallery-new-case") },
    {
      name: "A PGN of several games — select one (an autocomplete) or one case per game",
      render: () => framed({ initialPgn: TWO_GAMES }, "gallery-new-case-many"),
    },
    {
      name: "A file read — its plate in the input's place, × to pick another",
      render: () => framed({ initialPgn: TWO_GAMES, initialFileName: "club-championship.pgn" }, "gallery-new-case-file"),
    },
    {
      name: "More than 1,000 games — One case per game off, its limit marked in red",
      render: () => framed({ initialPgn: OVER_LIMIT, initialFileName: "smith-morra.pgn" }, "gallery-new-case-limit"),
    },
    { name: "A refused write", render: () => framed({ problem: "The case could not be saved." }, "gallery-new-case-problem") },
    { name: "Writing", render: () => framed({ busy: true }, "gallery-new-case-busy") },
  ],
};

export default gallery;
