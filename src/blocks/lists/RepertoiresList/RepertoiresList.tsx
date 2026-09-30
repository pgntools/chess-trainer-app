import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { useTranslation } from "react-i18next";

import { CardGrid, FolderCard, RecordCard } from "../../../design-system/components/cards";
import type { LinkTarget } from "../../../design-system/components/link";
import { FolderRow, RecordRow } from "../../../design-system/components/lists";
import { EmptyState } from "../../../design-system/components/states";
import { IconAction } from "../../../design-system/components/toolbars";
import { savedListDate, savedListLine } from "../../../lib/savedListCaption";
import { isMultiGameRepertoire, type SavedRepertoire } from "../../../lib/savedRepertoires";
import type { RepertoireFolder } from "../../../lib/savedRepertoireFolders";
import { FolderActions } from "../FolderActions";
import type { SavedListView } from "../savedListView";

/** A folder on the top level, with how many repertoires are in it. */
export type RepertoireFolderEntry = { folder: RepertoireFolder; count: number };

/** What each folder's actions do — one level of folders: no move. */
export type RepertoireFolderActions = {
  onDownload: (folder: RepertoireFolder) => void;
  onRename: (folder: RepertoireFolder) => void;
  onDelete: (folder: RepertoireFolder) => void;
};

export type RepertoiresListProps = {
  view: SavedListView;
  /** The folders — the top level shows them, a folder's own view none. */
  folders: readonly RepertoireFolderEntry[];
  repertoires: readonly SavedRepertoire[];
  picked: ReadonlySet<string>;
  onTogglePick: (id: string) => void;
  /** Where a repertoire opens — its player. */
  openLink: (saved: SavedRepertoire) => LinkTarget;
  settingsLink: (saved: SavedRepertoire) => LinkTarget;
  /** Where a folder opens — the list inside it. */
  folderLink: (folder: RepertoireFolder) => LinkTarget;
  folderActions: RepertoireFolderActions;
  /** More actions on each row and card, before the settings gear — the Games menu. */
  extraActions?: (saved: SavedRepertoire) => ReactNode;
  /** A card's preview — a board where the repertoire first branches, facing its side. */
  preview: (saved: SavedRepertoire) => ReactNode;
  empty: { label: ReactNode; testId: string };
  /**
   * The prefix of every record id: the body `<testId>-body` or `<testId>-grid`,
   * a repertoire `<testId>-item-<id>`, `-open-<id>`, `-select-<id>`,
   * `-settings-<id>`, `-description-<id>`.
   */
  testId: string;
  /** The prefix of every folder id: `<folderTestId>-<id>`, `-open-<id>`, and the actions `-<action>-<id>`. */
  folderTestId: string;
};

/** A repertoire's caption: a record of several games says what it needs, a readable one its size, both when. */
function useCaption(saved: SavedRepertoire): string {
  const { t, i18n } = useTranslation();
  // A text scan of the whole PGN — cheap, but not worth repeating on every pick.
  const multiGame = useMemo(() => isMultiGameRepertoire(saved), [saved]);
  const stats = multiGame ? undefined : saved.stats;
  return savedListLine([
    multiGame ? t("repertoires.needsChoice") : "",
    stats !== undefined ? t("repertoires.moves", { count: stats.moves }) : "",
    stats !== undefined && stats.variations > 0 ? t("repertoires.variations", { count: stats.variations }) : "",
    savedListDate(saved.updatedAt, i18n.language),
  ]);
}

type ItemProps = {
  saved: SavedRepertoire;
  view: SavedListView;
  controls: ReactNode;
  pick: { checked: boolean; onToggle: () => void; label: string };
  openLink: LinkTarget;
  preview: ReactNode;
  testId: string;
};

function RepertoireItem({ saved, view, controls, pick, openLink, preview, testId }: ItemProps) {
  const { t } = useTranslation();
  const caption = useCaption(saved);
  const name = saved.name || t("repertoires.untitled");
  const ids = {
    testId: `${testId}-item-${saved.id}`,
    openTestId: `${testId}-open-${saved.id}`,
    pickTestId: `${testId}-select-${saved.id}`,
    nameTestId: `${testId}-name-${saved.id}`,
  };
  return view === "list" ? (
    <RecordRow
      name={name}
      caption={caption}
      description={saved.settings.description === "" ? undefined : saved.settings.description}
      primaryAction={{ label: t("repertoires.open"), ariaLabel: t("savedList.openNamed", { name }), link: openLink }}
      actions={controls}
      pick={pick}
      descriptionTestId={`${testId}-description-${saved.id}`}
      {...ids}
    />
  ) : (
    <RecordCard
      preview={preview}
      name={name}
      caption={caption}
      link={openLink}
      openLabel={t("savedList.openNamed", { name })}
      actions={controls}
      pick={pick}
      {...ids}
    />
  );
}

