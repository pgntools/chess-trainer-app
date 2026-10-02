import Box from "@mui/material/Box";

import { useChessTokens } from "../../design-system/theme";
import type { ResultTone } from "../../design-system/themes";

/**
 * **What a move's games ended in**, as one White / draw / Black bar — the
 * lichess-explorer row the Library's opening-moves filter draws beside each
 * move (CTA-76), and the front page's collection demo after it (CTA-126).
 * Each part is the theme's result tone (CTA-107); a part of 15% or more
 * prints its share. No games, no bar.
 */

type ResultBarProps = {
  results: { white: number; draw: number; black: number };
};

const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

function ResultBar({ results }: ResultBarProps) {
  const { white, draw, black } = results;
  const tones = useChessTokens().filterBoard;
  const total = white + draw + black;
  if (total === 0) return <Box />;
  const part = (count: number, { background: bgcolor, text: color }: ResultTone) =>
    count === 0 ? null : (
      <Box
        sx={{
          flexGrow: count,
          flexBasis: 0,
          bgcolor,
          color,
          fontSize: 10,
          lineHeight: "14px",
          textAlign: "center",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {percent(count, total) >= 15 ? `${percent(count, total)}%` : ""}
      </Box>
    );
  return (
    <Box
      sx={{ display: "flex", height: 14, borderRadius: 0.5, overflow: "hidden", border: "1px solid", borderColor: "divider" }}
    >
      {part(white, tones.white)}
      {part(draw, tones.draw)}
      {part(black, tones.black)}
    </Box>
  );
}

export default ResultBar;
