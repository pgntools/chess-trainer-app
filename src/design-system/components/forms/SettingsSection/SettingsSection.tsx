import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

export type SettingsSectionProps = {
  /** The heading, set as an overline. */
  title: ReactNode;
  /** A line under the heading saying what the group is for. */
  description?: ReactNode;
  /** The fields. */
  children: ReactNode;
  /** The section's test id; the heading is `<testId>-title`. */
  testId: string;
};

/**
 * **A group of settings** (CTA-108): an overline heading over a divider,
 * then its fields in a column — the analyses' `Section` and the
 * repertoires' inline copy of it. A `section` named by its heading.
 */
function SettingsSection({ title, description, children, testId }: SettingsSectionProps) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId} data-testid={testId} sx={{ display: "grid", gap: 1.5 }}>
      <Box>
        <Typography
          id={headingId}
          variant="overline"
          component="h2"
          data-testid={`${testId}-title`}
          sx={{ display: "block", color: "text.secondary", lineHeight: 2 }}
        >
          {title}
        </Typography>
        <Divider />
      </Box>
      {description !== undefined && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      <Box sx={{ display: "grid", gap: 1.5 }}>{children}</Box>
    </Box>
  );
}

export default SettingsSection;
