import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import CollectionMergeSummary from "./CollectionMergeSummary";
import { ADDED, EMPTY, FILE_ONLY, TOO_LARGE } from "./fixtures";

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "CollectionMergeSummary",
  demos: [
    {
      name: "Added to the Library, its link",
      render: () => <CollectionMergeSummary summary={ADDED} collectionLink={{ href: "#collection" }} testId="gallery-merge-added" />,
    },
    { name: "Added, no link given", render: () => <CollectionMergeSummary summary={ADDED} testId="gallery-merge-added-plain" /> },
    { name: "Too large for a collection — the reason", render: () => <CollectionMergeSummary summary={TOO_LARGE} testId="gallery-merge-too-large" /> },
    { name: "No game written", render: () => <CollectionMergeSummary summary={EMPTY} testId="gallery-merge-empty" /> },
    { name: "The file alone, long and Hebrew names", render: () => <CollectionMergeSummary summary={FILE_ONLY} testId="gallery-merge-file-only" /> },
  ],
};

export default gallery;
