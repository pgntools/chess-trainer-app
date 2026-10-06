import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { useTranslation } from "react-i18next";

import { CardGrid, FolderCard, RecordCard } from "../../../design-system/components/cards";
import type { LinkTarget } from "../../../design-system/components/link";
import { FolderRow } from "../../../design-system/components/lists";
import { EmptyState } from "../../../design-system/components/states";
import { IconAction } from "../../../design-system/components/toolbars";
import type { GameTree } from "../../../lib/gameTree";
import type { OpeningEntry } from "../../../lib/openings";
import { savedAnalysisSummary, type SavedAnalysis } from "../../../lib/savedAnalyses";
import type { AnalysisFolder } from "../../../lib/savedAnalysisFolders";
import { savedListDate, savedListLine } from "../../../lib/savedListCaption";
import { FolderActions } from "../FolderActions";
import type { SavedListView } from "../savedListView";

/** One analysis on the page: the record, its tree (`undefined` when it will not read), the opening its mainline reached. */
export type SavedAnalysisEntry = { saved: SavedAnalysis; tree: GameTree | undefined; opening?: OpeningEntry };

/** A folder where the reader stands, with how many analyses are under it (its whole subtree). */
export type SavedAnalysisFolderEntry = { folder: AnalysisFolder; count: number };

/** What each folder's actions do. */
export type SavedAnalysisFolderActions = {
  onDownload: (folder: AnalysisFolder) => void;
  onRename: (folder: AnalysisFolder) => void;
  onMove: (folder: AnalysisFolder) => void;
  onDelete: (folder: AnalysisFolder) => void;
};

export type SavedAnalysesListProps = {
  view: SavedListView;
  /** The folders where the reader stands — drawn first: the reader drills into a folder, not past it. */
  folders: readonly SavedAnalysisFolderEntry[];
  /** The page's analyses — the cards'. The list view shows the `table` instead. */
  entries: readonly SavedAnalysisEntry[];
  /**
   * The list view's analyses (CTA-144): the games table — a
   * `SavedAnalysesTable` — under the folders. Absent while the folder holds no
   * analysis.
   */
  table?: ReactNode;
  /** The picked ids — over every folder; the list reads its own rows through them. */
  picked: ReadonlySet<string>;
  onTogglePick: (id: string) => void;
  /** Where an analysis opens — the Analysis Board. */
  openLink: (saved: SavedAnalysis) => LinkTarget;
  /** Its settings screen. */
  settingsLink: (saved: SavedAnalysis) => LinkTarget;
  /** Drill into a folder. */
  onOpenFolder: (folderId: string) => void;
  folderActions: SavedAnalysisFolderActions;
  /** A card's preview — a board at the place the reader stood (the screen draws it, with the theme's squares). */
  preview: (entry: SavedAnalysisEntry & { tree: GameTree }) => ReactNode;
  /** No folder and no analysis here: what to say, and the note's test id. */
  empty: { label: ReactNode; testId: string };
  /**
   * The prefix of every id: the body `<testId>-body` (the list) or
   * `<testId>-grid` (the cards); a card `<testId>-item-<id>`, its
   * `-open-<id>`, `-select-<id>`, `-settings-<id>`, `-name-<id>`,
   * `-opening-<id>`; a folder `<testId>-folder-<id>`, `-folder-open-<id>`
   * and its actions `-folder-<action>-<id>`.
   */
  testId: string;
};

/**
 * **The saved analyses, as a table or cards** (CTA-113) — the body of
 * `/tools/analysis/saved`: the folders where the reader stands, then this
 * folder's analyses — in the list view the folders as rows (`FolderRow`) over
 * the screen's games table (the `table` slot, a `SavedAnalysesTable` since
 * CTA-144, which replaced the analyses' own rows), or as preview boards at a
 * card size (`FolderCard`, `RecordCard` in a `CardGrid`). The repertoires'
 * list (`RepertoiresList`) is the cards' sister.
 *
 * - **A card** previews the place the reader stood (the screen's `preview`),
 *   and adds the opening the mainline reached as a third line — every card
 *   of the grid carries that line, so they stay one height.
 * - **A card**'s caption is the analysis' size, the side lines tried, where
 *   the reader stopped and when; **a record that will not read** is still
 *   listed, says so, and can only be picked (to delete it, or to export its
 *   PGN as stored).
 *
 * Presentational: the page, the picks, the links and every callback are the
 * screen's; its words are the analyses' catalog (`savedAnalyses.*`, `savedList.*`).
 */
