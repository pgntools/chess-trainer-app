import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import { linkProps, type LinkTarget } from "../../link";

export type MissStateProps = {
  /** A heading — "No such collection". */
  title?: ReactNode;
  /** What is missing and why — the link is old, the record was deleted. */
  children: ReactNode;
  /** The way back's words — "Back to the Library". */
  backLabel: ReactNode;
  onBack?: () => void;
  /** The way back as a link. */
  backLink?: LinkTarget;
  /** The root's test id; the button is `<testId>-back`. */
  testId: string;
};

/**
 * **Nothing here** (CTA-108) — a URL naming a record that is not there: a
 * centred note and one way back, where the Library and the repertoires each
 * had their own look. The arrow points the way back in either direction.
 */
function MissState({ title, children, backLabel, onBack, backLink, testId }: MissStateProps) {
  const { direction } = useTheme();
  return (
    <Box data-testid={testId} sx={{ py: 4, px: 2, display: "grid", justifyItems: "center", gap: 1.5, textAlign: "center" }}>
      {title !== undefined && (
        <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      )}
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {children}
      </Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={onBack}
        startIcon={<ArrowBackRoundedIcon style={direction === "rtl" ? { transform: "scaleX(-1)" } : undefined} />}
        data-testid={`${testId}-back`}
        {...linkProps(backLink)}
      >
        {backLabel}
      </Button>
    </Box>
  );
}

export default MissState;
