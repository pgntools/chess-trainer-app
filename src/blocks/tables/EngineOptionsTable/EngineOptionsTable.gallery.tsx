import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import EngineOptionsTable from "./EngineOptionsTable";
import { NO_OPTIONS, PINNED_AND_COMBO, STOCKFISH_19_NATIVE } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "EngineOptionsTable",
  demos: [
    {
      name: "Stockfish 19 on the engine server — every option it declares",
      render: () => (
        <EngineOptionsTable options={STOCKFISH_19_NATIVE} ariaLabel="UCI defaults — Stockfish 19" testId="gallery-engine-options" />
      ),
    },
    {
      name: "A pinned spin (one value) and a combo's values",
      render: () => (
        <EngineOptionsTable options={PINNED_AND_COMBO} ariaLabel="UCI defaults — a build" testId="gallery-engine-options-pinned" />
      ),
    },
    {
      name: "No options",
      render: () => <EngineOptionsTable options={NO_OPTIONS} ariaLabel="UCI defaults — none" testId="gallery-engine-options-none" />,
    },
  ],
};

export default gallery;
