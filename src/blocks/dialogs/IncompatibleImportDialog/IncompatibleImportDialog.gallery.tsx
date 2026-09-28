import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { ImportProblem } from "../../../lib/dataImport";
import type { BlockFamilyId } from "../../families";
import { LONG_FILES, NEWER, NOT_ZIP, PGN_FILES, UNREADABLE } from "./fixtures";
import IncompatibleImportDialog from "./IncompatibleImportDialog";

const noop = () => {};

const framed = (fileName: string, problem: ImportProblem, pgnFiles: readonly string[], testId: string, height = 440) => (
  <DialogFrame height={height}>
    {(dialogProps) => (
      <IncompatibleImportDialog
        fileName={fileName}
        problem={problem}
        pgnFiles={pgnFiles}
        manualLink={(kind) => ({ href: `#${kind}` })}
        onClose={noop}
        testId={testId}
        dialogProps={dialogProps}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "IncompatibleImportDialog",
  demos: [
    { name: "A newer version's zip — its PGN files listed", render: () => framed("chessapp-export-2027-01-01.zip", NEWER, PGN_FILES, "gallery-incompatible") },
    { name: "A file that does not match its manifest", render: () => framed("chessapp-export-2026-09-21.zip", UNREADABLE, PGN_FILES.slice(0, 2), "gallery-incompatible-unreadable", 400) },
    { name: "Not a zip at all — no PGN files", render: () => framed("notes.txt", NOT_ZIP, [], "gallery-incompatible-not-zip", 360) },
    { name: "A long path (wraps, left to right under RTL too)", render: () => framed("club.zip", UNREADABLE, LONG_FILES, "gallery-incompatible-long", 400) },
  ],
};

export default gallery;
