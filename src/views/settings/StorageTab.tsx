import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { StorageTable, type StorageCategory } from "../../blocks/tables";

import {
  subscribeUploadedCollections,
  uploadedCollectionsSnapshot,
} from "../../lib/libraryCollectionStore";
import { playedGamesSnapshot, subscribePlayedGames } from "../../lib/playedGameStore";
import { savedAnalysesSnapshot, subscribeSavedAnalyses } from "../../lib/savedAnalysisStore";
import { savedRepertoiresSnapshot, subscribeSavedRepertoires } from "../../lib/savedRepertoireStore";
import {
  estimatedLibraryGamesPayload,
  estimatedPayloadBytes,
  readBrowserStorage,
  type BrowserStorageEstimate,
} from "../../lib/storageDiagnostics";
import { RightPanel } from "../main/rightPanel";

/**
 * **Storage** (`/settings/storage`, CTA-94) — how much space the app's data
 * takes on this device: the browser's own estimates for the whole origin
 * (`navigator.storage.estimate()`), and the reader's records — counted
 * exactly, sized by the app's own payload estimate
 * (`lib/storageDiagnostics.ts`; the research is `docs/indexed-db.md`).
 *
 * Every number says what it is: the browser's figures are estimates, the
 * sizes are **estimated payloads** — never disk or IndexedDB sizes — and a
 * number the browser does not report reads "not available", never zero.
 * The quota is not shown; a note says it is in the browser's developer
 * tools.
 *
 * The reader's data is **four sections, one per database's heavy store** —
 * Engine games, Analyses, Repertoires and Library games — separated by a
 * bolder line. The folders and the collections' summaries are tiny beside
 * what they file, and the shipped collections are fetched over the
 * network, not stored: none of them is listed — the origin usage's business
 * only.
 *
 * The counts and payloads are the stores' snapshots (the Export tab's
 * pattern: a subscription starts each read), so nothing is read twice. The
 * Library's games are the bulk case and are never read: each collection's
 * games are estimated from its index rows. Reads only: nothing is written,
 * and nothing throws. The two tables are the `StorageTable` block (CTA-109).
 */

/** One store's live list — a subscription starts the first read. */
const useRows = <Row,>(
  subscribe: (onChange: () => void) => () => void,
  snapshot: () => readonly Row[] | undefined,
): readonly Row[] | undefined => useSyncExternalStore(subscribe, snapshot, snapshot);

/** What the rows hold, estimated. `undefined` while the read is out — shown as "…". */
const usePayload = (rows: readonly unknown[] | undefined): number | undefined =>
  useMemo(
    () =>
      rows === undefined
        ? undefined
        : rows.reduce<number>((total, row) => total + estimatedPayloadBytes(row), 0),
    [rows],
  );

function StorageTab() {
  const { t } = useTranslation();

  const playedGames = useRows(subscribePlayedGames, playedGamesSnapshot);
  const analyses = useRows(subscribeSavedAnalyses, savedAnalysesSnapshot);
  const repertoires = useRows(subscribeSavedRepertoires, savedRepertoiresSnapshot);
  // The summaries are not shown — they are tiny beside their games — but the
  // games row counts and sizes are derived from them.
  const collections = useRows(subscribeUploadedCollections, uploadedCollectionsSnapshot);

  const playedPayload = usePayload(playedGames);
  const analysesPayload = usePayload(analyses);
  const repertoiresPayload = usePayload(repertoires);

  const [browser, setBrowser] = useState<BrowserStorageEstimate | undefined>();
  // The Library's games, estimated from the indexes — kept beside the
  // collections it answers for, so a change shows "…" until re-measured.
  const [games, setGames] = useState<{ collections: readonly unknown[]; payload: number } | undefined>();

  // The browser's estimates, read once on arrival.
  useEffect(() => {
    let current = true;
    void readBrowserStorage().then((estimate) => {
      if (current) setBrowser(estimate);
    });
    return () => {
      current = false;
    };
  }, []);

  // The collections are the only way the games change, so the estimate is
  // re-made exactly when they do.
  useEffect(() => {
    if (collections === undefined) return;
    let current = true;
    void estimatedLibraryGamesPayload(collections).then((payload) => {
      if (current) setGames({ collections, payload });
    });
    return () => {
      current = false;
    };
  }, [collections]);

  const gamesCount = collections?.reduce((total, collection) => total + collection.count, 0);
  const gamesPayload = games !== undefined && games.collections === collections ? games.payload : undefined;

  /*
    The reader's data, four sections — one per database's heavy store: the
    engine's played games (chessapp.engine), the analyses
    (chessapp.analyses), the repertoires (chessapp.repertoires) and the
    Library's games (chessapp.library). The folders and the collections'
    summaries are tiny beside what they file, and are not listed.
  */
  const categories: StorageCategory[] = [
    { id: "playedGames", section: "engine", records: playedGames?.length, payload: playedPayload },
    { id: "analyses", section: "analyses", records: analyses?.length, payload: analysesPayload },
    { id: "repertoires", section: "repertoires", records: repertoires?.length, payload: repertoiresPayload },
    { id: "collectionGames", section: "library", records: gamesCount, payload: gamesPayload },
  ];

  return (
    <>
      <Box data-testid="settings-storage" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("settings.storage.intro")}
        </Typography>

        <StorageTable browser={browser} categories={categories} testId="settings-storage" />
      </Box>

      <RightPanel>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("settings.storage.panel")}
        </Typography>
      </RightPanel>
    </>
  );
}

export default StorageTab;
