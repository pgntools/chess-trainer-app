import Box from "@mui/material/Box";

import { SearchField } from "../../../design-system/components/forms";
import { DEFAULT_TABLE_PAGE_SIZE } from "../../../design-system/components/tables";
import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import {
  analysisTreeRows,
  SAVED_ANALYSES_DEFAULT_SORT,
  savedAnalysisFirstDirection,
  type SavedAnalysisColumn,
  type SavedAnalysisRow,
} from "../../../lib/savedAnalysisRows";
import type { GameFolder } from "../../../lib/savedGameFolders";
import type { BlockFamilyId } from "../../families";
import SavedAnalysesTable from "./SavedAnalysesTable";
import { ANALYSIS_FOLDERS, ANALYSIS_ROWS, FILED_ROWS, HEBREW_FOLDERS, HEBREW_ROWS, manyRows } from "./fixtures";

type DemoState = {
  sort: DataTableSort<SavedAnalysisColumn>;
  text: string;
  open: Set<string>;
  page: number;
  rowsPerPage: number;
  picked: Set<string>;
};

const noop = () => {};
const TEN_THOUSAND = manyRows(10_000);

/**
 * The block on fixtures, walked as the screen walks them — its sort, words,
 * open folders, page and picks held by the demo. With `folderPicks`, the
 * folders carry checkboxes and select-all covers them (CTA-147): the demo
 * holds the picks as the screen does, a folder's id standing for its whole
 * subtree.
 */
const demo = (
  folders: readonly GameFolder[],
  rows: readonly SavedAnalysisRow[],
  { text = "", open = [], folderPicks = false }: { text?: string; open?: string[]; folderPicks?: boolean } = {},
) => (
  <WithState<DemoState>
    initial={{
      sort: { column: SAVED_ANALYSES_DEFAULT_SORT, direction: savedAnalysisFirstDirection(SAVED_ANALYSES_DEFAULT_SORT) },
      text,
      open: new Set(open),
      page: 0,
      rowsPerPage: DEFAULT_TABLE_PAGE_SIZE,
      picked: new Set(),
    }}
  >
    {(state, set) => (
      <Box sx={{ height: 420, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <SavedAnalysesTable
          rows={
            analysisTreeRows({
              folders,
              rows,
              isOpen: (id, auto) => auto || state.open.has(id),
              column: state.sort.column,
              direction: state.sort.direction,
              text: state.text,
            }).rows
          }
          sort={state.sort}
          onSort={(column, direction) => set((before) => ({ ...before, page: 0, sort: { column, direction } }))}
          onToggle={(id) =>
            set((before) => {
              const next = new Set(before.open);
              if (!next.delete(id)) next.add(id);
              return { ...before, open: next };
            })
          }
          folderLink={(folder) => ({ href: `#folder-${folder.id}` })}
          folderActions={{ onDownload: noop, onRename: noop, onMove: noop }}
          paging={{
            page: state.page,
            rowsPerPage: state.rowsPerPage,
            onPageChange: (page) => set((before) => ({ ...before, page })),
            onRowsPerPageChange: (rowsPerPage) => set((before) => ({ ...before, page: 0, rowsPerPage })),
          }}
          picked={state.picked}
          onPickedChange={(picked) => set((before) => ({ ...before, picked }))}
          {...(folderPicks && {
            // The gallery's stand-in for the screen's derived state: a picked folder (its rows with it) checks, a partly picked one is indeterminate.
            folderPick: (folder) => {
              const subtree = new Set([folder.id, ...folders.filter((other) => other.parentId === folder.id).map((other) => other.id)]);
              const rowsUnder = rows.filter((row) => row.folderId !== null && subtree.has(row.folderId));
              const pickedRows = rowsUnder.filter((row) => state.picked.has(row.id));
              return {
                checked: state.picked.has(folder.id) || (rowsUnder.length > 0 && pickedRows.length === rowsUnder.length),
                indeterminate: pickedRows.length > 0 && pickedRows.length < rowsUnder.length,
                onToggle: () =>
                  set((before) => {
                    const next = new Set(before.picked);
                    const all = rowsUnder.length > 0 && pickedRows.length === rowsUnder.length;
                    if (all) {
                      next.delete(folder.id);
                      for (const row of rowsUnder) next.delete(row.id);
                    } else {
                      next.add(folder.id);
                      for (const row of rowsUnder) next.add(row.id);
                    }
                    return { ...before, picked: next };
                  }),
              };
            },
            selectAll: {
              checked: false,
              indeterminate: state.picked.size > 0,
              onToggleAll: () =>
                set((before) => {
                  const next = new Set(before.picked);
                  const walk = analysisTreeRows({
                    folders,
                    rows,
                    isOpen: (id, auto) => auto || before.open.has(id),
                    column: before.sort.column,
                    direction: before.sort.direction,
                    text: before.text,
                  }).rows;
                  for (const row of walk) {
                    if (row.kind === "folder") next.add(row.folder.id);
                    else next.add(row.item.id);
                  }
                  return { ...before, picked: next };
                }),
            },
          })}
          openLink={(row) => ({ href: `#analysis-${row.id}` })}
          onOpenAnalysis={noop}
          settingsLink={(row) => ({ href: `#settings-${row.id}` })}
          onAnalyse={noop}
          filtered={state.text.trim() !== ""}
          onClearFilter={() => set((before) => ({ ...before, page: 0, text: "" }))}
          filters={
            <SearchField
              label="Filter analyses"
              value={state.text}
              onChange={(next) => set((before) => ({ ...before, page: 0, text: next }))}
              clearLabel="Clear the words"
              testId="gallery-saved-analyses-filter"
            />
          }
          testId="gallery-saved-analyses"
          rowTestId="gallery-saved-analyses-item"
          openTestId="gallery-saved-analyses-open"
          pickTestId="gallery-saved-analyses-select"
          selectAllTestId="gallery-saved-analyses-select-all"
          folderTestId="gallery-saved-analyses-folder"
        />
      </Box>
    )}
  </WithState>
);

const WITH_FOLDERS = [...ANALYSIS_ROWS, ...FILED_ROWS];

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "SavedAnalysesTable",
  demos: [
    {
      name: "Folders closed, then the top level's analyses — an imported game, a named prep with notes, a board's own, one that will not read",
      render: () => demo(ANALYSIS_FOLDERS, WITH_FOLDERS),
    },
    {
      name: "Folders open — a sub-folder and a folder of games indented under them",
      render: () => demo(ANALYSIS_FOLDERS, WITH_FOLDERS, { open: ["fopen", "fsic", "ftata"] }),
    },
    {
      name: "Folder checkboxes (CTA-147) — open, so a folder's pick takes its rows with it",
      render: () => demo(ANALYSIS_FOLDERS, WITH_FOLDERS, { open: ["fopen", "ftata"], folderPicks: true }),
    },
    { name: "Words that open the folders above a match", render: () => demo(ANALYSIS_FOLDERS, WITH_FOLDERS, { text: "najdorf" }) },
    { name: "The filter leaves nothing", render: () => demo(ANALYSIS_FOLDERS, WITH_FOLDERS, { text: "dragon" }) },
    { name: "No folders — one analysis", render: () => demo([], ANALYSIS_ROWS.slice(0, 1)) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW_FOLDERS, HEBREW_ROWS, { open: ["fh"] }) },
    { name: "10,000 analyses", render: () => demo([], TEN_THOUSAND) },
  ],
};

export default gallery;
