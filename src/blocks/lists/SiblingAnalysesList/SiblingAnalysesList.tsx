import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { IconAction } from "../../../design-system/components/toolbars";

/** One analysis of the folder, in the order the list shows. */
export type SiblingAnalysisItem = {
  /** The record's id — the row's key. */
  id: string;
  /** Its name, already worded (the reader's, else the players', else the generic). */
  name: string;
  /** The board it opens. */
  link: LinkTarget;
};

/** The block's words — the caller's catalog, already translated. */
export type SiblingAnalysesLabels = {
  /** The landmark's accessible name — "Analyses in ‹folder›". */
  region: string;
  /** The heading: the folder's name. */
  title: string;
  /** Where the current one stands — "3 of 12". Empty for none. */
  position: string;
  /** The Close button's name. */
  close: string;
  /** Why the others cannot be opened now (unsaved changes). Shown only while `locked`. */
  locked: string;
  /** "12 earlier analyses" — shown above the rows when the list was cut. Empty for none. */
  moreBefore: string;
  /** "30 later analyses" — shown under the rows when the list was cut. Empty for none. */
  moreAfter: string;
};

export type SiblingAnalysesListProps = {
  /** The root; the parts are `-title`, `-position`, `-close`, `-locked`, `-list`, `-item-<id>`, `-more-before`, `-more-after`. */
  testId: string;
  /** The folder's analyses, in the order they are walked. */
  items: readonly SiblingAnalysisItem[];
  /** The one on the board — highlighted, and `aria-current`. */
  currentId: string;
  labels: SiblingAnalysesLabels;
  /** The others cannot be opened (the board holds unsaved changes): they are disabled and `labels.locked` says why. */
  locked?: boolean;
  /** How many of the folder's analyses were left off the top / the foot of `items` — the note says so. */
  hiddenBefore?: number;
  hiddenAfter?: number;
  /** Close the panel — nothing else. */
  onClose: () => void;
};

/**
 * **A folder's analyses, beside the board** (CTA-145) — what the Analysis
 * Board's own left panel holds when an analysis was opened from a folder:
 * every analysis filed there, in the order the reader had them in the table,
 * the one on the board marked, and a Close that shuts the panel and leaves the
 * board as it is. A tutorial's positions are meant to be walked in order; a
 * click on a row is a link to that analysis' board.
 *
 * Accessible: a named `navigation` landmark over an ordered list of links, the
 * current one `aria-current` (and tinted, so the mark is not colour alone — it
 * is also selected), the Close a named button, the rows' text bidi-isolated
 * (`dir="auto"`) and the whole thing mirrored with the app (logical sides,
 * never `ForceLTR`). While `locked` the other rows are disabled and a note says
 * why — the board's unsaved changes decide what happens to them first.
 *
 * Presentational: the order, the links and the lock are the screen's; so are
 * the words (`labels`).
 */
function SiblingAnalysesList({
  testId,
  items,
  currentId,
  labels,
  locked = false,
  hiddenBefore = 0,
  hiddenAfter = 0,
  onClose,
}: SiblingAnalysesListProps) {
  // The current row is brought into view: the list may be longer than the panel.
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [currentId]);

  return (
    <Box
      component="nav"
      aria-label={labels.region}
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, minWidth: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, pb: 1 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            component="h2"
            variant="subtitle2"
            dir="auto"
            noWrap
            title={labels.title}
            data-testid={`${testId}-title`}
            sx={{ fontWeight: 700, lineHeight: 1.3 }}
          >
            {labels.title}
          </Typography>
          {labels.position !== "" && (
            <Typography variant="caption" data-testid={`${testId}-position`} sx={{ color: "text.secondary", display: "block" }}>
              {labels.position}
            </Typography>
          )}
        </Box>
        <IconAction label={labels.close} onClick={onClose} testId={`${testId}-close`}>
          <CloseRoundedIcon fontSize="small" />
        </IconAction>
      </Box>
      {locked && (
        <Typography variant="caption" data-testid={`${testId}-locked`} sx={{ color: "text.secondary", display: "block", pb: 1, flexShrink: 0 }}>
          {labels.locked}
        </Typography>
      )}
      <Box ref={scrollerRef} sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {hiddenBefore > 0 && (
          <Typography variant="caption" data-testid={`${testId}-more-before`} sx={{ color: "text.secondary", display: "block", px: 1, py: 0.5 }}>
            {labels.moreBefore}
          </Typography>
        )}
        <List component="ol" dense disablePadding data-testid={`${testId}-list`} sx={{ listStyle: "none" }}>
          {items.map((item) => {
            const current = item.id === currentId;
            // A row that cannot be opened now is no link at all — nothing for a click or a screen reader to follow.
            const disabled = locked && !current;
            return (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  {...linkProps(disabled ? undefined : item.link)}
                  selected={current}
                  disabled={disabled}
                  aria-current={current ? "true" : undefined}
                  data-testid={`${testId}-item-${item.id}`}
                  sx={(theme) => ({
                    borderRadius: 0.5,
                    minHeight: 32,
                    "&.Mui-focusVisible": theme.mixins.focusRing,
                    // Selected is also bold, so the mark is not the tint alone.
                    ...(current ? { fontWeight: 700 } : {}),
                  })}
                >
                  <Typography variant="body2" dir="auto" noWrap sx={{ fontWeight: "inherit", minWidth: 0 }}>
                    {item.name}
                  </Typography>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        {hiddenAfter > 0 && (
          <Typography variant="caption" data-testid={`${testId}-more-after`} sx={{ color: "text.secondary", display: "block", px: 1, py: 0.5 }}>
            {labels.moreAfter}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default SiblingAnalysesList;
