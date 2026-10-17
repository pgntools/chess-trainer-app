import type { GalleryModule } from "../../../gallery/types";
import ProgressChip from "./ProgressChip";

const gallery: GalleryModule = {
  section: "states",
  title: "ProgressChip",
  demos: [
    {
      name: "Filling — a search three quarters of the way to its depth",
      render: () => (
        <ProgressChip label="Depth 18/24" value={75} progressLabel="Depth 18 of 24" testId="gallery-progress-chip" />
      ),
    },
    {
      name: "Just started — an empty fill",
      render: () => (
        <ProgressChip label="Depth 0/24" value={0} progressLabel="Depth 0 of 24" testId="gallery-progress-chip-empty" />
      ),
    },
    {
      name: "Full",
      render: () => (
        <ProgressChip label="Depth 24/24" value={100} progressLabel="Depth 24 of 24" testId="gallery-progress-chip-full" />
      ),
    },
    {
      name: "No value — a plain chip (the search finished)",
      render: () => <ProgressChip label="Depth 24" testId="gallery-progress-chip-plain" />,
    },
  ],
};

export default gallery;
