import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { InlineAlert } from "../../../design-system/components/feedback";
import { demoTreeOfGameTree, startLineOf } from "../../../lib/demoTree";
import {
  isAnalysisReference,
  isReferenceRead,
  loadReferencedGames,
  resolveGameReference,
} from "../../../lib/gameReference";
import { gameTag } from "../../../lib/gameModel";
import { parsePgnTree } from "../../../lib/pgn";
import { slugify } from "../../../lib/pgnText";
import { loadSavedAnalyses, savedAnalysesSnapshot } from "../../../lib/savedAnalysisStore";
import DemoBoard from "../../shared/DemoBoard";

/**
 * **A real stored game, embedded in the front page** (CTA-126) —
 * `<StoredGameEmbed reference="…" />`, where `reference` is a `?game=`
 * reference (`lib/gameReference.ts`): `library/<collection>/<n>` for a Library
 * game, `analysis/saved/<id>` for a saved analysis, `play/games/<id>` for a
 * game against the engine. The embed resolves it **exactly as the Analysis
 * Board does** — it waits for the store's read, then looks the game up — and
 * shows it on a `DemoBoard` the reader steps through, under its players and
 * event, with a link that opens the same reference on the Analysis Board.
 *
 * A reference that names nothing (a reader without that record, a mistyped
 * one) says so in place of the board; nothing else on the page waits for it.
 * A Library game reads its collection's PGN chunk on the first visit — the
 * Library's own lazy load (`lib/shippedCollections.ts`), fetched once.
 *
 * `startMove` is where the board opens (`startLineOf`: `"17"` after White's
 * 17th move, `"17..."` after Black's, or a line of SAN). The board's id and
 * test ids come from the reference, so a page embeds each game once.
 * `<CollectionGameBoard>` is this, addressed by a Library game's path.
 */

type StoredGameEmbedProps = {
  /** A `?game=` reference — `library/capablanca/1`. */
  reference: string;
  /** Where the board opens — a move number (`"17"`, `"17..."`) or a line of SAN. The start when absent. */
  startMove?: string;
  /** What the "not here" notice names — the reference when absent (`<CollectionGameBoard>` passes its path). */
  shownAs?: string;
};

const isRead = (reference: string) =>
  (!isAnalysisReference(reference) || savedAnalysesSnapshot() !== undefined) && isReferenceRead(reference);

export function StoredGameEmbed({ reference, startMove, shownAs }: StoredGameEmbedProps) {
  const { t } = useTranslation();
  const [readReference, setReadReference] = useState<string | null>(() => (isRead(reference) ? reference : null));
  const ready = readReference === reference;

  useEffect(() => {
    if (ready) return;
    let live = true;
    void Promise.all([
      isAnalysisReference(reference) ? loadSavedAnalyses() : undefined,
      loadReferencedGames(reference),
    ]).then(() => {
      if (live) setReadReference(reference);
    });
    return () => {
      live = false;
    };
  }, [ready, reference]);

  const tree = useMemo(() => {
    if (!ready) return undefined;
    const game = resolveGameReference(reference);
    if (game === undefined) return null;
    try {
      return parsePgnTree(game.pgn);
    } catch {
      return null;
    }
  }, [ready, reference]);
  const root = useMemo(() => (tree ? demoTreeOfGameTree(tree) : undefined), [tree]);

  const slug = slugify(reference) || "game";
  const testId = `home-game-${slug}`;
  if (tree === undefined) {
    return (
      <Typography role="status" data-testid={`${testId}-loading`} sx={{ color: "text.secondary" }}>
        {t("home.embed.loading")}
      </Typography>
    );
  }
  if (tree === null || root === undefined) {
    return (
      <Box>
        <InlineAlert severity="info" testId={`${testId}-missing`} detail={shownAs ?? reference}>
          {t("home.embed.missing")}
        </InlineAlert>
      </Box>
    );
  }

  const white = gameTag(tree.headers, "White") ?? t("home.embed.white");
  const black = gameTag(tree.headers, "Black") ?? t("home.embed.black");
  const event = [gameTag(tree.headers, "Event"), gameTag(tree.headers, "Date")?.slice(0, 4)]
    .filter((part) => part !== undefined && part !== "" && part !== "????")
    .join(", ");
  const result = gameTag(tree.headers, "Result");
  const players = `${white} – ${black}`;

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1, minWidth: 0, maxWidth: 480 }}>
      <Box>
        <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }} data-testid={`${testId}-players`}>
          {players}
          {result !== undefined && (
            <Box component="span" dir="ltr" sx={{ color: "text.secondary", fontWeight: 400, unicodeBidi: "isolate" }}>
              {` ${result}`}
            </Box>
          )}
        </Typography>
        {event !== "" && (
          <Typography variant="body2" color="text.secondary">
            {event}
          </Typography>
        )}
      </Box>
      <DemoBoard
        boardId={`front-page-game-${slug}`}
        testId={`${testId}-board`}
        label={t("home.embed.label", { players })}
        root={root}
        startFen={tree.startFen}
        startCaption={t("home.embed.start")}
        initialLine={startLineOf(root, startMove, tree.startFen)}
      />
      <Button
        component={RouterLink}
        to={`/tools/analysis?game=${encodeURIComponent(reference)}`}
        variant="outlined"
        size="small"
        data-testid={`${testId}-open`}
        sx={{ justifySelf: "start" }}
      >
        {t("home.embed.open")}
      </Button>
    </Box>
  );
}
