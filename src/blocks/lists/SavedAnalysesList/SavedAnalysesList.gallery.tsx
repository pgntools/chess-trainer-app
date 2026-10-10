import Box from "@mui/material/Box";

import { demoPreview } from "../../../design-system/gallery/demoPreview";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import type { SavedListView } from "../savedListView";
import { ENTRIES, FOLDERS, HEBREW_ENTRIES, HEBREW_FOLDERS, LONG_ENTRIES, manyEntries } from "./fixtures";
import SavedAnalysesList, { type SavedAnalysisEntry, type SavedAnalysisFolderEntry } from "./SavedAnalysesList";

const noop = () => {};
const PAGE = manyEntries(50);

/** The block on fixtures, its picks held by the demo as the screen holds them — a folder's checkbox included when asked for (CTA-147). */
const demo = (
  view: Exclude<SavedListView, "list">,
  folders: readonly SavedAnalysisFolderEntry[],
  entries: readonly SavedAnalysisEntry[],
  { folderPicks = false }: { folderPicks?: boolean } = {},
) => (
  <WithState<Set<string>> initial={new Set(["a1"])}>
    {(picked, setPicked) => (
      <Box sx={{ height: 420, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <SavedAnalysesList
          view={view}
          folders={folders}
          entries={entries}
          picked={picked}
          onTogglePick={(id) =>
            setPicked((before) => {
              const next = new Set(before);
              if (!next.delete(id)) next.add(id);
              return next;
            })
          }
          {...(folderPicks && {
            // The gallery's stand-in for the screen's derived state: a picked folder checks, a partly picked one is indeterminate (a1 is picked).
            folderPick: (folder) =>
              folder.id === "gopenings"
                ? { checked: true, indeterminate: false, onToggle: noop }
                : { checked: false, indeterminate: folder.id === "gpartly", onToggle: noop },
          })}
          openLink={(saved) => ({ href: `#open-${saved.id}` })}
          settingsLink={(saved) => ({ href: `#settings-${saved.id}` })}
          onAnalyse={noop}
          onOpenFolder={noop}
          folderActions={{ onDownload: noop, onRename: noop, onMove: noop }}
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
    { name: "Small boards — folders first (one empty), the opening line under a known one, the others as tall", render: () => demo("compact", FOLDERS, ENTRIES) },
    { name: "Big boards", render: () => demo("comfortable", FOLDERS, ENTRIES) },
    { name: "Folder checkboxes (CTA-147) — one picked, one partly picked, one empty", render: () => demo("compact", FOLDERS, ENTRIES, { folderPicks: true }) },
    { name: "Empty", render: () => demo("compact", [], []) },
    { name: "Long names and a long description", render: () => demo("compact", [], LONG_ENTRIES) },
    { name: "Hebrew names (switch to RTL)", render: () => demo("compact", HEBREW_FOLDERS, HEBREW_ENTRIES) },
    { name: "A page of fifty", render: () => demo("compact", [], PAGE) },
  ],
};

export default gallery;
