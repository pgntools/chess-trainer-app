import { useState, useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { useTranslation } from "react-i18next";

import { ExportCategoriesForm } from "../../blocks/forms";
import { InlineAlert } from "../../design-system/components/feedback";
import { hasExportSelection, type ExportCategory, type ExportSelection } from "../../lib/dataExport";
import { exportZip, ExportReadError } from "../../lib/dataExportSource";
import { enginePresetsSnapshot, subscribeEnginePresets } from "../../lib/enginePresetStore";
import {
  subscribeUploadedCollections,
  uploadedCollectionsSnapshot,
} from "../../lib/libraryCollectionStore";
import { downloadBinaryFile } from "../../lib/pgnExport";
import { playedGamesSnapshot, subscribePlayedGames } from "../../lib/playedGameStore";
import { savedAnalysesSnapshot, subscribeSavedAnalyses } from "../../lib/savedAnalysisStore";
import {
  savedRepertoiresSnapshot,
  subscribeSavedRepertoires,
} from "../../lib/savedRepertoireStore";
import { shippedCollections } from "../../lib/shippedCollections";
import { RightPanel } from "../main/rightPanel";

/**
 * **Export** (`/settings/export`, CTA-86) — the reader's data out, as one zip
 * of PGN files and a `manifest.json` (`lib/dataExport.ts` says what is where).
 *
 * Five categories — the engine presets since CTA-179 — each all or nothing, with how many items each holds;
 * Collections has one more box, for the shipped collections — the reader's
 * uploads always go with it, the shipped ones only when that is ticked too.
 * The counts are the stores' snapshots (a subscription starts each read);
 * the export itself reads each store it needs again (`loadExportSource`), so
 * it never builds from a store still loading.
 *
 * Reads only. A failure — a collection that cannot be read, a browser that
 * refuses the download — is said here, never thrown.
 *
 * The categories are the `ExportCategoriesForm` block (CTA-109); the result is
 * an `InlineAlert`, an `alert` a screen reader reads as it lands.
 */

const INITIAL: ExportSelection = {
  collections: false,
  games: false,
  analyses: false,
  repertoires: false,
  enginePresets: false,
  shippedCollections: false,
};

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; fileName: string }
  | { kind: "failed"; collection?: string };

const useCount = (
  subscribe: (listener: () => void) => () => void,
  snapshot: () => readonly unknown[] | undefined,
): number | undefined => {
  const count = () => snapshot()?.length;
  return useSyncExternalStore(subscribe, count, count);
};

function ExportTab() {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<ExportSelection>(INITIAL);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const uploaded = useCount(subscribeUploadedCollections, uploadedCollectionsSnapshot);
  const counts: Record<ExportCategory, number | undefined> = {
    collections:
      uploaded === undefined
        ? undefined
        : uploaded + (selection.shippedCollections ? shippedCollections.length : 0),
    games: useCount(subscribePlayedGames, playedGamesSnapshot),
    analyses: useCount(subscribeSavedAnalyses, savedAnalysesSnapshot),
    repertoires: useCount(subscribeSavedRepertoires, savedRepertoiresSnapshot),
    enginePresets: useCount(subscribeEnginePresets, enginePresetsSnapshot),
  };

  const tick = (patch: Partial<ExportSelection>) => {
    setSelection((current) => ({ ...current, ...patch }));
    setStatus({ kind: "idle" });
  };

  const run = async () => {
    setStatus({ kind: "working" });
    try {
      const { fileName, bytes } = await exportZip(selection, { appVersion: __APP_VERSION__ });
      setStatus(
        downloadBinaryFile(fileName, bytes, "application/zip")
          ? { kind: "done", fileName }
          : { kind: "failed" },
      );
    } catch (error) {
      setStatus({
        kind: "failed",
        collection: error instanceof ExportReadError ? error.collection : undefined,
      });
    }
  };

  const working = status.kind === "working";

  return (
    <>
      <Box data-testid="settings-export" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("settings.export.intro")}
        </Typography>

        <ExportCategoriesForm
          selection={selection}
          onChange={tick}
          counts={counts}
          shippedCount={shippedCollections.length}
          disabled={working}
          testId="settings-export"
        />

        <Box>
          <Button
            variant="contained"
            startIcon={<DownloadRoundedIcon />}
            disabled={!hasExportSelection(selection) || working}
            onClick={() => void run()}
            data-testid="settings-export-run"
          >
            {t(working ? "settings.export.working" : "settings.export.run")}
          </Button>
        </Box>

        {status.kind === "done" && (
          <InlineAlert severity="success" testId="settings-export-done">
            {t("settings.export.done", { fileName: status.fileName })}
          </InlineAlert>
        )}
        {status.kind === "failed" && (
          <InlineAlert severity="error" testId="settings-export-failed">
            {status.collection === undefined
              ? t("settings.export.failed")
              : t("settings.export.unreadable", { name: status.collection })}
          </InlineAlert>
        )}
      </Box>

      <RightPanel>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("settings.export.panel")}
        </Typography>
      </RightPanel>
    </>
  );
}

export default ExportTab;
