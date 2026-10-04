import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

import { visuallyHidden } from "../../a11y";

/** The palette colours a chip fills with — each one's `contrastText` on its `main` measured in every theme (`themes/contrast.ts`). */
export type LabelChipTone = "primary" | "secondary" | "success" | "warning" | "info" | "error";

export type LabelChipProps = {
  /** The few letters in view — "GM". */
  label: string;
  /** The fill. */
  tone: LabelChipTone;
  /** What the letters stand for, read in their place and shown on hover ("Grandmaster"). Absent, the letters are read. */
  name?: string;
  testId?: string;
};

/**
 * **A label as a small filled chip** (CTA-128) — a few letters in a palette
 * tone, a line high, beside words: a player's title in a table. Not a
 * control: it does nothing when pressed, and takes no focus.
 *
 * Accessible: the tone's `contrastText` on its `main` is measured in every
 * theme; the tone is never the only signal (the letters are text); an
 * abbreviation is read by its `name`, out of sight, and shown on hover.
 */
function LabelChip({ label, tone, name, testId }: LabelChipProps) {
  return (
    <Box component="span" title={name} data-testid={testId} data-tone={tone} sx={{ position: "relative", whiteSpace: "nowrap" }}>
      <Chip
        component="span"
        size="small"
        color={tone}
        label={label}
        aria-hidden={name === undefined ? undefined : true}
        sx={{ height: "1.4em", fontSize: "0.75em", fontWeight: 700, verticalAlign: "baseline", "& .MuiChip-label": { px: 0.75 } }}
      />
      {name !== undefined && (
        <Box component="span" sx={visuallyHidden}>
          {name}
        </Box>
      )}
    </Box>
  );
}

export default LabelChip;
