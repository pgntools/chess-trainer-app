import { useId, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";

/** A section that folds (CTA-241): its heading the disclosure, its summary beside it. */
export type SettingsSectionFold = {
  /** One line saying what the fields hold ("Stockfish 19 Lite · Default · depth 20 · 5 s"), cut where it runs short. Absent, none. */
  summary?: ReactNode;
  /** Whether it starts open. Absent, folded. */
  defaultExpanded?: boolean;
};

export type SettingsSectionProps = {
  /** The heading, set as an overline. */
  title: ReactNode;
  /** A line under the heading saying what the group is for. */
  description?: ReactNode;
  /** The fields. */
  children: ReactNode;
  /**
   * **Folds** (CTA-241): the heading is a button (`aria-expanded`) that opens
   * and closes the description and the fields, the summary beside the title.
   * Absent, always open — the section as it was.
   */
  fold?: SettingsSectionFold;
  /** The section's test id; the heading is `<testId>-title`, a fold's button `<testId>-toggle`, its summary `-summary`. */
  testId: string;
};

/**
 * **A group of settings** (CTA-108): an overline heading over a divider,
 * then its fields in a column — the analyses' `Section` and the
 * repertoires' inline copy of it. A `section` named by its heading.
 *
 * With `fold` its heading is a **disclosure** (WAI-ARIA's: a button in the
 * heading, `aria-expanded`, `aria-controls` the content): a chevron that
 * points the way the text runs closed and down open, the title, and the
 * summary on one line after it — what the reader would find inside, said
 * without opening it. The fields stay mounted while folded (hidden), so what
 * they hold is kept.
 */
function SettingsSection({ title, description, children, fold, testId }: SettingsSectionProps) {
  const headingId = useId();
  const contentId = useId();
  const summaryId = useId();
  const { direction, transitions } = useTheme();
  const [expanded, setExpanded] = useState(fold?.defaultExpanded ?? false);

  const content = (
    <>
      {description !== undefined && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      <Box sx={{ display: "grid", gap: 1.5 }}>{children}</Box>
    </>
  );

  if (fold === undefined) {
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
        {content}
      </Box>
    );
  }

  const transform = expanded ? "rotate(90deg)" : direction === "rtl" ? "scaleX(-1)" : "none";
  return (
    <Box component="section" aria-labelledby={headingId} data-testid={testId}>
      <Box>
        <Typography component="h2" sx={{ m: 0 }}>
          <ButtonBase
            aria-expanded={expanded}
            aria-controls={contentId}
            aria-labelledby={headingId}
            aria-describedby={fold.summary === undefined ? undefined : summaryId}
            onClick={() => setExpanded((open) => !open)}
            data-testid={`${testId}-toggle`}
            sx={{ width: "100%", minHeight: 32, justifyContent: "flex-start", gap: 0.5, borderRadius: 1, textAlign: "start" }}
          >
            <KeyboardArrowRightRoundedIcon
              fontSize="small"
              aria-hidden="true"
              sx={{ color: "text.secondary", flexShrink: 0 }}
              // The theme's transition, so a reader who asks for reduced motion sees none (CTA-111); inline, so the RTL plugin leaves it be.
              style={{ transform, transition: transitions.create("transform", { duration: 150 }) }}
            />
            <Typography
              id={headingId}
              variant="overline"
              component="span"
              data-testid={`${testId}-title`}
              sx={{ color: "text.secondary", lineHeight: 2, flexShrink: 0 }}
            >
              {title}
            </Typography>
            {fold.summary !== undefined && (
              <Typography
                id={summaryId}
                variant="body2"
                component="span"
                data-testid={`${testId}-summary`}
                sx={{ minWidth: 0, color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingInlineStart: 0.5 }}
              >
                {fold.summary}
              </Typography>
            )}
          </ButtonBase>
        </Typography>
        <Divider />
      </Box>
      <Collapse in={expanded} id={contentId} data-testid={`${testId}-content`}>
        <Box sx={{ display: "grid", gap: 1.5, pt: 1.5 }}>{content}</Box>
      </Collapse>
    </Box>
  );
}

export default SettingsSection;
