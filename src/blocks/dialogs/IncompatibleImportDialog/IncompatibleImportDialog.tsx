import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogContentText from "@mui/material/DialogContentText";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import type { ImportProblem } from "../../../lib/dataImport";
import { MANUAL_IMPORTS, type ManualImport } from "./manualImports";
import { MONOSPACE_FONT_FAMILY } from "../../../design-system/theme";

export type IncompatibleImportDialogProps = {
  fileName: string;
  problem: ImportProblem;
  /** The `.pgn` files the zip holds, by path. */
  pgnFiles: readonly string[];
  /** Where each kind of PGN is brought in by hand — the Library's upload, the Analysis Board's Load tab, Add repertoire. */
  manualLink: (kind: ManualImport) => LinkTarget;
  onClose: () => void;
  /**
   * The prefix of its ids: the dialog `<testId>-incompatible`, its parts
   * `-incompatible-problem`, `-incompatible-<kind>` (the links),
   * `-incompatible-files`, `-incompatible-close`.
   */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/** Machine words — a path in a zip — in the design system's monospace, never mirrored. */
const MONOSPACE = MONOSPACE_FONT_FAMILY;

/**
 * **A zip that cannot be imported** (CTA-109; CTA-89's dialog) — not a zip,
 * no manifest or a malformed one, someone else's format, a newer version, a
 * file the manifest names missing or not matching it. It says which, that
 * the PGN files can still come in by hand — each kind through the screen that
 * uploads it — and lists them. Nothing was written.
 *
 * Presentational: the problem, the files and the links are props. Its words
 * are the app's (`settings.import.incompatible.*`).
 */
function IncompatibleImportDialog({ fileName, problem, pgnFiles, manualLink, onClose, testId, dialogProps }: IncompatibleImportDialogProps) {
  const { t } = useTranslation();
  const id = `${testId}-incompatible`;
  return (
    <BaseDialog
      open
      onClose={onClose}
      title={t("settings.import.incompatible.title")}
      width="sm"
      testId={id}
      dialogProps={dialogProps}
      actions={
        <Button onClick={onClose} data-testid={`${id}-close`}>
          {t("settings.import.incompatible.close")}
        </Button>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <DialogContentText data-testid={`${id}-problem`}>
          {t(`settings.import.incompatible.problem.${problem.kind}`, {
            fileName,
            path: "path" in problem ? problem.path : "",
            version: "version" in problem ? problem.version : "",
          })}
        </DialogContentText>
        <Box>
          <Typography variant="body2">{t("settings.import.incompatible.advice")}</Typography>
          <Box component="ul" sx={{ my: 0.5, paddingInlineStart: 3 }}>
            {MANUAL_IMPORTS.map((kind) => (
              <li key={kind}>
                <Link {...linkProps(manualLink(kind))} variant="body2" data-testid={`${id}-${kind}`}>
                  {t(`settings.import.incompatible.${kind}`)}
                </Link>
              </li>
            ))}
          </Box>
        </Box>
        <Box data-testid={`${id}-files`}>
          {pgnFiles.length === 0 ? (
            <Typography variant="body2">{t("settings.import.incompatible.noFiles")}</Typography>
          ) : (
            <>
              <Typography variant="body2">{t("settings.import.incompatible.files")}</Typography>
              <Box component="ul" sx={{ my: 0.5, paddingInlineStart: 3 }}>
                {pgnFiles.map((path) => (
                  <li key={path}>
                    {/* A path is a token: it reads left to right in every language. */}
                    <Typography variant="body2" component="span" dir="ltr" sx={{ fontFamily: MONOSPACE }}>
                      {path}
                    </Typography>
                  </li>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </BaseDialog>
  );
}

export default IncompatibleImportDialog;
