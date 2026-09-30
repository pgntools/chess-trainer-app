import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export type EmptyStateProps = {
  /** "No saved analyses yet." */
  children: ReactNode;
  /** A large icon above the words. */
  icon?: ReactNode;
  /** A way out of the emptiness — a button ("New analysis"). */
  action?: ReactNode;
  testId: string;
};

/**
 * **An empty list** (CTA-108): the words centred, muted, with room around
 * them (`py: 4`) — the look every list already agreed on — and optionally an
 * icon above and an action below.
 */
function EmptyState({ children, icon, action, testId }: EmptyStateProps) {
  return (
    <Box data-testid={testId} sx={{ py: 4, px: 2, display: "grid", justifyItems: "center", gap: 1.5, textAlign: "center" }}>
      {icon !== undefined && (
        <Box aria-hidden="true" sx={{ color: "text.disabled", display: "flex", "& svg": { fontSize: 40 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {children}
      </Typography>
      {action}
    </Box>
  );
}

export default EmptyState;
