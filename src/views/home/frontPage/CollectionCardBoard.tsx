import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { InlineAlert } from "../../../design-system/components/feedback";
import { demoTreeOfGameTree, startLineOf } from "../../../lib/demoTree";
import { isReferenceRead, libraryGameReference, loadReferencedGames, resolveGameReference } from "../../../lib/gameReference";
import { gameTag } from "../../../lib/gameModel";
import { parsePgnTree } from "../../../lib/pgn";
import { slugify } from "../../../lib/pgnText";
import DemoBoard from "../../shared/DemoBoard";

/**
 * **`<CollectionCard>`'s board** (CTA-126) — one Library game, read by its
 * `?game=` reference (`library/<collection>/<n>`, `lib/gameReference.ts`)
 * **exactly as the Analysis Board reads it** — it waits for the
 * collection's read, then looks the game up — and shown on a `DemoBoard`
 * the reader steps through, under its players and event, with a link that
 * opens the same reference on the Analysis Board. Not an embed of its own:
 * an article shows one game with `<InlinePgnGame src="/library/<c>/<n>">`.
 *
 * A game that is not there (an uploaded collection on another device) says
 * so in place of the board. A shipped collection's game reads its PGN chunk
 * on the first visit — the Library's own lazy load
 * (`lib/shippedCollections.ts`), fetched once.
 *
 * `startMove` is where the board opens (`startLineOf`: `"17"` after White's
 * 17th move, `"17..."` after Black's, or a line of SAN). The board's id and
 * test ids come from the reference.
 */

type CollectionCardBoardProps = {
  /** The collection's id. */
  collection: string;
  /** The game's place in it, 1-based. */
  game: number;
  /** Where the board opens — a move number (`"17"`, `"17..."`) or a line of SAN. The start when absent. */
  startMove?: string;
  /** Draw the arrows to the next moves. Default on. */
  showNextMoveArrow?: boolean;
};

export function CollectionCardBoard({ collection, game, startMove, showNextMoveArrow }: CollectionCardBoardProps) {
  const reference = libraryGameReference(collection, game);
  const { t } = useTranslation();
  const [readReference, setReadReference] = useState<string | null>(() => (isReferenceRead(reference) ? reference : null));
  const ready = readReference === reference;

  useEffect(() => {
    if (ready) return;
    let live = true;
    void loadReferencedGames(reference).then(() => {
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
        <InlineAlert severity="info" testId={`${testId}-missing`} detail={`/library/${collection}/${game}`}>
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
        nextMoveArrows={showNextMoveArrow}
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
