import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import type { Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { Flag, LabelChip } from "../../../design-system/components/tables";
import { flagOfFederation, formatPoints, titleBadgeOf } from "../../tables/tournamentTable";

/** A team's player (CTA-164) — their name, and their FIDE title where the games name one. */
export type TeamMember = {
  name: string;
  /** Their title ("GM") — the same chip the Participants table shows, `titleBadgeOf`'s. */
  title?: string;
};

/** A team and who played for it (CTA-142) — `teamTournamentOf`'s standing and `teamPlayersOf`'s names. */
export type TeamRoster = {
  team: string;
  /** Its players' federation, where they all share one. */
  federation?: string;
  matchPoints: number;
  boardPoints: number;
  /** Every member its games give it, in the order the file first shows them. */
  players: readonly TeamMember[];
};

export type TeamRostersProps = {
  /** The teams, in the standings' order. */
  teams: readonly TeamRoster[];
  /** Where a player's name leads — their games. Absent, plain text. */
  playerLink?: (name: string) => LinkTarget | undefined;
  /** Where a team's name leads — all its players' games. Absent, plain text. */
  teamLink?: (team: TeamRoster) => LinkTarget | undefined;
  /** The heading's level — `h2` under a page's `h1`. */
  headingLevel?: "h2" | "h3";
  /** The root; a team is `<testId>-team-<index>`. */
  testId: string;
};

const linkSx = (theme: Theme) => ({ "&:focus-visible": { ...theme.mixins.focusRing, outlineOffset: 1 } });

/**
 * **A team event's teams and their players** (CTA-142) — the Participants
 * tab's right-hand panel for a team Swiss or a team knockout: under one
 * heading, a **line per team** in the standings' order, one on top of the
 * next — its flag where its players share a federation, its name (a link
 * to all its players' games where `teamLink` gives one) and, at the line's
 * end, its match and board points (abbreviated, read in full) — and under
 * it, small, its players, each a link to their games, a titled one's title
 * the same chip before their name as the Participants table shows (CTA-164,
 * `titleBadgeOf`). Narrow enough for a
 * side panel. Presentational: the rosters arrive worked out
 * (`teamTournamentOf`, `teamPlayersOf`).
 */
function TeamRosters({ teams, playerLink, teamLink, headingLevel = "h2", testId }: TeamRostersProps) {
  const { t, i18n } = useTranslation();
  const linked = (target: LinkTarget | undefined, words: string) =>
    target === undefined ? (
      <bdi dir="auto">{words}</bdi>
    ) : (
      <Link {...(linkProps(target) as Record<string, unknown>)} underline="hover" sx={linkSx}>
        <bdi dir="auto">{words}</bdi>
      </Link>
    );
  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 0.5, minWidth: 0 }}>
      <Typography id={`${testId}-title`} variant="subtitle1" component={headingLevel} sx={{ fontWeight: 700 }}>
        {t("library.tournament.participants.teams")}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {teams.map((roster, index) => {
          const flag = flagOfFederation(roster.federation, i18n.language);
          const matchPoints = roster.matchPoints.toLocaleString(i18n.language);
          const boardPoints = formatPoints(roster.boardPoints);
          return (
            <Box
              component="li"
              key={roster.team}
              data-testid={`${testId}-team-${index}`}
              sx={{ py: 0.75, minWidth: 0, borderBottom: "1px solid", borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}
            >
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, minWidth: 0 }}>
                <Typography variant="body2" component="p" sx={{ fontWeight: 600, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                  {flag !== undefined && (
                    <>
                      <Flag code={flag.code} label={flag.label} />{" "}
                    </>
                  )}
                  {linked(teamLink?.(roster), roster.team)}
                </Typography>
                <Typography
                  variant="caption"
                  data-testid={`${testId}-team-${index}-points`}
                  sx={{ flexShrink: 0, color: "text.secondary", whiteSpace: "nowrap", position: "relative" }}
                >
                  <span aria-hidden="true" dir="ltr">
                    {`${matchPoints} ${t("tournament.columns.matchPoints")} · ${boardPoints} ${t("tournament.columns.boardPoints")}`}
                  </span>
                  <Box component="span" sx={visuallyHidden}>
                    {t("library.tournament.participants.teamPoints", { matchPoints, boardPoints })}
                  </Box>
                </Typography>
              </Box>
              <Box
                component="ul"
                aria-label={t("library.tournament.participants.playersOf", { team: roster.team })}
                sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", columnGap: 1, rowGap: 0 }}
              >
                {roster.players.map(({ name, title }) => {
                  const badge = titleBadgeOf(t, title);
                  return (
                    <Typography component="li" variant="caption" key={name}>
                      {badge !== undefined && (
                        <>
                          <LabelChip {...badge} />{" "}
                        </>
                      )}
                      {linked(playerLink?.(name), name)}
                    </Typography>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default TeamRosters;
