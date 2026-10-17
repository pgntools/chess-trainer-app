import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { CollectionMergeSettings } from "../../../lib/collectionMerge";
import type { BlockFamilyId } from "../../families";
import CollectionMergeForm, { type CollectionMergeFormCandidate, type CollectionMergeFormSource } from "./CollectionMergeForm";
import { CANDIDATES, DEFAULTS, EVERYTHING, FOUR, LONG_NAMES, ONE, TWO } from "./fixtures";

type Held = { sources: CollectionMergeFormSource[]; settings: CollectionMergeSettings };

const demo = (
  sources: CollectionMergeFormSource[],
  settings: CollectionMergeSettings,
  candidates: readonly CollectionMergeFormCandidate[] = CANDIDATES,
  disabled = false,
) => (
  <WithState<Held> initial={{ sources, settings }}>
    {(held, set) => (
      <Box sx={{ maxWidth: 420 }}>
        <CollectionMergeForm
          sources={held.sources}
          onSourcesChange={(next) => set((before) => ({ ...before, sources: next }))}
          candidates={candidates}
          settings={held.settings}
          onChange={(patch) => set((before) => ({ ...before, settings: { ...before.settings, ...patch } }))}
          disabled={disabled}
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
    { name: "One collection — a collection page's Merge with…, the picker to add the rest", render: () => demo(ONE, DEFAULTS) },
    { name: "Two collections — neither can be removed; the defaults", render: () => demo(TWO, DEFAULTS) },
    { name: "Four collections, reordered and removed down to two", render: () => demo(FOUR, DEFAULTS) },
    { name: "Same-game duplicates, a name of the reader's", render: () => demo(FOUR, EVERYTHING) },
    { name: "Nothing left to add — no picker", render: () => demo(TWO, DEFAULTS, []) },
    { name: "Under way — nothing changes", render: () => demo(FOUR, EVERYTHING, CANDIDATES, true) },
    { name: "Long names, a Hebrew one, a large collection", render: () => demo(LONG_NAMES, DEFAULTS) },
  ],
};

export default gallery;
