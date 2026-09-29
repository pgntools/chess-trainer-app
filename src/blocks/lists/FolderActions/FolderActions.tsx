import Box from "@mui/material/Box";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import DriveFileMoveRoundedIcon from "@mui/icons-material/DriveFileMoveRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import type { LinkTarget } from "../../../design-system/components/link";
import { IconAction } from "../../../design-system/components/toolbars";
import { FOLDER_ACTIONS, type FolderAction } from "./folderActions";

export type FolderActionsProps = {
  /** The folder's id — the tail of every action's test id. */
  folderId: string;
  /** What each action does; an action with no handler (and no link) is not shown. */
  on: Partial<Record<FolderAction, () => void>>;
  /** Actions that go somewhere instead — a real link ("Add a collection here", to the upload). */
  links?: Partial<Record<FolderAction, LinkTarget>>;
  /** Each action's name — its tooltip and accessible name. Name the folder in it ("Rename Openings"), so a list of folders reads apart. */
  labels: Partial<Record<FolderAction, string>>;
  /** Actions that are shown but off — a download of an empty folder. */
  disabled?: Partial<Record<FolderAction, boolean>>;
  /** The prefix of each action's test id: `<testId>-<action>-<folderId>` (`saved-analyses-folder-rename-g1`). */
  testId: string;
};

const ICONS: Record<FolderAction, typeof DownloadRoundedIcon> = {
  new: CreateNewFolderRoundedIcon,
  upload: UploadFileRoundedIcon,
  download: DownloadRoundedIcon,
  rename: DriveFileRenameOutlineRoundedIcon,
  move: DriveFileMoveRoundedIcon,
  delete: DeleteOutlineRoundedIcon,
};

/**
 * **A folder's actions** (CTA-113) — the same icons, in the same order, on
 * every folder the app shows: a new folder inside it, an upload into it, its
 * download, rename, move and delete. Each list says which it offers by the
 * handlers it passes — the saved analyses all four of theirs, the
 * repertoires' one-level folders no move, the Library's tree all six. The
 * analyses' and the repertoires' folder rows each wrote three or four of
 * these with their own icons; this is the one row.
 *
 * Presentational: every action is the caller's callback.
 */
function FolderActions({ folderId, on, links, disabled, labels, testId }: FolderActionsProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
      {FOLDER_ACTIONS.filter((action) => on[action] !== undefined || links?.[action] !== undefined).map((action) => {
        const Icon = ICONS[action];
        return (
          <IconAction
            key={action}
            label={labels[action] ?? action}
            onClick={on[action]}
            link={links?.[action]}
            disabled={disabled?.[action]}
            testId={`${testId}-${action}-${folderId}`}
          >
            <Icon fontSize="small" />
          </IconAction>
        );
      })}
    </Box>
  );
}

export default FolderActions;