/**
 * **The repertoires, as rows or cards** (CTA-113) — the body of
 * `/repertoires`: the folders (one level, at the top level only), then the
 * repertoires, in the list or as preview boards — the saved analyses' shape
 * (`SavedAnalysesList`), the same rows, cards and folder actions. A row names
 * the repertoire and its size (or, for a record of several games saved
 * before the one-game rule, what it needs), its description; Open, the
 * screen's extra actions (the Games menu), the settings gear and a pick — each
 * named for the repertoire. A card previews where the repertoire first
 * branches (`previewFen`, the screen's `preview`).
 *
 * Presentational: the rows, the picks, the links and every callback are the
 * screen's; its words are the repertoires' catalog.
 */
function RepertoiresList({
  view,
  folders,
  repertoires,
  picked,
  onTogglePick,
  openLink,
  settingsLink,
  folderLink,
  folderActions,
  extraActions,
  preview,
  empty,
  testId,
  folderTestId,
}: RepertoiresListProps) {
  const { t } = useTranslation();

  if (folders.length === 0 && repertoires.length === 0) {
    return (
      <Box data-testid={`${testId}-body`} sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <EmptyState testId={empty.testId}>{empty.label}</EmptyState>
      </Box>
    );
  }

  const folderName = (folder: RepertoireFolder) => folder.name || t("repertoires.untitled");
  const actionsOf = ({ folder, count }: RepertoireFolderEntry) => {
    const name = folderName(folder);
    return (
      <FolderActions
        folderId={folder.id}
        on={{
          download: () => folderActions.onDownload(folder),
          rename: () => folderActions.onRename(folder),
          delete: () => folderActions.onDelete(folder),
        }}
        labels={{
          download: t("savedList.folder.downloadNamed", { name }),
          rename: t("savedList.folder.renameNamed", { name }),
          delete: t("savedList.folder.deleteNamed", { name }),
        }}
        disabled={{ download: count === 0 }}
        testId={folderTestId}
      />
    );
  };
  const folderProps = (entry: RepertoireFolderEntry) => ({
    name: folderName(entry.folder),
    count: t("repertoires.folder.count", { count: entry.count }),
    link: folderLink(entry.folder),
    actions: actionsOf(entry),
    testId: `${folderTestId}-${entry.folder.id}`,
    openTestId: `${folderTestId}-open-${entry.folder.id}`,
  });
  const items = repertoires.map((saved) => {
    const name = saved.name || t("repertoires.untitled");
    return (
      <RepertoireItem
        key={saved.id}
        saved={saved}
        view={view}
        controls={
          <>
            {extraActions?.(saved)}
            <IconAction label={t("savedList.settingsNamed", { name })} link={settingsLink(saved)} testId={`${testId}-settings-${saved.id}`}>
              <SettingsRoundedIcon fontSize="small" />
            </IconAction>
          </>
        }
        pick={{ checked: picked.has(saved.id), onToggle: () => onTogglePick(saved.id), label: t("savedList.selectNamed", { name }) }}
        openLink={openLink(saved)}
        preview={view === "list" ? null : preview(saved)}
        testId={testId}
      />
    );
  });

  if (view === "list") {
    return (
      <Box data-testid={`${testId}-body`} sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
        <List disablePadding aria-label={t("repertoires.title")}>
          {folders.map((entry) => (
            <FolderRow key={entry.folder.id} {...folderProps(entry)} />
          ))}
          {items}
        </List>
      </Box>
    );
  }

  return (
    <CardGrid scroll size={view} ariaLabel={t("repertoires.title")} testId={`${testId}-grid`}>
      {folders.map((entry) => (
        <FolderCard key={entry.folder.id} {...folderProps(entry)} openLabel={t("savedList.folder.openNamed", { name: folderName(entry.folder) })} />
      ))}
      {items}
    </CardGrid>
  );
}

export default RepertoiresList;
