import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import type { Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { Flag, LabelChip } from "../../../design-system/components/tables";
import type { TournamentPlayer } from "../../../lib/tournament";
import type { Participant, TopPlayers as Standouts } from "../../../lib/tournamentParticipants";
import { flagOfFederation, formatPoints, titleBadgeOf } from "../../tables/tournamentTable";

export type TopPlayersProps = {
  /** The standouts (`topPlayersOf`); one no one reached is left out. */
  top: Standouts;
  /** Where a player's name leads — their games. Absent, plain text. */
  playerLink?: (player: TournamentPlayer) => LinkTarget | undefined;
  /** The heading's level — `h2` under a page's `h1`. */
  headingLevel?: "h2" | "h3";
  /** The root; each standout is `<testId>-<score | performance | wins | unbeaten>`. */
  testId: string;
};

const linkSx = (theme: Theme) => ({ "&:focus-visible": { ...theme.mixins.focusRing, outlineOffset: 1 } });

type Kind = keyof Standouts;
const KINDS: readonly Kind[] = ["score", "performance", "wins", "unbeaten"];

/**
 * **A tournament's standouts** (CTA-142) — the Participants tab's "top
 * players": the best score, the best performance, the most wins and the
 * longest unbeaten run, each a card naming the player (title chip, name —
 * a link to their games where `playerLink` gives one — and flag) and the
 * figure, under one heading. A standout no one reached is left out.
 * Presentational: the standouts arrive worked out (`topPlayersOf`).
 */
function TopPlayers({ top, playerLink, headingLevel = "h2", testId }: TopPlayersProps) {
  const { t, i18n } = useTranslation();
  const figure = (kind: Kind, participant: Participant): string => {
    switch (kind) {
      case "score":
        return t("library.tournament.participants.standouts.scoreValue", { points: formatPoints(participant.points), games: participant.games });
      case "performance":
        return (participant.performance ?? 0).toLocaleString(i18n.language);
      case "wins":
        return t("library.tournament.participants.standouts.winsValue", { count: participant.wins });
      case "unbeaten":
        return t("library.tournament.participants.standouts.unbeatenValue", { count: participant.unbeatenRun });
    }
  };
  const shown = KINDS.filter((kind) => top[kind] !== undefined);
  if (shown.length === 0) return null;
  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 1 }}>
      <Typography id={`${testId}-title`} variant="subtitle1" component={headingLevel} sx={{ fontWeight: 700 }}>
        {t("library.tournament.participants.top")}
      </Typography>
      <Box
        component="ul"
        sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))" }}
      >
        {shown.map((kind) => {
          const participant = top[kind] as Participant;
          const { player } = participant;
          const badge = titleBadgeOf(t, player.title);
          const flag = flagOfFederation(player.federation, i18n.language);
          const link = playerLink?.(player);
          return (
            <Box
              component="li"
              key={kind}
              data-testid={`${testId}-${kind}`}
              sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1, display: "grid", gap: 0.25, minWidth: 0 }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {t(`library.tournament.participants.standouts.${kind}`)}
              </Typography>
              <Typography variant="body2" component="span" sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>
                {badge !== undefined && (
                  <>
                    <LabelChip {...badge} />{" "}
                  </>
                )}
                {link === undefined ? (
                  <bdi dir="auto">{player.name}</bdi>
                ) : (
                  <Link {...(linkProps(link) as Record<string, unknown>)} underline="hover" sx={linkSx}>
                    <bdi dir="auto">{player.name}</bdi>
                  </Link>
                )}
                {flag !== undefined && (
                  <>
                    {" "}
                    <Flag code={flag.code} label={flag.label} />
                  </>
                )}
              </Typography>
              <Typography variant="h6" component="span" data-testid={`${testId}-${kind}-value`}>
                {figure(kind, participant)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default TopPlayers;
