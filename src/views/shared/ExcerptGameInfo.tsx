import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../design-system/components/a11y";
import { MONOSPACE_FONT_FAMILY } from "../../design-system/theme";
import { gameTag, type GameHeaders } from "../../lib/gameModel";
import { eloOf } from "../../lib/libraryCollections";

/**
 * **The game's line** — over an excerpt's board (`ExcerptBoard`'s
 * `gameInfo`), kept small: the players on one row, Black at its left and
 * White at its right, each with their Elo; under it the date at the left,
 * the event (else the site) in the middle and the result at the right, the
 * tags that are there. A name too long for
 * its half of the row is cut short. Nothing at all when the tags name no player and no
 * event: a position is not a game.
 */

type ExcerptGameInfoProps = {
  headers: GameHeaders;
  testId: string;
};

/** A PGN date with its unknown parts dropped — `1911.??.??` is `1911`. */
const dateOf = (date: string | undefined): string | undefined => {
  const known = date
    ?.split(".")
    .filter((part) => part !== "" && !part.includes("?"))
    .join(".");
  return known === "" ? undefined : known;
};

/** A decided `Result` as a score line — `1–0`, `0–1`, `½–½`; `*` and the unreadable none. */
const scoreOf = (result: string | undefined): string | undefined =>
  ({ "1-0": "1–0", "0-1": "0–1", "1/2-1/2": "½–½" })[result ?? ""];

const ellipsis = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;

function ExcerptGameInfo({ headers, testId }: ExcerptGameInfoProps) {
  const { t } = useTranslation();
  const white = gameTag(headers, "White");
  const black = gameTag(headers, "Black");
  const event = gameTag(headers, "Event");
  if (white === undefined && black === undefined && event === undefined) return null;

  const score = scoreOf(gameTag(headers, "Result"));
  const date = dateOf(gameTag(headers, "Date"));
  // Where it was played — the event, else the site — between the date and the result.
  const place = event ?? gameTag(headers, "Site") ?? "";

  const player = (color: "white" | "black") => {
    const elo = eloOf(gameTag(headers, color === "white" ? "WhiteElo" : "BlackElo"));
    return (
      <Box
        component="span"
        data-testid={`${testId}-${color}`}
        // Black at the left, White at the right — each half the row, a long name cut short.
        sx={{ flex: "1 1 0", textAlign: color === "white" ? "right" : "left", ...ellipsis }}
      >
        <Box component="span" sx={visuallyHidden}>
          {`${t(color === "white" ? "inlinePgn.white" : "inlinePgn.black")}: `}
        </Box>
        <Box component="span" dir="auto" sx={{ unicodeBidi: "isolate" }}>
          {(color === "white" ? white : black) ?? "?"}
        </Box>
        {elo !== undefined && (
          <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
            {` ${elo}`}
          </Box>
        )}
      </Box>
    );
  };
  return (
    <Box data-testid={testId} sx={{ display: "grid", minWidth: 0, fontSize: "0.8125rem", lineHeight: 1.4 }}>
      {(white !== undefined || black !== undefined) && (
        // Pinned left to right, as the board is: Black stays at the left under Hebrew too.
        <Typography component="p" dir="ltr" sx={{ display: "flex", gap: 1, fontSize: "inherit", lineHeight: "inherit", fontWeight: 500, minWidth: 0 }}>
          {player("black")}
          {player("white")}
        </Typography>
      )}
      {(date !== undefined || place !== "" || score !== undefined) && (
        // The date at the left, the place in the middle, the result at the right — pinned as the names are.
        <Typography
          variant="caption"
          component="p"
          dir="ltr"
          data-testid={`${testId}-details`}
          sx={{ display: "flex", justifyContent: "space-between", gap: 1, color: "text.secondary", lineHeight: 1.4, minWidth: 0 }}
        >
          <Box component="span" data-testid={`${testId}-date`} sx={{ flexShrink: 0 }}>
            {date}
          </Box>
          <Box component="span" dir="auto" title={place} data-testid={`${testId}-place`} sx={{ textAlign: "center", unicodeBidi: "isolate", ...ellipsis }}>
            {place}
          </Box>
          <Box component="span" data-testid={`${testId}-result`} sx={{ flexShrink: 0, fontFamily: MONOSPACE_FONT_FAMILY, fontWeight: 600 }}>
            {score}
          </Box>
        </Typography>
      )}
    </Box>
  );
}

export default ExcerptGameInfo;
