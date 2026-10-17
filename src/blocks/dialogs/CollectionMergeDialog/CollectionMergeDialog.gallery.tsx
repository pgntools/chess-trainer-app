import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { CollectionMergeSettings } from "../../../lib/collectionMerge";
import type { BlockFamilyId } from "../../families";
import type { CollectionMergeFormSource } from "../../forms";
import CollectionMergeDialog, { type CollectionMergeDone } from "./CollectionMergeDialog";
import { CANDIDATES, DEFAULTS, DONE, DONE_NO_DUPLICATES, EVERYTHING, FOUR, ONE, TOO_LARGE, TWO } from "./fixtures";

const noop = () => {};

type Held = { sources: CollectionMergeFormSource[]; settings: CollectionMergeSettings };

const framed = (
  sources: CollectionMergeFormSource[],
  settings: CollectionMergeSettings,
  extra: { busy?: boolean; error?: string; done?: CollectionMergeDone } = {},
) => (
  <DialogFrame height={extra.done === undefined ? 640 : 280}>
    {(dialogProps) => (
      <WithState<Held> initial={{ sources, settings }}>
        {(held, set) => (
          <CollectionMergeDialog
            open
            onClose={noop}
            sources={held.sources}
            onSourcesChange={(next) => set((before) => ({ ...before, sources: next }))}
            candidates={CANDIDATES}
            settings={held.settings}
            onChange={(patch) => set((before) => ({ ...before, settings: { ...before.settings, ...patch } }))}
            onMerge={noop}
            onDownload={noop}
            testId="gallery-collection-merge-dialog"
            dialogProps={dialogProps}
            {...extra}
          />
        )}
      </WithState>
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "CollectionMergeDialog",
  demos: [
    { name: "From a collection page — one collection, Merge off until another is added", render: () => framed(ONE, DEFAULTS) },
    { name: "From the Library's picks — two collections, the defaults", render: () => framed(TWO, DEFAULTS) },
    { name: "Four collections, a name of the reader's", render: () => framed(FOUR, EVERYTHING) },
    { name: "Under way", render: () => framed(FOUR, EVERYTHING, { busy: true }) },
    { name: "Refused — over the Library's limit", render: () => framed(FOUR, DEFAULTS, { error: TOO_LARGE }) },
    { name: "Done — Open collection, Download PGN", render: () => framed(TWO, DEFAULTS, { done: DONE }) },
    { name: "Done, no duplicate", render: () => framed(TWO, DEFAULTS, { done: DONE_NO_DUPLICATES }) },
  ],
};

export default gallery;
