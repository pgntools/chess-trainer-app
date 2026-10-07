import { useCallback, useMemo } from "react";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { AnalysesTree, ANALYSES_TREE_PAGE } from "../../../blocks/trees";
import { analysesListPath, analysisBoardPath, type ListContext } from "../../../lib/analysesListContext";
import type { SavedAnalysis } from "../../../lib/savedAnalyses";
import { analysisFolderPath } from "../../../lib/savedAnalysisFolders";
import { savedAnalysisRowOf, type SavedAnalysisRow } from "../../../lib/savedAnalysisRows";
import { BoardLeftPanel } from "../../main/boardLeftPanel";
import { useShellCompact } from "../../main/shellCompact";
import type { FolderViewState } from "./folderViewState";
import { useAnalysisFolders } from "./saved/useAnalysisFolders";
import { useSavedAnalyses } from "./saved/useSavedAnalyses";

type AnalysesFolderViewProps = {
  /** Where the list stood: its folder and the order of its analyses. */
  context: ListContext;
  /** The analysis on the board. */
  record: SavedAnalysis;
  /** The board holds unsaved changes: another analysis is not opened over them. */
  locked: boolean;
  /** Under the shell's breakpoint the tree is a drawer; whether it is open. */
  drawerOpen: boolean;
  onDrawerClose: () => void;
  state: FolderViewState;
  onStateChange: (state: FolderViewState) => void;
};

/**
 * **The Analysis Board's workspace panel** (CTA-145) — the saved list's tree
 * (`AnalysesTree`: every folder, nested and collapsible, with the analyses in
 * it) read from the stores and registered as the board's own left column
 * (`BoardLeftPanel` — the shell gives the board the whole window while it is
 * there, or a drawer under its breakpoint). A click on an analysis goes to its
 * board in the same list context; **Close goes back to the list**, on the
 * folder and in the order the board was opened from. The tree is **rooted at
 * that folder**, can be **narrowed by words** (the filter box) and the panel
 * **folded to a rail** at the start edge — the route keeps all of it as the
 * reader steps through the folder.
 */
function AnalysesFolderView({ context, record, locked, drawerOpen, onDrawerClose, state, onStateChange }: AnalysesFolderViewProps) {
  const { t } = useTranslation();
  const analyses = useSavedAnalyses();
  const folders = useAnalysisFolders();
  const compact = useShellCompact();
  const rows = useMemo(() => analyses?.map(savedAnalysisRowOf) ?? [], [analyses]);
  // The tree is rooted at the folder the list stood in; its name is the panel's.
  const root = context.folderId === null ? undefined : folders?.find((folder) => folder.id === context.folderId);

  // The chain to the analysis on the board, until the reader opens or closes a folder.
  const open = useMemo(
    () =>
      state.open ??
      new Set(record.folderId === null || folders === undefined ? [] : analysisFolderPath(folders, record.folderId).map((folder) => folder.id)),
    [state.open, record.folderId, folders],
  );
  const toggle = (id: string) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onStateChange({ ...state, open: next });
  };
  const showMore = (key: string) =>
    onStateChange({ ...state, shown: new Map(state.shown).set(key, (state.shown.get(key) ?? ANALYSES_TREE_PAGE) + ANALYSES_TREE_PAGE) });

  // Every analysis opens in the same context: the root stays where the reader opened from.
  const linkOf = useCallback(
    (row: SavedAnalysisRow) => ({ component: RouterLink, to: analysisBoardPath(row.id, context) }),
    [context],
  );
  const closeLink = useMemo(() => ({ component: RouterLink, to: analysesListPath(context) }), [context]);
  const labels = useMemo(
    () => ({
      title: context.folderId === null ? t("savedAnalyses.title") : root?.name || t("savedAnalyses.folder.untitled"),
      collapse: t("analysis.folderView.collapse"),
      expand: t("analysis.folderView.expand"),
      close: t("analysis.folderView.close"),
      hint: t("hints.tree"),
      locked: t("analysis.folderView.locked"),
      filter: t("savedAnalyses.table.filter"),
      filterClear: t("savedAnalyses.table.filterClear"),
      noMatch: t("savedAnalyses.table.noMatch"),
      untitled: t("savedAnalyses.untitled"),
      untitledFolder: t("savedAnalyses.folder.untitled"),
      showMore: (remaining: number) => t("analysis.folderView.showMore", { count: remaining }),
    }),
    [t, context.folderId, root?.name],
  );

  if (analyses === undefined || folders === undefined) return null;
  return (
    <BoardLeftPanel collapsed={!compact && state.collapsed} open={drawerOpen} onClose={onDrawerClose} drawerLabel={t("analysis.folderView.drawer")}>
      <AnalysesTree
        testId="analysis-folder-view"
        folders={folders}
        rootId={context.folderId}
        rows={rows}
        text={state.text}
        onTextChange={(text) => onStateChange({ ...state, text })}
        sort={context.sort}
        currentId={record.id}
        shown={state.shown}
        locked={locked}
        linkOf={linkOf}
        closeLink={closeLink}
        collapsed={!compact && state.collapsed}
        // Wide, the panel folds to a rail; the drawer is closed instead.
        onCollapsedChange={compact ? undefined : (collapsed) => onStateChange({ ...state, collapsed })}
        open={open}
        onToggle={toggle}
        onShowMore={showMore}
        labels={labels}
      />
    </BoardLeftPanel>
  );
}

export default AnalysesFolderView;
