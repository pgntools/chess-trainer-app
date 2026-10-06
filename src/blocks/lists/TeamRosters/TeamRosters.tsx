import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import type { Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { Flag } from "../../../design-system/components/tables";
import { flagOfFederation, formatPoints } from "../../tables/tournamentTable";

/** A team and who played for it (CTA-142) — `teamTournamentOf`'s standing and `teamPlayersOf`'s names. */
export type TeamRoster = {
  team: string;
  /** Its players' federation, where they all share one. */
  federation?: string;
  matchPoints: number;
  boardPoints: number;
  /** Every name its games give it, in the order the file first shows them. */
  players: readonly string[];
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
 * tab of a team Swiss or a team knockout: under one heading, each team in
 * the standings' order — its flag where its players share a federation, its
 * name (a link to all its players' games where `teamLink` gives one), its
 * match and board points — and its players, each a link to their games.
 * Presentational: the rosters arrive worked out (`teamTournamentOf`,
 * `teamPlayersOf`).
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
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1 }}>
      <Typography id={`${testId}-title`} variant="subtitle1" component={headingLevel} sx={{ fontWeight: 700 }}>
        {t("library.tournament.participants.teams")}
      </Typography>
      <Box
        component="ul"
        sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))" }}
      >
        {teams.map((roster, index) => {
          const flag = flagOfFederation(roster.federation, i18n.language);
          return (
            <Box
              component="li"
              key={roster.team}
              data-testid={`${testId}-team-${index}`}
              sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1, display: "grid", gap: 0.5, minWidth: 0 }}
            >
              <Typography variant="body2" component="p" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                {flag !== undefined && (
                  <>
                    <Flag code={flag.code} label={flag.label} />{" "}
                  </>
                )}
                {linked(teamLink?.(roster), roster.team)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }} data-testid={`${testId}-team-${index}-points`}>
                {t("library.tournament.participants.teamPoints", {
                  matchPoints: roster.matchPoints.toLocaleString(i18n.language),
                  boardPoints: formatPoints(roster.boardPoints),
                })}
                {" · "}
                {t("library.tournament.participants.teamPlayers", { count: roster.players.length })}
              </Typography>
              <Box
                component="ul"
                aria-label={t("library.tournament.participants.players")}
                sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", columnGap: 1.5, rowGap: 0.25 }}
              >
                {roster.players.map((name) => (
                  <Typography component="li" variant="body2" key={name}>
                    {linked(playerLink?.(name), name)}
                  </Typography>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default TeamRosters;
