import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";

import { linkProps, type LinkTarget } from "../../link";

export type IconCardProps = {
  icon: ReactNode;
  label: ReactNode;
  /** A line under the label saying what is there. */
  description?: ReactNode;
  onClick?: () => void;
  link?: LinkTarget;
  /** The card's test id; the action area is `<testId>-open`. */
  testId: string;
};

/**
 * **A way somewhere, as a card** (CTA-108) — the Home screen's: an icon in
 * the primary colour beside the label (and a line under it), the whole card
 * one action area.
 */
function IconCard({ icon, label, description, onClick, link, testId }: IconCardProps) {
  return (
    <Card variant="outlined" data-testid={testId}>
      <CardActionArea
        onClick={onClick}
        data-testid={`${testId}-open`}
        sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 1.5, p: 1.5, height: "100%" }}
        {...linkProps(link)}
      >
        <Box aria-hidden="true" sx={{ display: "flex", color: "primary.main", flexShrink: 0 }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
          {description !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
}

export default IconCard;
