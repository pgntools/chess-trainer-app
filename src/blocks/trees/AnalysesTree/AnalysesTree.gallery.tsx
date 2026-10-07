import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { GameFolder } from "../../../lib/savedGameFolders";
import type { SavedAnalysisRow } from "../../../lib/savedAnalysisRows";
import type { BlockFamilyId } from "../../families";
import AnalysesTree, { type AnalysesTreeProps } from "./AnalysesTree";
import { FOLDERS, LABELS, MANY_ROWS, OPEN_TO_A4, ROWS, UPDATED_NEWEST_FIRST } from "./fixtures";

type State = { open: ReadonlySet<string>; shown: ReadonlyMap<string, number>; collapsed: boolean; text: string };

/** The block in the panel's width and a short viewport, its open folders and pages held as the board's route holds them. */
const demo = (
  { rows = ROWS, folders = FOLDERS, rootId = null, text = "", currentId = "a4", open = OPEN_TO_A4, ...rest }: { rows?: readonly SavedAnalysisRow[]; folders?: readonly GameFolder[]; rootId?: string | null; text?: string; currentId?: string; open?: ReadonlySet<string> } & Partial<AnalysesTreeProps> = {},
) => (
  <WithState<State> initial={{ open, shown: new Map(), collapsed: false, text }}>
    {(state, set) => (
      <Box sx={{ width: state.collapsed ? 48 : 400, height: 420, display: "flex", flexDirection: "column", p: state.collapsed ? 0.5 : 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
        <AnalysesTree
          testId="gallery-analyses-tree"
          folders={folders}
          rows={rows}
          sort={UPDATED_NEWEST_FIRST}
          rootId={rootId}
          text={state.text}
          onTextChange={(next) => set((before) => ({ ...before, text: next }))}
          currentId={currentId}
          collapsed={state.collapsed}
          onCollapsedChange={(collapsed) => set((before) => ({ ...before, collapsed }))}
          locked={false}
          linkOf={(row) => ({ href: `#${row.id}` })}
          closeLink={{ href: "#list" }}
          siblings={{ previous: { href: "#a3" }, next: { href: "#a5" }, testId: "gallery-analyses-sibling" }}
          open={state.open}
          shown={state.shown}
          onToggle={(id) =>
            set((before) => {
              const next = new Set(before.open);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return { ...before, open: next };
            })
          }
          onShowMore={(key) => set((before) => ({ ...before, shown: new Map(before.shown).set(key, (before.shown.get(key) ?? 100) + 100) }))}
          labels={LABELS}
          {...rest}
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "trees",
  title: "AnalysesTree",
  demos: [
    { name: "Nested folders, opened on the analysis on the board; long names wrap", render: () => demo() },
    { name: "Rooted at a folder — its contents are the top rows, nothing outside it", render: () => demo({ rootId: "gendings", currentId: "a4", open: new Set(["grook"]) }) },
    { name: "Filtered by words — the matching analyses, every branch above them open", render: () => demo({ text: "lucena" }) },
    { name: "Filtered by a folder's name — all that is in it stays", render: () => demo({ text: "openings" }) },
    { name: "Filtered, nothing matches", render: () => demo({ text: "zugzwang" }) },
    { name: "Nothing open — a Hebrew name among the top level (switch the direction to RTL)", render: () => demo({ currentId: "a7", open: new Set() }) },
    { name: "The previous / next toolbar at the foot — and none at the end of the folder", render: () => demo({ siblings: { previous: undefined, next: { href: "#a2" }, testId: "gallery-analyses-sibling-end" } }) },
    { name: "Unsaved changes — the other analyses disabled, and why", render: () => demo({ locked: true }) },
    { name: "A folder of 300 — a page and \"show more\"", render: () => demo({ rows: MANY_ROWS, currentId: "m27", open: new Set(["gopenings"]) }) },
    { name: "No folders — Unfiled analyses only", render: () => demo({ folders: [], rows: ROWS.filter((row) => row.folderId === null), currentId: "a7" }) },
  ],
};

export default gallery;
