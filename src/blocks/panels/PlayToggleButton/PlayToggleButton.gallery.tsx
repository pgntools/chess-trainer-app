import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { ENGINE_OFF, PAUSED, THINKING, YOUR_MOVE } from "./fixtures";
import PlayToggleButton from "./PlayToggleButton";

const noop = () => {};

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "PlayToggleButton",
  demos: [
    { name: "Paused — press to let the engine play", render: () => <PlayToggleButton {...PAUSED} onToggle={noop} testId="gallery-play-paused" /> },
    { name: "Playing, the engine thinking — a named ring", render: () => <PlayToggleButton {...THINKING} onToggle={noop} testId="gallery-play-thinking" /> },
    { name: "Playing, the reader's move", render: () => <PlayToggleButton {...YOUR_MOVE} onToggle={noop} testId="gallery-play-yours" /> },
    { name: "The engine off — off, its tooltip saying why", render: () => <PlayToggleButton {...ENGINE_OFF} onToggle={noop} testId="gallery-play-off" /> },
  ],
};

export default gallery;
