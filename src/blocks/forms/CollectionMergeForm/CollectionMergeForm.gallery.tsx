import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import { collectionMergeSettingsFrom, type CollectionMergeSettings } from "../../../lib/jobs/kinds/collectionMerge/core";
import type { BlockFamilyId } from "../../families";
import CollectionMergeForm, { type CollectionMergeFormSource } from "./CollectionMergeForm";
import { DEFAULTS, EVERYTHING, FOUR, LONG_NAMES, TWO } from "./fixtures";

type Held = { sources: CollectionMergeFormSource[]; settings: CollectionMergeSettings };

const demo = (sources: CollectionMergeFormSource[], settings: CollectionMergeSettings) => (
  <WithState<Held> initial={{ sources, settings }}>
    {(held, set) => (
      <Box sx={{ maxWidth: 420 }}>
        <CollectionMergeForm
          sources={held.sources}
          onSourcesChange={(next) => set((before) => ({ ...before, sources: next }))}
          settings={held.settings}
          onChange={(patch) => set((before) => ({ ...before, settings: collectionMergeSettingsFrom({ ...before.settings, ...patch }) }))}
          testId="gallery-collection-merge"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "CollectionMergeForm",
  demos: [
    { name: "Two collections — neither can be removed; the defaults", render: () => demo(TWO, DEFAULTS) },
    { name: "Four collections, reordered and removed down to two", render: () => demo(FOUR, DEFAULTS) },
    { name: "Same-game duplicates, a name of the reader's, a Library collection too", render: () => demo(FOUR, EVERYTHING) },
    { name: "Long names, a Hebrew one, a large collection", render: () => demo(LONG_NAMES, DEFAULTS) },
  ],
};

export default gallery;
