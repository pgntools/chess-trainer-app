import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { LoadingLine, LoadingSpinnerLine, MissState } from "../../design-system/components/states";

import {
  isMultiGameRepertoire,
  readRepertoireText,
  type RepertoireReading,
  type SavedRepertoire,
} from "../../lib/savedRepertoires";
import RepertoireMergeSplit from "./RepertoireMergeSplit";
import RepertoirePlayer from "./RepertoirePlayer";
import { useSavedRepertoires } from "./useSavedRepertoires";
import { usePageTitle } from "../main/pageTitle";

/**
 * **A repertoire's own view** (`/repertoires/<id>`) — the route: it resolves
 * the record and hands it to the **player** (`RepertoirePlayer.tsx`, CTA-63),
 * the one screen the repertoire is read, tried, drilled (Autoplay) and — from
 * its Games menu — played on. The same file keeps the two things that are not
 * a board: the miss, and a record saved **before** the one-game rule, which
 * opens on the merge-or-split choice (`RepertoireMergeSplit`) rather than a
 * board, and is replaced by what the reader picks.
 *
 * Before CTA-63 this file was the read-only board; the player took its place
 * and everything it had (the opening line, the description, the settings
 * link, the next-moves bar, the engine), with the engine now off by default.
 */



function RepertoireBoard() {
  const { id } = useParams();
  const repertoires = useSavedRepertoires();
  if (repertoires === undefined) return <ReadingRepertoires />;
  const saved = repertoires.find((row) => row.id === id);

  if (saved === undefined) return <MissingRepertoire />;
  // Keyed, so opening another repertoire is a fresh screen rather than this
  // one's state carried over — the "every arrival is initial state" rule.
  if (isMultiGameRepertoire(saved)) {
    return <MultiGameRepertoire key={saved.id} saved={saved} />;
  }
  return <RepertoirePlayer key={saved.id} saved={saved} />;
}

/**
 * A record from before the one-game rule: read (after a paint — such a text
 * can hold hundreds of games) and offered the merge-or-split choice in its place.
 */
export function MultiGameRepertoire({ saved }: { saved: SavedRepertoire }) {
  const { t } = useTranslation();
  usePageTitle(saved.name || t("repertoires.untitled"));
  const navigate = useNavigate();
  const [reading, setReading] = useState<RepertoireReading | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setReading(readRepertoireText(saved.pgn)), 0);
    return () => clearTimeout(timer);
  }, [saved.pgn]);

  return (
    <Box data-testid="repertoire-board-multi" sx={{ height: "100%", overflowY: "auto" }}>
      <Typography variant="subtitle1" component="h2" dir="auto" sx={{ fontWeight: 700 }}>
        {saved.name || t("repertoires.untitled")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {t("repertoires.choice.legacy")}
      </Typography>
      {reading === null ? (
        <LoadingSpinnerLine testId="repertoire-board-reading">{t("repertoires.upload.reading")}</LoadingSpinnerLine>
      ) : reading.ok && reading.games.length > 1 ? (
        <RepertoireMergeSplit
          reading={reading}
          typedName={saved.name}
          replacing={saved.id}
          settings={saved.settings}
          onDone={(path) => navigate(path)}
        />
      ) : (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("repertoires.detail.unreadable")}
        </Typography>
      )}
    </Box>
  );
}

/**
 * The store's first read still out (IndexedDB — a read is a promise): the
 * routes wait rather than calling the repertoire missing before it lands.
 */
export function ReadingRepertoires() {
  const { t } = useTranslation();
  return <LoadingLine testId="repertoires-loading">{t("repertoires.loading")}</LoadingLine>;
}

/** An id this browser does not hold — the board's miss, and the play screen's. */
export function MissingRepertoire() {
  const { t } = useTranslation();
  return (
    <MissState
      backLabel={t("repertoires.detail.back")}
      backLink={{ component: RouterLink, to: "/repertoires" }}
      testId="repertoire-board-missing"
    >
      {t("repertoires.detail.missing")}
    </MissState>
  );
}

export default RepertoireBoard;
