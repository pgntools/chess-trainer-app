import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { CollectionImportSource } from "../../../lib/libraryCollections";
import type { BlockFamilyId } from "../../families";
import CollectionImportDialog, { type CollectionImportDialogProps } from "./CollectionImportDialog";
import { ONE_EVENT, ONE_FILE, PASTE, ZIP } from "./fixtures";

const noop = () => {};

const framed = (
  source: CollectionImportSource,
  extra: { intoName?: string; problem?: string; choiceOnly?: CollectionImportDialogProps["choiceOnly"]; tagsField?: boolean } = {},
) => (
  <DialogFrame height={620}>
    {(dialogProps) => (
      <CollectionImportDialog source={source} onCancel={noop} onImport={noop} testId="gallery-import" dialogProps={dialogProps} {...extra} />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "CollectionImportDialog",
  demos: [
    { name: "One file — the Elo range, the dates and the players filter it", render: () => framed(ONE_FILE) },
    { name: "A zip of two files, one with Hebrew names (switch to RTL)", render: () => framed(ZIP) },
    { name: "A paste with nothing to filter on", render: () => framed(PASTE) },
    { name: "Add games to a collection", render: () => framed(ONE_FILE, { intoName: "Club games" }) },
    {
      name: "A plain choice of games — Analysis V2's new Project (CTA-186): no split, no mark",
      render: () => framed(ONE_FILE, { choiceOnly: { title: "Choose the games for the project", confirmLabel: "Create project" } }),
    },
    {
      name: "…and games picked by hand among those the filters keep (CTA-208) — Select games… opens the picker",
      render: () =>
        framed(ZIP, {
          choiceOnly: {
            title: "Choose the games for the project",
            confirmLabel: "Create project",
            selectGames: {
              select: "Select games…",
              change: "Change the selection…",
              clear: "Use every game the filters keep",
              selected: (count) => `${count} games picked.`,
            },
          },
        }),
    },
    // CTA-234: the Library's imports take the TAGS field — type a bad line to see it said and Import turn off.
    { name: "The Library's import — the TAGS field, tags stamped on every imported game (CTA-234)", render: () => framed(ONE_FILE, { tagsField: true }) },
    { name: "…on Add games too", render: () => framed(ZIP, { intoName: "Club games", tagsField: true }) },
    { name: "The last try failed", render: () => framed(ONE_FILE, { problem: "The browser refused to store the games — its storage may be full." }) },
    // Split by event (CTA-127): the zip's first file carries two events, so
    // its switch can be tried on in the preview; the one-event file's reads
    // off with its reason.
    // CTA-142: one event — the tournament fields, the suggested type with an Apply; on One file, Split by event's own switch, "Mark each event's tournament type".
    { name: "A tournament export — nothing to split; the tournament mark and its suggested type", render: () => framed(ONE_EVENT) },
  ],
};

export default gallery;