function SavedAnalysesList({
  view,
  folders,
  entries,
  table,
  picked,
  onTogglePick,
  openLink,
  settingsLink,
  onOpenFolder,
  folderActions,
  preview,
  empty,
  testId,
}: SavedAnalysesListProps) {
  const { t, i18n } = useTranslation();

  if (folders.length === 0 && entries.length === 0 && table === undefined) {
    return (
      <Box data-testid={`${testId}-body`} sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <EmptyState testId={empty.testId}>{empty.label}</EmptyState>
      </Box>
    );
  }

  const nameOf = (saved: SavedAnalysis) => saved.name || t("savedAnalyses.untitled");
  const captionOf = ({ saved, tree }: SavedAnalysisEntry) => {
    if (tree === undefined) return t("savedAnalyses.unreadable");
    const summary = savedAnalysisSummary(saved, tree);
    return savedListLine([
      t("savedAnalyses.moves", { count: summary.moves }),
      // Zero side lines is not a fact worth a slot.
      summary.variations > 0 ? t("savedAnalyses.variations", { count: summary.variations }) : "",
      summary.ply > 0 ? t("savedAnalyses.atPly", { ply: summary.ply }) : "",
      savedListDate(saved.updatedAt, i18n.language),
    ]);
  };
  const folderName = (folder: AnalysisFolder) => folder.name || t("savedAnalyses.folder.untitled");

  const settings = (saved: SavedAnalysis) => (
    <IconAction
      label={t("savedList.settingsNamed", { name: nameOf(saved) })}
      link={settingsLink(saved)}
      testId={`${testId}-settings-${saved.id}`}
    >
      <SettingsRoundedIcon fontSize="small" />
    </IconAction>
  );
  const pick = (saved: SavedAnalysis) => ({
    checked: picked.has(saved.id),
    onToggle: () => onTogglePick(saved.id),
    label: t("savedList.selectNamed", { name: nameOf(saved) }),
  });
  const actionsOf = ({ folder, count }: SavedAnalysisFolderEntry) => {
    const name = folderName(folder);
    return (
      <FolderActions
        folderId={folder.id}
        on={{
          download: () => folderActions.onDownload(folder),
          rename: () => folderActions.onRename(folder),
          move: () => folderActions.onMove(folder),
          delete: () => folderActions.onDelete(folder),
        }}
        labels={{
          download: t("savedList.folder.downloadNamed", { name }),
          rename: t("savedList.folder.renameNamed", { name }),
          move: t("savedList.folder.moveNamed", { name }),
          delete: t("savedList.folder.deleteNamed", { name }),
        }}
        // An empty folder has nothing to take out.
        disabled={{ download: count === 0 }}
        testId={`${testId}-folder`}
      />
    );
  };

  if (view === "list") {
    return (
      <Box data-testid={`${testId}-body`} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {folders.length > 0 && (
          // Beside a table the folders take at most part of the height, scrolling on their own; alone, all of it.
          <Box
            sx={{
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              ...(table === undefined ? { flex: 1 } : { flex: "0 1 auto", maxHeight: "40%" }),
            }}
          >
            <List disablePadding aria-label={t("savedList.breadcrumb")}>
              {folders.map((entry) => (
                <FolderRow
                  key={entry.folder.id}
                  name={folderName(entry.folder)}
                  count={t("savedAnalyses.folder.count", { count: entry.count })}
                  onOpen={() => onOpenFolder(entry.folder.id)}
                  actions={actionsOf(entry)}
                  testId={`${testId}-folder-${entry.folder.id}`}
                  openTestId={`${testId}-folder-open-${entry.folder.id}`}
                />
              ))}
            </List>
          </Box>
        )}
        {table}
      </Box>
    );
  }

  return (
    <CardGrid scroll size={view} ariaLabel={t("savedAnalyses.title")} testId={`${testId}-grid`}>
      {folders.map((entry) => (
        <FolderCard
          key={entry.folder.id}
          name={folderName(entry.folder)}
          count={t("savedAnalyses.folder.count", { count: entry.count })}
          detail=" "
          onOpen={() => onOpenFolder(entry.folder.id)}
          openLabel={t("savedList.folder.openNamed", { name: folderName(entry.folder) })}
          actions={actionsOf(entry)}
          testId={`${testId}-folder-${entry.folder.id}`}
          openTestId={`${testId}-folder-open-${entry.folder.id}`}
          nameTestId={`${testId}-folder-name-${entry.folder.id}`}
        />
      ))}
      {entries.map((entry) => {
        const { saved, tree, opening } = entry;
        return (
          <RecordCard
            key={saved.id}
            preview={
              tree === undefined ? (
                // No position to draw: the reason in the same square.
                <Box sx={{ height: "100%", display: "grid", placeItems: "center", p: 1, bgcolor: "action.hover" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
                    {t("savedAnalyses.unreadable")}
                  </Typography>
                </Box>
              ) : (
                preview({ ...entry, tree })
              )
            }
            name={nameOf(saved)}
            caption={captionOf(entry)}
            // The one fact a reader recognises a line by; absent until the book has loaded, and for a line it does not name.
            detail={
              opening === undefined ? (
                " "
              ) : (
                <span dir="ltr" data-testid={`${testId}-opening-${saved.id}`}>{`${opening.name} · ${opening.eco}`}</span>
              )
            }
            link={tree === undefined ? undefined : openLink(saved)}
            openLabel={t("savedList.openNamed", { name: nameOf(saved) })}
            actions={settings(saved)}
            pick={pick(saved)}
            testId={`${testId}-item-${saved.id}`}
            openTestId={`${testId}-open-${saved.id}`}
            pickTestId={`${testId}-select-${saved.id}`}
            nameTestId={`${testId}-name-${saved.id}`}
          />
        );
      })}
    </CardGrid>
  );
}

export default SavedAnalysesList;
