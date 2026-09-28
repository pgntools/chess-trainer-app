import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { ImportDialog, IncompatibleImportDialog, type ManualImport } from "../../blocks/dialogs";
import { ImportReport } from "../../blocks/panels";
import { FileInputButton } from "../../design-system/components/forms";
import { ProgressLine } from "../../design-system/components/states";
import {
  importWritesOf,
  readImport,
  type ImportChoices,
  type ImportCurrent,
  type ImportDump,
  type ImportProblem,
} from "../../lib/dataImport";
import { applyImport, IMPORT_CAPS, loadImportCurrent, type ImportResults } from "../../lib/dataImportTarget";
import { indexCollection } from "../library/indexCollection";
import { RightPanel } from "../main/rightPanel";

/**
 * **Import** (`/settings/import`, CTA-89) — an Export's zip back into the
 * app. Picking a file reads it (`lib/dataImport.ts`'s `readImport`) and the
 * stores (`loadImportCurrent`), and writes nothing: a zip that will not do
 * opens {@link IncompatibleImportDialog}, one that will opens
 * {@link ImportDialog} on its categories and clashes. Confirming re-reads the
 * stores, plans again against what they hold now, and writes
 * (`applyImport`) — an uploaded collection's games indexed first, with the
 * Library's worker — then says per category what came of it. Nothing throws.
 *
 * Since CTA-109 the tab composes the design system and its blocks: the file
 * pick is `FileInputButton`, the progress a `ProgressLine` whose caption is
 * read out as it changes, the report the `ImportReport` block (an `alert`),
 * the two dialogs the `ImportDialog` and `IncompatibleImportDialog` blocks —
 * handed the stores' contents and caps, so they read none themselves.
 */

type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "choosing"; fileName: string; dump: ImportDump; current: ImportCurrent }
  | { kind: "incompatible"; fileName: string; problem: ImportProblem; pgnFiles: readonly string[] }
  | { kind: "working"; indexing?: { name: string; done: number; total: number } }
  | { kind: "done"; results: ImportResults };

/** Where each kind of PGN is brought in by hand, for a zip that cannot be imported. */
const MANUAL_ROUTES: Readonly<Record<ManualImport, string>> = {
  collections: "/library/new",
  analyses: "/tools/analysis",
  repertoires: "/repertoires/new",
};

function ImportTab() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // The button empties its input after each pick, so the same file can be picked again.
  const onPicked = async (file: File) => {
    setStatus({ kind: "reading" });
    const reading = readImport(new Uint8Array(await file.arrayBuffer()));
    if (!reading.ok) {
      setStatus({ kind: "incompatible", fileName: file.name, problem: reading.problem, pgnFiles: reading.pgnFiles });
      return;
    }
    setStatus({ kind: "choosing", fileName: file.name, dump: reading.dump, current: await loadImportCurrent() });
  };

  const run = async (dump: ImportDump, choices: ImportChoices) => {
    setStatus({ kind: "working" });
    // Planned again against the stores as they are now, not as the dialog opened on them.
    const writes = importWritesOf(dump, await loadImportCurrent(), choices, { caps: IMPORT_CAPS });
    const results = await applyImport(writes, {
      index: (games, name) =>
        indexCollection(games, (done, total) => setStatus({ kind: "working", indexing: { name, done, total } })),
    });
    setStatus({ kind: "done", results });
  };

  const busy = status.kind === "reading" || status.kind === "working";
  const indexing = status.kind === "working" ? status.indexing : undefined;

  return (
    <>
      <Box data-testid="settings-import" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("settings.import.intro")}
        </Typography>

        <Box>
          <FileInputButton
            label={t("settings.import.choose")}
            accept={[".zip", "application/zip"]}
            onFiles={([file]) => void onPicked(file)}
            disabled={busy}
            testId="settings-import-choose"
            inputTestId="settings-import-input"
          />
        </Box>

        {busy && (
          // Determinate while a collection is indexed; its caption is read out as it changes.
          <ProgressLine
            label={t("settings.import.progress")}
            value={indexing === undefined ? undefined : indexing.total > 0 ? (100 * indexing.done) / indexing.total : 0}
            caption={
              indexing !== undefined
                ? t("settings.import.indexing", indexing)
                : t(status.kind === "reading" ? "settings.import.reading" : "settings.import.working")
            }
            announce
            testId="settings-import-working"
          />
        )}

        {status.kind === "done" && <ImportReport results={status.results} testId="settings-import" />}
      </Box>

      {status.kind === "choosing" && (
        <ImportDialog
          fileName={status.fileName}
          dump={status.dump}
          current={status.current}
          caps={IMPORT_CAPS}
          onCancel={() => setStatus({ kind: "idle" })}
          onImport={(choices) => void run(status.dump, choices)}
          testId="settings-import"
        />
      )}
      {status.kind === "incompatible" && (
        <IncompatibleImportDialog
          fileName={status.fileName}
          problem={status.problem}
          pgnFiles={status.pgnFiles}
          manualLink={(kind) => ({ component: RouterLink, to: MANUAL_ROUTES[kind] })}
          onClose={() => setStatus({ kind: "idle" })}
          testId="settings-import"
        />
      )}

      <RightPanel>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("settings.import.panel")}
        </Typography>
      </RightPanel>
    </>
  );
}

export default ImportTab;
