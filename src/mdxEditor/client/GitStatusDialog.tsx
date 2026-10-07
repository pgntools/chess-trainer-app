import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import { BaseDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { ELLIPSIS } from "./dialogLayout";
import { sizeOf } from "./pgnPages";
import { ARTICLES_DIR, GIT_STATE_WORDS, STORAGE_COMMAND, type GitStatus } from "./storageClient";

const ID = "mdx-editor-git";

type GitStatusDialogProps = {
  open: boolean;
  onClose: () => void;
  status: GitStatus | undefined;
  onRefresh: () => void;
};

/**
 * **What git has not got of the articles** (CTA-137) — the storage
 * service's `git status` of `src/views/blog/articles/`, read only: the
 * branch, and each file not committed as it is — new, changed, deleted or
 * renamed — by folder, with its size (a 5 MB PGN stands out before it is
 * committed). Committing them from here is a later step; for now git does.
 */
function GitStatusDialog({ open, onClose, status, onRefresh }: GitStatusDialogProps) {
  const files = status?.kind === "status" ? status.files : [];
  const folders = [...new Set(files.map((file) => file.path.split("/").slice(0, -1).join("/")))].sort();
  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Not synced with git"
      width="sm"
      dividers
      testId={`${ID}-dialog`}
      actions={
        <>
          <Button startIcon={<RefreshRoundedIcon />} onClick={onRefresh} data-testid={`${ID}-refresh`}>
            Refresh
          </Button>
          <Button onClick={onClose} data-testid={`${ID}-close`}>
            Close
          </Button>
        </>
      }
    >
      {status === undefined ? (
        <Typography role="status" color="text.secondary">
          Asking git…
        </Typography>
      ) : status.kind === "down" ? (
        <InlineAlert severity="info" title="The storage service is not running" testId={`${ID}-down`}>
          {`It reads git for the editor — start it with ${STORAGE_COMMAND}.`}
        </InlineAlert>
      ) : status.kind === "unavailable" ? (
        <InlineAlert severity="warning" title="git cannot say" testId={`${ID}-unavailable`}>
          {status.reason}
        </InlineAlert>
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {"On the branch "}
            <Box component="code" dir="ltr" sx={{ color: "text.primary" }}>
              {status.branch}
            </Box>
            {files.length === 0 ? ", every article file is committed." : `, ${files.length === 1 ? "one file" : `${files.length} files`} in ${ARTICLES_DIR}/ git has not got as ${files.length === 1 ? "it is" : "they are"}:`}
          </Typography>
          {folders.map((folder) => (
            <Box key={folder} data-testid={`${ID}-folder-${folder === "" ? "root" : folder}`}>
              <Typography variant="subtitle2" component="h3" dir="ltr" sx={{ mb: 0.5 }}>
                {`articles/${folder === "" ? "" : `${folder}/`}`}
              </Typography>
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 0.25 }}>
                {files
                  .filter((file) => file.path.split("/").slice(0, -1).join("/") === folder)
                  .map((file) => {
                    const name = file.path.split("/").at(-1) ?? file.path;
                    return (
                      <Box component="li" key={file.path} sx={{ display: "flex", alignItems: "baseline", gap: 1, minWidth: 0 }}>
                        <Box component="code" dir="ltr" title={file.path} sx={{ ...ELLIPSIS, flex: "1 1 auto" }}>
                          {name}
                        </Box>
                        {file.bytes !== undefined && (
                          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                            {sizeOf(file.bytes)}
                          </Typography>
                        )}
                        <StatusText tone={file.state === "new" ? "info" : "warning"} testId={`${ID}-file-${file.path}`}>
                          {GIT_STATE_WORDS[file.state]}
                        </StatusText>
                      </Box>
                    );
                  })}
              </Box>
            </Box>
          ))}
          <Typography variant="body2" color="text.secondary">
            Committing them from the editor is still to come — until then, commit them with git.
          </Typography>
        </Box>
      )}
    </BaseDialog>
  );
}

export default GitStatusDialog;
