import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import type { Theme } from "@mui/material/styles";

import { visuallyHidden } from "../../../components/a11y";
import type { LinkTarget } from "../../../components/link";
import { Flag, LabelChip } from "../../../components/tables";
import { MIN_TARGET_PX } from "../../../theme";
import { asLink, linkSx } from "../tableLinks";
import type { CompetitorBadge, CompetitorFlag } from "../competitors";

/** One side of a match: who, and what they scored. */
export type BracketSide = {
  /** Unique in its match: the line's test id. */
  id: string;
  /** The competitor's own name — `dir="auto"`. */
  name: string;
  /** A few words before the name, muted — a title. */
  prefix?: string;
  /** A chip before the name — a title (CTA-128). Shown in place of `prefix`. */
  badge?: CompetitorBadge;
  /** A flag after the name — the federation (CTA-128). */
  flag?: CompetitorFlag;
  /** The score, as the caller writes it ("2½"). */
  score: string;
  /** A few muted words after the score — a team's board points, "(8½)". */
  detail?: string;
  /** This side went through: its line is bold and marked. */
  winner?: boolean;
  /** Where the name leads — the side's games, say (CTA-128). The name becomes a link; the rest of the line stays as it is. */
  link?: LinkTarget;
};

/**
 * One of a match's games, as a link under its two lines (CTA-128): a few
 * characters in view (the first side's points, "½") and the words read in
 * their place ("Game 2: Carlsen, Magnus 1, Lazavik, Denis 0").
 */
export type BracketGame = {
  /** Unique in its match: the link's test id. */
  id: string;
  /** What is in view — short. */
  label: string;
  /** The link's accessible name. */
  name: string;
  link: LinkTarget;
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
  /** A few muted words over the box — "Match for third place". Say them in `label` too: the box is read by its label alone. */
  caption?: string;
  /** Its games as links, in a row under its two lines (CTA-128) — a list named by the bracket's `gamesLabel`. */
  games?: readonly BracketGame[];
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
  /** The name of a match's list of games ("Games") — needed only where a match has `games`. */
  gamesLabel?: string;
  /**
   * The root — the scrolling region. The parts: `-round-<round id>` (its
   * title `-round-<round id>-title`), `-match-<match id>` (a side's line
   * `-match-<match id>-<side id>`, its name's link `-…-link`; the games
   * `-match-<match id>-games`, a game's link `-games-<game id>`),
   * `-loading`, `-empty`.
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
 * **Links** (CTA-128), both optional: a side's `link` makes its name a link,
 * and a match's `games` add a row of links under its lines, a list named
 * `gamesLabel`. Only the links are read beside the match's label — the rest
 * of each line stays hidden from a screen reader, which has heard it whole.
 *
 * Generic: it knows no chess — a competitor is anything with a score, and its
 * words arrive as props.
 */
function Bracket({ rounds, ariaLabel, emptyLabel, loading = false, loadingLabel, density = "normal", gamesLabel, testId }: BracketProps) {
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
                      {match.caption !== undefined && (
                        <Box
                          aria-hidden="true"
                          data-testid={`${testId}-match-${match.id}-caption`}
                          sx={{ typography: "caption", color: "text.secondary", px: 1, pt: 0.25 }}
                        >
                          {match.caption}
                        </Box>
                      )}
                      {match.sides.map((side, index) => {
                        // A line with no link is hidden whole; one with a link hides all but it — the label said the rest.
                        const hidden = side.link === undefined ? undefined : ("true" as const);
                        return (
                          <Box
                            key={side.id}
                            aria-hidden={side.link === undefined ? "true" : undefined}
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
                              ...((index === 1 || match.caption !== undefined) && { borderTop: 1, borderTopColor: "divider" }),
                              fontWeight: side.winner ? 700 : 400,
                            }}
                          >
                            <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {side.badge !== undefined ? (
                                <span aria-hidden={hidden}>
                                  <LabelChip {...side.badge} />{" "}
                                </span>
                              ) : (
                                side.prefix !== undefined && (
                                  <span aria-hidden={hidden}>
                                    <Box component="bdi" dir="auto" sx={{ color: "text.secondary", fontWeight: 400 }}>
                                      {side.prefix}
                                    </Box>{" "}
                                  </span>
                                )
                              )}
                              {side.flag?.before === true && (
                                <span aria-hidden={hidden}>
                                  <Flag code={side.flag.code} label={side.flag.label} />{" "}
                                </span>
                              )}
                              {side.link === undefined ? (
                                <bdi dir="auto">{side.name}</bdi>
                              ) : (
                                <Link
                                  {...asLink(side.link)}
                                  underline="hover"
                                  data-testid={`${testId}-match-${match.id}-${side.id}-link`}
                                  sx={linkSx}
                                >
                                  <bdi dir="auto">{side.name}</bdi>
                                </Link>
                              )}
                              {side.flag !== undefined && side.flag.before !== true && (
                                <span aria-hidden={hidden}>
                                  {" "}
                                  <Flag code={side.flag.code} label={side.flag.label} />
                                </span>
                              )}
                            </Box>
                            <Box component="span" aria-hidden={hidden} dir="ltr" sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                              {side.score}
                            </Box>
                            {side.detail !== undefined && (
                              <Box
                                component="span"
                                aria-hidden={hidden}
                                dir="ltr"
                                sx={{ flexShrink: 0, color: "text.secondary", fontWeight: 400, typography: "caption" }}
                              >
                                {side.detail}
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                      {match.games !== undefined && match.games.length > 0 && (
                        <Box
                          component="ul"
                          aria-label={gamesLabel}
                          data-testid={`${testId}-match-${match.id}-games`}
                          sx={{
                            listStyle: "none",
                            m: 0,
                            px: 0.5,
                            py: 0.25,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.25,
                            borderTop: 1,
                            borderTopColor: "divider",
                          }}
                        >
                          {match.games.map((game) => (
                            <li key={game.id}>
                              <Link
                                {...asLink(game.link)}
                                aria-label={game.name}
                                underline="hover"
                                dir="ltr"
                                data-testid={`${testId}-match-${match.id}-games-${game.id}`}
                                sx={(theme: Theme) => ({
                                  ...linkSx(theme),
                                  typography: "caption",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: MIN_TARGET_PX,
                                  minHeight: MIN_TARGET_PX,
                                  px: 0.25,
                                  fontVariantNumeric: "tabular-nums",
                                })}
                              >
                                {game.label}
                              </Link>
                            </li>
                          ))}
                        </Box>
                      )}
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
