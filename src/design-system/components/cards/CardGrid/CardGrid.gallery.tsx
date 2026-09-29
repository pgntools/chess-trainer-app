import { demoPreview } from "../../../gallery/demoPreview";
import type { GalleryModule } from "../../../gallery/types";
import FolderCard from "../FolderCard/FolderCard";
import RecordCard from "../RecordCard/RecordCard";
import CardGrid from "./CardGrid";
import type { CardSize } from "./cardGridColumns";

const grid = (size: CardSize) => (
  <CardGrid size={size} testId={`gallery-card-grid-${size}`}>
    <FolderCard name="Openings" count="12 analyses" onOpen={() => {}} openLabel="Open Openings" testId={`gallery-grid-${size}-folder`} />
    {["Najdorf", "Caro-Kann", "Berlin", "King's Indian"].map((name) => (
      <RecordCard
        key={name}
        preview={demoPreview}
        name={name}
        caption="24 moves"
        onOpen={() => {}}
        openLabel={`Open ${name}`}
        testId={`gallery-grid-${size}-${name}`}
      />
    ))}
  </CardGrid>
);

const gallery: GalleryModule = {
  section: "cards",
  title: "CardGrid",
  demos: [
    { name: "Compact (160 px) — a folder stands as tall as its neighbours", render: () => grid("compact") },
    { name: "Medium (220 px)", render: () => grid("medium") },
    { name: "Comfortable (260 px)", render: () => grid("comfortable") },
  ],
};

export default gallery;
