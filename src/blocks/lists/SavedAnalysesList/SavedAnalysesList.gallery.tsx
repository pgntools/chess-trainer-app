import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { demoPreview } from "../../../design-system/gallery/demoPreview";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import type { SavedListView } from "../savedListView";
import { ENTRIES, FOLDERS, HEBREW_ENTRIES, HEBREW_FOLDERS, LONG_ENTRIES, manyEntries } from "./fixtures";
import SavedAnalysesList, { type SavedAnalysisEntry, type SavedAnalysisFolderEntry } from "./SavedAnalysesList";

const noop = () => {};
const PAGE = manyEntries(50);

/** The block on fixtures, its picks held by the demo as the screen holds them. */
/** What the list view's `table` slot holds on the screen — the `SavedAnalysesTable` block, its own gallery page. */
const TABLE_SLOT = (
  <Box sx={{ flex: 1, minHeight: 0, display: "grid", placeItems: "center", border: 1, borderColor: "divider", borderStyle: "dashed" }}>
    <Typography variant="body2" color="text.secondary">
      The folder&apos;s games table (SavedAnalysesTable)
    </Typography>
  </Box>
);

const demo = (
  view: SavedListView,
  folders: readonly SavedAnalysisFolderEntry[],
  entries: readonly SavedAnalysisEntry[],
  table?: typeof TABLE_SLOT,
) => (
  <WithState<Set<string>> initial={new Set(["a1"])}>
    {(picked, setPicked) => (
      <Box sx={{ height: 420, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <SavedAnalysesList
          view={view}
          folders={folders}
          entries={entries}
          table={table}
          picked={picked}
          onTogglePick={(id) =>
            setPicked((before) => {
              const next = new Set(before);
              if (!next.delete(id)) next.add(id);
              return next;
            })
          }
          openLink={(saved) => ({ href: `#open-${saved.id}` })}
          settingsLink={(saved) => ({ href: `#settings-${saved.id}` })}
          onOpenFolder={noop}
          folderActions={{ onDownload: noop, onRename: noop, onMove: noop, onDelete: noop }}
          preview={() => demoPreview}
          empty={{ label: "No saved analyses yet.", testId: "gallery-saved-analyses-empty" }}
          testId="gallery-saved-analyses"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "SavedAnalysesList",
  demos: [
    { name: "The list — folders first (one empty), then the games table", render: () => demo("list", FOLDERS, [], TABLE_SLOT) },
    { name: "The list — folders only (no analysis here)", render: () => demo("list", FOLDERS, []) },
    { name: "Small boards — the opening line under a known one, the others as tall", render: () => demo("compact", FOLDERS, ENTRIES) },
    { name: "Big boards", render: () => demo("comfortable", FOLDERS, ENTRIES) },
    { name: "Empty", render: () => demo("list", [], []) },
    { name: "Long names as cards", render: () => demo("compact", [], LONG_ENTRIES) },
    { name: "Hebrew names (switch to RTL)", render: () => demo("compact", HEBREW_FOLDERS, HEBREW_ENTRIES) },
    { name: "Hebrew folders over the table (switch to RTL)", render: () => demo("list", HEBREW_FOLDERS, [], TABLE_SLOT) },
    { name: "A page of fifty", render: () => demo("compact", [], PAGE) },
  ],
};

export default gallery;
