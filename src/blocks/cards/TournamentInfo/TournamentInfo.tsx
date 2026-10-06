import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { KeyValueList, type KeyValueRow } from "../../../design-system/components/lists";
import type { TournamentFormat } from "../../../lib/libraryCollections";

/** What is known of a tournament's event, from its games' tags (CTA-142). */
export type TournamentFacts = {
  /** The format it is marked as. */
  type: TournamentFormat;
  /** The `Event` its games share. */
  event?: string;
  /** The `Site` its games share. */
  site?: string;
  /** The first and last `Date`, as the games write them (`2026.03.28`, `2026`). */
  dates?: { first: string; last: string };
  /** How many rounds its games number. */
  rounds?: number;
  players: number;
  /** A team event's teams. */
  teams?: number;
  games: number;
  /** Games still `*`. */
  unfinished: number;
};

export type TournamentInfoProps = {
  facts: TournamentFacts;
  /** The reader's own description of the collection, when there is one. */
  description?: string;
  /** The card's heading level — `h2` under a page's `h1`. */
  headingLevel?: "h2" | "h3";
  /** The root; its facts are `<testId>-facts-<id>`, the description `-description`. */
  testId: string;
};

/**
 * **A tournament's event at a glance** (CTA-142) — the Library's tournament
 * view's Info tab: the reader's description, then the facts its games give
 * (the type it is marked as, the event, the site, the dates, the rounds and
 * the counts) as a description list, a fact the tags do not give left out.
 * Presentational: the facts arrive worked out (`lib/libraryCollections.ts`'s
 * metadata, the tournament readers); its words are the Library's
 * (`library.tournament.info.*`).
 */
function TournamentInfo({ facts, description, headingLevel = "h2", testId }: TournamentInfoProps) {
  const { t, i18n } = useTranslation();
  const count = (value: number) => value.toLocaleString(i18n.language);
  const dates =
    facts.dates === undefined ? undefined : facts.dates.first === facts.dates.last ? facts.dates.first : `${facts.dates.first} – ${facts.dates.last}`;
  const rows: KeyValueRow[] = [
    { id: "type", label: t("library.tournament.info.type"), value: t(`library.settings.formats.${facts.type}`) },
    ...(facts.event === undefined ? [] : [{ id: "event", label: t("library.tournament.info.event"), value: facts.event, dir: "auto" as const }]),
    ...(facts.site === undefined ? [] : [{ id: "site", label: t("library.tournament.info.site"), value: facts.site, dir: "auto" as const }]),
    ...(dates === undefined ? [] : [{ id: "dates", label: t("library.tournament.info.dates"), value: dates, dir: "ltr" as const }]),
    ...(facts.rounds === undefined || facts.rounds === 0
      ? []
      : [{ id: "rounds", label: t("library.tournament.info.rounds"), value: count(facts.rounds) }]),
    ...(facts.teams === undefined ? [] : [{ id: "teams", label: t("library.tournament.info.teams"), value: count(facts.teams) }]),
    { id: "players", label: t("library.tournament.info.players"), value: count(facts.players) },
    {
      id: "games",
      label: t("library.tournament.info.games"),
      value:
        facts.unfinished === 0
          ? count(facts.games)
          : `${count(facts.games)} (${t("library.tournament.info.unfinished", { count: facts.unfinished })})`,
    },
  ];
  return (
    <Box
      component="section"
      aria-labelledby={`${testId}-title`}
      data-testid={testId}
      sx={{ display: "grid", gap: 1, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
    >
      <Typography id={`${testId}-title`} variant="subtitle1" component={headingLevel} sx={{ fontWeight: 700 }}>
        {t("library.tournament.info.title")}
      </Typography>
      {description !== undefined && (
        <Typography variant="body2" dir="auto" data-testid={`${testId}-description`} sx={{ whiteSpace: "pre-line" }}>
          {description}
        </Typography>
      )}
      <KeyValueList rows={rows} testId={`${testId}-facts`} />
    </Box>
  );
}

export default TournamentInfo;
