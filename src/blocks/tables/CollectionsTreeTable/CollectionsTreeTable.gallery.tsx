import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import type { BlockFamilyId } from "../../families";
import { isPotentialTournament, readsAsTournament } from "../../../lib/libraryCollections";
import CollectionsTreeTable from "./CollectionsTreeTable";
import { BUILT_IN, rowsOpen } from "./fixtures";
import {
  libraryTreeFirstDirection,
  type LibraryTreeColumn,
} from "./libraryTreeColumns";

type State = { open: Set<string>; sort: DataTableSort<LibraryTreeColumn> };

const noop = () => {};

const demo = (initialOpen: string[]) => (
  <WithState<State>
    initial={{
      open: new Set(initialOpen),
      sort: { column: "name", direction: "asc" },
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
            uploadLink: (folder) => ({ href: `#upload-${folder.id}` }),
            onNewFolder: noop,
            onDownloadFolder: noop,
            onRenameFolder: noop,
            onMoveFolder: noop,
            onDeleteFolder: noop,
            onDownloadCollection: noop,
            onMoveCollection: noop,
            onDeleteCollection: noop,
          }}
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
  ],
};

export default gallery;
