import Button from "@mui/material/Button";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { EngineSearchChange } from "../../../lib/engineSearchSettings";
import type { BlockFamilyId } from "../../families";
import EngineOptionsChangedDialog from "./EngineOptionsChangedDialog";
import { ANALYSIS_CHANGES, GAME_CHANGES, HELD } from "./fixtures";

const demo = (
  changes: readonly EngineSearchChange[],
  record: "analysis" | "game",
  held?: readonly { field: "threads" | "hashMb"; value: number }[],
) => (
  <WithState<boolean> initial={false}>
    {(open, set) => (
      <>
        <Button variant="outlined" onClick={() => set(() => true)}>
          Open
        </Button>
        <EngineOptionsChangedDialog
          open={open}
          changes={changes}
          held={held}
          record={record}
          onDismiss={() => set(() => false)}
          onUse={() => set(() => false)}
          testId="gallery-engine-changed"
        />
      </>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "EngineOptionsChangedDialog",
  demos: [
    { name: "A saved analysis — deeper, more lines, a time limit, infinite analysis", render: () => demo(ANALYSIS_CHANGES, "analysis") },
    { name: "A played game — Threads and Hash, which this engine would hold", render: () => demo(GAME_CHANGES, "game", HELD) },
  ],
};

export default gallery;
