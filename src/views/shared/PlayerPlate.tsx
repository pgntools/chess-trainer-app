import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

/**
 * **A player plate** — one player's name, Elo rating and result of the game
 * as one small row, at the left end of a captured-pieces strip (CTA-105).
 * The lichess layout: the players sit beside the board, so the eye stays on
 * it while playing through a game, rather than in the panel's header.
 *
 * Presentational, like everything else in `views/shared/`: it takes plain
 * props and knows nothing about which screen renders it. `CapturedPieces`
 * renders it, reached through one optional prop on the `BoardShell` →
 * `EngineBoardSquare` → strips chain, so a board that passes nothing gets
 * exactly today's behaviour — only the Library's game board passes one.
 *
 * The row reads: the player's result of the game — `1`, `0` or the half
 * sign — then a thin vertical separator, then the Elo rating, then the name
 * (`1 | 2850 Carlsen, Magnus`). A game whose result is `*` shows no result
 * and no separator; a player without an Elo tag shows no Elo. The name is
 * what gives way on a narrow board — the captured pieces keep the right
 * edge — and it takes `dir="auto"` the way a header title does: the board
 * area is `ForceLTR`, but a name may be in any script. The result itself is
 * mapped from the game's `Result` tag by `playerResultsOf`, beside this
 * file in `playerResults.ts`.
 */

export type PlayerPlateData = {
  /** The player's name, as the game's tags carry it. */
  name: string;
  /** The player's Elo rating; absent when the game carries no tag for it. */
  elo?: number;
  /**
   * This player's result of the game — `1`, `0` or the half sign, as
   * `playerResultsOf` reads the game's `Result` tag. Absent (a result
   * of `*`), the plate shows no result and no separator.
   */
  result?: string;
};

/** A plate per player colour — keyed by colour, so the board's orientation decides which is at the top. */
export type PlayerPlates = {
  white?: PlayerPlateData;
  black?: PlayerPlateData;
};

type PlayerPlateProps = PlayerPlateData & {
  /** The plate's test id — the root of its segments' (`-result`, `-separator`, `-elo`, `-name`). */
  testId: string;
  /** Whose plate this is — the spoken label names the player by their colour. */
  color: "white" | "black";
};

function PlayerPlate({ testId, color, name, elo, result }: PlayerPlateProps) {
  const { t } = useTranslation();
  /*
    The row is one labelled unit — the strips' and the eval bar's pattern for
    board furniture whose parts are too terse to stand alone: the words below
    name it for a screen reader, carrying what the plate itself cannot say,
    which side this player is on.
  */
  const label = [
    t(color === "white" ? "board.playerWhite" : "board.playerBlack"),
    name,
    elo === undefined ? undefined : t("board.playerRating", { elo }),
    result === undefined ? undefined : t("board.playerResult", { result }),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Box
      data-testid={testId}
      role="img"
      aria-label={label}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        // What lets the name truncate: this row yields the strip's width to
        // the captured pieces beside it, not the other way round.
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {result !== undefined && (
        <Typography
          component="span"
          variant="caption"
          data-testid={`${testId}-result`}
          noWrap
          sx={{ color: "text.secondary", fontWeight: 700, lineHeight: 1, flexShrink: 0 }}
        >
          {result}
        </Typography>
      )}
      {result !== undefined && (
        <Box
          data-testid={`${testId}-separator`}
          aria-hidden
          sx={{ width: "1px", height: "12px", backgroundColor: "divider", flexShrink: 0 }}
        />
      )}
      {elo !== undefined && (
        <Typography
          component="span"
          variant="caption"
          data-testid={`${testId}-elo`}
          noWrap
          sx={{ color: "text.secondary", lineHeight: 1, flexShrink: 0 }}
        >
          {elo}
        </Typography>
      )}
      <Typography
        component="span"
        variant="caption"
        data-testid={`${testId}-name`}
        dir="auto"
        noWrap
        sx={{ lineHeight: 1, minWidth: 0 }}
      >
        {name}
      </Typography>
    </Box>
  );
}

export default PlayerPlate;
