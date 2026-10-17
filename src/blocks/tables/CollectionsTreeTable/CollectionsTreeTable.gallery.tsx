import Box from "@mui/material/Box";
import MergeTypeRoundedIcon from "@mui/icons-material/MergeTypeRounded";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import { IconAction } from "../../../design-system/components/toolbars";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import type { BlockFamilyId } from "../../families";
import { isPotentialTournament, readsAsTournament } from "../../../lib/libraryCollections";
import CollectionsTreeTable from "./CollectionsTreeTable";
import { BUILT_IN, picksOver, rowsOpen } from "./fixtures";
import {
  libraryTreeFirstDirection,
  type LibraryTreeColumn,
} from "./libraryTreeColumns";

type State = { open: Set<string>; sort: DataTableSort<LibraryTreeColumn>; picked: Set<string> };

const noop = () => {};

const demo = (initialOpen: string[], { picked = [] as string[], picks = picked.length > 0 }: { picks?: boolean; picked?: string[] } = {}) => (
  <WithState<State>
    initial={{
      open: new Set(initialOpen),
      sort: { column: "name", direction: "asc" },
      picked: new Set(picked),
    }}
  >
    {(state, set) => (
      <Box
        sx={{
          height: 380,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <CollectionsTreeTable
          rows={rowsOpen(state.open)}
          sort={state.sort}
          onSort={(column) =>
            set((before) => ({
              ...before,
              sort:
                before.sort.column === column
                  ? {
                      column,
                      direction:
                        before.sort.direction === "asc" ? "desc" : "asc",
                    }
                  : { column, direction: libraryTreeFirstDirection(column) },
            }))
          }
          onToggle={(id) =>
            set((before) => {
              const open = new Set(before.open);
              if (!open.delete(id)) open.add(id);
              return { ...before, open };
            })
          }
          collectionLink={(entry) => ({ href: `#${entry.id}` })}
          onOpenCollection={noop}
          builtInFolderId={BUILT_IN}
          actions={{
            onDownloadFolder: noop,
            onRenameFolder: noop,
            onMoveFolder: noop,
            onDownloadCollection: noop,
            onMoveCollection: noop,
            onDeleteCollection: noop,
          }}
          picks={
            picks
              ? picksOver(
                  state.picked,
                  (next) => set((before) => ({ ...before, picked: next })),
                  <IconAction label="Merge collections…" onClick={noop} disabled={state.picked.size < 2} testId="gallery-library-tree-merge">
                    <MergeTypeRoundedIcon fontSize="small" />
                  </IconAction>,
                )
              : undefined
          }
          isTournament={(collection) => readsAsTournament(collection)}
          isPotentialTournament={(collection) => isPotentialTournament(collection)}
          testId="gallery-library-tree"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "CollectionsTreeTable",
  demos: [
    {
      name: "Built-in open, a reader's folders closed — open them, sort by a header",
      render: () => demo([BUILT_IN]),
    },
    {
      name: "Every folder open (a Hebrew name inside)",
      render: () => demo([BUILT_IN, "gopenings", "gsicilian"]),
    },
    { name: "All closed", render: () => demo([]) },
    // CTA-221: the collections picked (Merge collections… with two or more).
    { name: "Collections picked", render: () => demo([BUILT_IN, "gopenings"], { picked: ["tal"] }) },
    // CTA-235: a folder ticked stands for all under it; its parent partly ticked.
    { name: "A folder picked — its parent partly ticked", render: () => demo([BUILT_IN, "gopenings", "gsicilian"], { picked: ["gsicilian", "unajdorf"] }) },
    { name: "Picks on, nothing picked yet", render: () => demo([BUILT_IN, "gopenings"], { picks: true }) },
  ],
};

export default gallery;
