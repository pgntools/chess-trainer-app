import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { InlineAlert } from "../../../design-system/components/feedback";
import { mainline, plyLabel } from "../../../lib/gameTree";
import { parsePgnTree, splitPgnGames } from "../../../lib/pgn";
import { resolveExcerpt } from "../../../lib/pgnExcerpt";
import ExcerptBoard from "../../shared/ExcerptBoard";

/**
 * **A game written into an article** (CTA-126) —
 * `<InlinePgnGame pgn={game} from="5" to="15..." start="11" />`: an excerpt
 * of the PGN on a board beside its moves, side lines nested where they
 * branch (`views/shared/ExcerptBoard.tsx`, `lib/pgnExcerpt.ts`). An article
 * reviewing one game shows it as many times as it has positions to talk
 * about, each its own window — so the PGN is usually imported once, at the
 * top of the article (`import game from "./game.pgn?raw"`), and every board
 * takes `pgn={game}`.
 *
 * The window: `from` and `to` are the first and last mainline positions the
 * reader can reach, `start` where the board opens — each a move number
 * (`"11"` after White's 11th move, `"11..."` after Black's) or, for `start`,
 * a line of SAN that may go into a side line. `fromPly` / `toPly` /
 * `startPly` say the same in plies (0 the start) and win. Absent: the whole
 * game, opened at its start. `variations={false}` shows the mainline alone;
 * `comments` shows the PGN comment of the move on screen; `orientation`
 * which way the board faces; `caption` a line above it. `game` picks one
 * game of a PGN holding several (a lichess study's chapters), 1-based. The
 * shapes a comment draws — lichess's `[%cal]` arrows, `[%csl]` circles — are
 * on the board at their position; `shapes={false}` leaves them off.
 *
 * Each board's id is the instance's own (`useId`), so one game can be
 * embedded any number of times on a page. A PGN that will not read says so.
 */

type InlinePgnGameProps = {
  /** The game as PGN — side lines, comments and NAGs kept. */
  pgn: string;
  /** Which game of a PGN holding several, 1-based. Default the first. */
  game?: number | string;
  /** Draw the PGN's `[%cal]` arrows and `[%csl]` circles. Default on. */
  shapes?: boolean;
  from?: string;
  to?: string;
  start?: string;
  fromPly?: number | string;
  toPly?: number | string;
  startPly?: number | string;
  /** Show the side lines that branch inside the window. Default on. */
  variations?: boolean;
  /** Show the PGN comment of the move on screen. */
  comments?: boolean;
  orientation?: "white" | "black";
  /** A line above the board. */
  caption?: string;
};

const plyOf = (value: number | string | undefined): number | undefined => {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : undefined;
};

export function InlinePgnGame({
  pgn,
  game,
  shapes,
  from,
  to,
  start,
  fromPly,
  toPly,
  startPly,
  variations,
  comments,
  orientation,
  caption,
}: InlinePgnGameProps) {
  const { t } = useTranslation();
  const instance = useId().replace(/[^a-zA-Z0-9]/g, "");

  const parsed = useMemo(() => {
    try {
      // Only the game shown is read: another chapter's slip cannot cost this board.
      const chunks = splitPgnGames(pgn);
      const index = (plyOf(game) ?? 1) - 1;
      const chunk = chunks[index];
      if (chunk === undefined) return { error: `game ${index + 1} of ${chunks.length}` };
      return { tree: parsePgnTree(chunk) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [pgn, game]);
  const window = useMemo(
    () =>
      parsed.tree === undefined
        ? undefined
        : resolveExcerpt(parsed.tree, {
            from,
            to,
            start,
            fromPly: plyOf(fromPly),
            toPly: plyOf(toPly),
            startPly: plyOf(startPly),
            variations,
          }),
    [parsed, from, to, start, fromPly, toPly, startPly, variations],
  );

  const testId = `inline-pgn-${instance}`;
  if (parsed.tree === undefined || window === undefined) {
    return (
      <InlineAlert severity="warning" testId={`${testId}-unreadable`} detail={parsed.error}>
        {t("inlinePgn.unreadable")}
      </InlineAlert>
    );
  }

  // The group's name: the caption, or the window it shows — "The game, 5. to 15...".
  const { tree } = parsed;
  const positionName = (ply: number) => {
    if (ply === 0) return t("inlinePgn.start");
    const { number, isWhiteMove } = plyLabel(tree.startFen, ply);
    return `${number}${isWhiteMove ? "." : "..."} ${mainline(tree)[ply - 1].san}`;
  };
  const label = caption ?? t("inlinePgn.label", { from: positionName(window.fromPly), to: positionName(window.toPly) });

  return (
    <ExcerptBoard
      boardId={`inline-pgn-board-${instance}`}
      testId={testId}
      label={label}
      tree={tree}
      window={window}
      orientation={orientation}
      showComments={comments}
      shapes={shapes}
      caption={caption}
    />
  );
}
