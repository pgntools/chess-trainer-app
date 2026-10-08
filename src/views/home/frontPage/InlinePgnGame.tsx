import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Typography from "@mui/material/Typography";

import { InlineAlert } from "../../../design-system/components/feedback";
import { mainline, plyLabel } from "../../../lib/gameTree";
import { parsePgnTree, splitPgnGames } from "../../../lib/pgn";
import { resolveExcerpt } from "../../../lib/pgnExcerpt";
import ExcerptBoard from "../../shared/ExcerptBoard";
import { EmbedSource } from "./embedSource";

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
 *
 * **Any source** (CTA-140): `src` in place of `pgn` names a game the app
 * keeps, by its screen's path (`lib/embedSource.ts`) — a Library game
 * (`/library/<c>/<n>`), or a collection with `game` picking one of it, a
 * saved analysis, a played game, a repertoire (its whole tree) — read by
 * `<EmbedSource>`, then shown as a PGN of the article's own is. `src` may
 * also be the PGN's text.
 *
 * **`<InlinePgnGame2colH>`** (CTA-146) is the same component with its moves
 * laid out as the Analysis Board's move list is: numbered pairs in two
 * columns, a side line a row under the pair it answers, beside the board in a
 * column as tall as it that scrolls when the tree is longer — the game's
 * players, result and event on a plate over the board, the step and flip
 * buttons under the moves.
 * **`<InlinePgnGame2colV>`** puts those columns under the board, at every
 * width, in a box half its height — the one for boards side by side in a
 * `<BoardRow>`. Same props, same sources; `<InlinePgnGame>` is untouched.
 * `<InlinePgnGameColumns>`, `<InlinePgnGame2colH>`'s first name, is its alias.
 */

type InlinePgnGameProps = {
  /** The game as PGN — side lines, comments and NAGs kept. */
  pgn?: string;
  /** Where the game is, in place of `pgn`: an app path (`/library/<c>/<n>`, `/repertoires/<id>`, …) — or a PGN's text. */
  src?: string;
  /** Which game of a PGN holding several, 1-based. Default the first. */
  game?: number | string;
  /** Draw the PGN's `[%cal]` arrows and `[%csl]` circles. Default on. */
  shapes?: boolean;
  /** Draw the arrows to the next moves (a PGN's own drawing is not one of them). Default on. */
  showNextMoveArrow?: boolean;
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

type MovesLayout = {
  movesLayout: "run" | "columns";
  movesPlacement?: "beside" | "below";
  /** The game's plate over the board, the step buttons under the moves — `<InlinePgnGame2colH>`'s. */
  framed?: boolean;
};

export function InlinePgnGame(props: InlinePgnGameProps) {
  return <InlinePgnSource {...props} movesLayout="run" />;
}

/**
 * `<InlinePgnGame>` with its moves in numbered pairs beside the board, in a column as tall as it (CTA-146) —
 * the game's players, result and event over the board, the step buttons under the moves.
 */
export function InlinePgnGame2colH(props: InlinePgnGameProps) {
  return <InlinePgnSource {...props} movesLayout="columns" movesPlacement="beside" framed />;
}

/** The same pairs under the board, in a box half its height — for boards side by side. */
export function InlinePgnGame2colV(props: InlinePgnGameProps) {
  return <InlinePgnSource {...props} movesLayout="columns" movesPlacement="below" />;
}

function InlinePgnSource({ src, pgn, game, ...shown }: InlinePgnGameProps & MovesLayout) {
  const { t } = useTranslation();
  const instance = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (src === undefined) return <InlinePgnBoard pgn={pgn ?? ""} game={game} {...shown} />;
  return (
    <EmbedSource src={src}>
      {(read) => {
        if (read.status === "loading") {
          return (
            <Typography role="status" data-testid={`inline-pgn-${instance}-loading`} sx={{ color: "text.secondary" }}>
              {t("home.embed.loading")}
            </Typography>
          );
        }
        if (read.status === "missing") {
          return (
            <InlineAlert severity="info" testId={`inline-pgn-${instance}-missing`} detail={read.detail}>
              {t("home.embed.missing")}
            </InlineAlert>
          );
        }
        // A PGN's text holds its games as written; a stored source's games are each one: `game` picks among them.
        if (read.status === "unreadable") return <InlinePgnBoard pgn="" {...shown} />;
        return <InlinePgnBoard pgn={read.games.join("\n\n")} game={game} {...shown} />;
      }}
    </EmbedSource>
  );
}

/** The board over a PGN's text — what `<InlinePgnGame>` shows, whatever its source. */
function InlinePgnBoard({
  pgn,
  game,
  shapes,
  showNextMoveArrow,
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
  movesLayout,
  movesPlacement,
  framed = false,
}: Omit<InlinePgnGameProps, "src" | "pgn"> & MovesLayout & { pgn: string }) {
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
      nextMoveArrows={showNextMoveArrow}
      movesLayout={movesLayout}
      movesPlacement={movesPlacement}
      gameInfo={framed}
      controlsPlacement={framed ? "moves" : "board"}
      caption={caption}
    />
  );
}
