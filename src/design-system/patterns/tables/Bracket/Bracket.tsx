import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";

import { visuallyHidden } from "../../../components/a11y";

/** One side of a match: who, and what they scored. */
export type BracketSide = {
  /** Unique in its match: the line's test id. */
  id: string;
  /** The competitor's own name — `dir="auto"`. */
  name: string;
  /** A few words before the name, muted — a title. */
  prefix?: string;
  /** The score, as the caller writes it ("2½"). */
  score: string;
  /** A few muted words after the score — a team's board points, "(8½)". */
  detail?: string;
  /** This side went through: its line is bold and marked. */
  winner?: boolean;
};

export type BracketMatch = {
  /** Unique in the bracket: the match's test id. */
  id: string;
  sides: readonly [BracketSide, BracketSide];
  /**
   * The match in words — read in place of its two lines, so a screen reader
   * hears the whole of it at once ("Burg, Twan 1½, Sokolov, Ivan 2½:
   * Sokolov, Ivan goes through").
   */
  label: string;
};

export type BracketRound = {
  /** Unique in the bracket: the round's test id. */
  id: string;
  /** The column's title, in view — "Round 1", "Final". */
  title: string;
  /** In bracket order: the two matches whose winners meet next, one above the other. */
  matches: readonly BracketMatch[];
};

export type BracketProps = {
  /** The rounds, left to right (right to left under RTL). */
  rounds: readonly BracketRound[];
  /** The bracket's name — the region's and what a screen reader announces ("Dutch championship 2026 — bracket"). */
  ariaLabel: string;
  /** No round at all. */
  emptyLabel: ReactNode;
  /** The rounds are still being read: a busy line in their place. */
  loading?: boolean;
  /** "Reading…". */
  loadingLabel?: ReactNode;
  /** `dense` tightens the match boxes. */
  density?: "normal" | "dense";
  /**
   * The root — the scrolling region. The parts: `-round-<round id>` (its
   * title `-round-<round id>-title`), `-match-<match id>` (a side's line
   * `-match-<match id>-<side id>`), `-loading`, `-empty`.
   */
  testId: string;
};

/** One column's width: two names and scores side by side. */
const COLUMN_WIDTH = 220;

/**
 * **A knockout bracket** (CTA-128) — a column per round, left to right, each
 * a list of its matches; a match a box of two lines, a side's name (a muted
 * prefix before it) and its score (a muted detail after it), the side that
 * went through bold and marked with a bar at its start. The columns stretch
 * to one height and space their matches evenly, so a later round's match
 * sits between the two that fed it.
 *
 * **Accessible**: a named `region` that takes the keyboard focus and scrolls
 * sideways (a bracket is two-dimensional, so it may — WCAG 1.4.10); each
 * round a `list` named by its title; each match a list item read by its
 * `label` in place of its two lines, so who went through is said in words —
 * never told by the weight or the bar alone. Names are `dir="auto"`, scores
 * `dir="ltr"`; the columns mirror under RTL.
 *
 * Generic: it knows no chess — a competitor is anything with a score, and its
 * words arrive as props.
 */
function Bracket({ rounds, ariaLabel, emptyLabel, loading = false, loadingLabel, density = "normal", testId }: BracketProps) {
  const id = useId();
  const dense = density === "dense";

  return (
    <Box
      role="region"
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      tabIndex={0}
      data-testid={testId}
      sx={(theme) => ({
        overflowX: "auto",
        pb: 1,
        "&:focus-visible": { ...theme.mixins.focusRing, outlineOffset: 2 },
      })}
    >
      {loading ? (
        <Box role="status" data-testid={`${testId}-loading`} sx={{ color: "text.secondary", py: 1 }}>
          {loadingLabel}
        </Box>
      ) : rounds.length === 0 ? (
        <Box data-testid={`${testId}-empty`} sx={{ color: "text.secondary", py: 1 }}>
          {emptyLabel}
        </Box>
      ) : (
        <Box sx={{ display: "flex", alignItems: "stretch", gap: 2, width: "max-content" }}>
          {rounds.map((round) => {
            const titleId = `${id}-${round.id}`;
            return (
              <Box key={round.id} data-testid={`${testId}-round-${round.id}`} sx={{ width: COLUMN_WIDTH, display: "flex", flexDirection: "column" }}>
                <Box
                  id={titleId}
                  data-testid={`${testId}-round-${round.id}-title`}
                  sx={{ typography: "subtitle2", fontWeight: 600, mb: 1, flexShrink: 0 }}
                >
                  {round.title}
                </Box>
                <Box
                  component="ul"
                  aria-labelledby={titleId}
                  sx={{ listStyle: "none", m: 0, p: 0, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 1 }}
                >
                  {round.matches.map((match) => (
                    <Box
                      component="li"
                      key={match.id}
                      data-testid={`${testId}-match-${match.id}`}
                      sx={{ position: "relative", border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}
                    >
                      <Box component="span" sx={visuallyHidden}>
                        {match.label}
                      </Box>
                      <Box aria-hidden="true">
                        {match.sides.map((side, index) => (
                          <Box
                            key={side.id}
                            data-testid={`${testId}-match-${match.id}-${side.id}`}
                            data-winner={side.winner ? "true" : undefined}
                            sx={{
                              // The typography first: it carries a weight of its own, which the winner's must override.
                              typography: "body2",
                              display: "flex",
                              alignItems: "baseline",
                              gap: 1,
                              px: 1,
                              py: dense ? 0.25 : 0.5,
                              borderInlineStart: 3,
                              borderInlineStartColor: side.winner ? "primary.main" : "transparent",
                              ...(index === 1 && { borderTop: 1, borderTopColor: "divider" }),
                              fontWeight: side.winner ? 700 : 400,
                            }}
                          >
                            <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {side.prefix !== undefined && (
                                <>
                                  <Box component="bdi" dir="auto" sx={{ color: "text.secondary", fontWeight: 400 }}>
                                    {side.prefix}
                                  </Box>{" "}
                                </>
                              )}
                              <bdi dir="auto">{side.name}</bdi>
                            </Box>
                            <Box component="span" dir="ltr" sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                              {side.score}
                            </Box>
                            {side.detail !== undefined && (
                              <Box component="span" dir="ltr" sx={{ flexShrink: 0, color: "text.secondary", fontWeight: 400, typography: "caption" }}>
                                {side.detail}
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default Bracket;
