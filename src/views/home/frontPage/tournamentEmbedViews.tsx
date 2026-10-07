import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { KnockoutBracket, MatchTable, RoundRobinCrossTable, SwissStandingsTable, TeamStandingsTable } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import { knockoutOf } from "../../../lib/knockout";
import { matchOf } from "../../../lib/match";
import { teamPlayersOf, teamTournamentOf } from "../../../lib/teamTournament";
import { ROUND_ROBIN_TIE_BREAKS, SWISS_TIE_BREAKS, tournamentOf, type TournamentPlayer } from "../../../lib/tournament";
import { slugify } from "../../../lib/pgnText";
import type { SourceRead } from "./embedSource";
import { useEmbedPaging } from "./pgnTournament";

/**
 * **The tournament tables, drawn from any source** (CTA-140) — what each
 * table embed renders once `<EmbedSource>` has read its games: a PGN of
 * the article's own, a Library collection, any stored game. One view per
 * table; the source decides only two things:
 *
 * - **The links** — a Library source's names and results link into the
 *   Library (`playerLink`, `gameLink`, `teamLink`, each on by default); any
 *   other source has none to make.
 * - **The ids** — a Library source's are `tournament-collection-<c>-<word>`,
 *   any other's the table's own, after its event (`tournament-standings-<slug>`) —
 *   so a page shows one event's table once per source.
 */

/** Where a Library source's table's test ids start — `tournament-collection-<collection>`; `undefined` for any other source (the table's own, by event). */
const libraryTestIdOf = (read: SourceRead): string | undefined => {
  const collectionId = read.status === "ready" ? read.library?.collectionId : read.status === "unreadable" ? undefined : read.collectionId;
  return collectionId === undefined ? undefined : `tournament-collection-${slugify(collectionId) || "collection"}`;
};

type Density = "normal" | "dense";
type Links = { playerLink?: boolean; gameLink?: boolean };

/** A source that is not here: a Library collection this browser lacks, or a reader's own record. */
function Missing({ read, testId }: { read: SourceRead & { status: "missing" }; testId: string }) {
  const { t } = useTranslation();
  return (
    <InlineAlert severity="info" testId={testId} detail={read.detail}>
      {read.collectionId === undefined ? t("tournament.embed.sourceMissing") : t("tournament.embed.collectionMissing")}
    </InlineAlert>
  );
}

/** A PGN with no game in it, or games that are not this kind of event. */
function Unreadable({ testId, detail, words }: { testId: string; detail?: string; words: string }) {
  return (
    <InlineAlert severity="warning" testId={testId} detail={detail}>
      {words}
    </InlineAlert>
  );
}

export type StandingsFormat = "swiss" | "roundRobin" | "match";

/** A table's words: its accessible name's key, its ids' prefix (a PGN source's), its word (a Library source's). */
const STANDINGS: Record<StandingsFormat, { name: "standings" | "crosstable" | "match"; prefix: string }> = {
  swiss: { name: "standings", prefix: "tournament-standings" },
  roundRobin: { name: "crosstable", prefix: "tournament-crosstable" },
  match: { name: "match", prefix: "tournament-match" },
};

/** A Swiss's standings, a round robin's crosstable or a match's table — `<SwissStandingsTable>`, `<RoundRobinCrossTable>`, `<MatchTable>`. */
export function StandingsView({
  read,
  format,
  density,
  rowsPerPage,
  playerLink = true,
  gameLink = true,
}: { read: SourceRead; format: StandingsFormat; density?: Density; rowsPerPage?: number | string } & Links) {
  const { t } = useTranslation();
  const paging = useEmbedPaging(rowsPerPage);
  const library = read.status === "ready" ? read.library : undefined;
  const base = libraryTestIdOf(read);
  const { name, prefix } = STANDINGS[format];
  const toPlayer = useCallback((player: TournamentPlayer) => library?.toPlayers([player.name]), [library]);
  const drawn = useMemo(() => {
    if (read.status !== "ready") return undefined;
    if (format === "match") return { match: matchOf([...read.headers]) };
    return { tournament: tournamentOf([...read.headers], format === "roundRobin" ? ROUND_ROBIN_TIE_BREAKS : SWISS_TIE_BREAKS) };
  }, [read, format]);
  const label = t(`tournament.embed.${name}`, { event: (read.status === "ready" ? read.event : undefined) ?? t("tournament.embed.untitled") });

  if (read.status === "missing") return <Missing read={read} testId={base === undefined ? `${prefix}-missing` : `${base}-missing`} />;
  if (read.status === "unreadable") return <Unreadable testId={`${prefix}-unreadable`} detail={read.error} words={t("tournament.embed.unreadable")} />;
  const links = library === undefined ? {} : { playerLink: playerLink ? toPlayer : undefined, gameLink: gameLink ? library.toGame : undefined };
  const common = { ariaLabel: label, density, ...links };
  if (read.status === "loading" || drawn === undefined) {
    // Still reading: the table's own "reading" state, named until its event is known.
    const testId = base === undefined ? `${prefix}-loading` : `${base}-loading`;
    if (format === "match") return <MatchTable match={undefined} {...common} testId={testId} />;
    if (format === "roundRobin") return <RoundRobinCrossTable tournament={undefined} {...common} testId={testId} />;
    return <SwissStandingsTable tournament={undefined} {...common} testId={testId} />;
  }
  const testId = base === undefined ? `${prefix}-${read.slug}` : `${base}-${format}`;
  if ("match" in drawn) {
    if (drawn.match === undefined) {
      return <Unreadable testId={base === undefined ? `${prefix}-unreadable` : `${base}-unreadable`} detail={read.status === "ready" ? read.event : undefined} words={t("tournament.embed.notAMatch")} />;
    }
    return <MatchTable match={drawn.match} {...common} paging={paging} testId={testId} />;
  }
  return format === "roundRobin" ? (
    <RoundRobinCrossTable tournament={drawn.tournament} {...common} paging={paging} testId={testId} />
  ) : (
    <SwissStandingsTable tournament={drawn.tournament} {...common} paging={paging} testId={testId} />
  );
}

/** A number from MDX, which may arrive as text ("51"). */
const roundOf = (value: number | string | undefined): number | undefined => {
  if (value === undefined || value === "") return undefined;
  const round = Number(value);
  return Number.isInteger(round) && round > 0 ? round : undefined;
};

/** A knockout's bracket — or a double elimination's two, from `losersFromRound` — `<KnockoutBracket>`. `word` is a Library source's ids' word. */
export function KnockoutView({
  read,
  losersFromRound,
  density,
  playerLink = true,
  gameLink = true,
  word = "knockout",
}: { read: SourceRead; losersFromRound?: number | string; density?: Density; word?: "knockout" | "doubleElimination" } & Links) {
  const { t } = useTranslation();
  const library = read.status === "ready" ? read.library : undefined;
  const base = libraryTestIdOf(read);
  const losers = roundOf(losersFromRound);
  const headers = read.status === "ready" ? read.headers : undefined;
  const knockout = useMemo(() => (headers === undefined ? undefined : knockoutOf([...headers], { losersFromRound: losers })), [headers, losers]);
  const teamPlayers = useMemo(() => (knockout?.teams && headers !== undefined ? teamPlayersOf([...headers]) : undefined), [knockout, headers]);
  // A player's own name; a team's every player — the Library filters by player.
  const toCompetitor = useCallback((competitor: TournamentPlayer) => library?.toPlayers(teamPlayers?.get(competitor.id) ?? [competitor.name]), [library, teamPlayers]);
  const label = t("tournament.embed.bracket", { event: (read.status === "ready" ? read.event : undefined) ?? t("tournament.embed.untitled") });

  if (read.status === "missing") return <Missing read={read} testId={base === undefined ? "tournament-bracket-missing" : `${base}-${word}-missing`} />;
  if (read.status === "unreadable" || (read.status === "ready" && knockout === undefined)) {
    return <Unreadable testId="tournament-bracket-unreadable" detail={read.status === "unreadable" ? read.error : undefined} words={t("tournament.embed.unreadable")} />;
  }
  const testId = base !== undefined ? `${base}-${word}` : read.status === "ready" ? `tournament-bracket-${read.slug}` : "tournament-bracket-loading";
  return (
    <KnockoutBracket
      knockout={knockout}
      ariaLabel={label}
      density={density}
      {...(library === undefined ? {} : { playerLink: playerLink ? toCompetitor : undefined, gameLink: gameLink ? library.toGame : undefined })}
      testId={testId}
    />
  );
}

/** A team event's standings — `<TeamStandingsTable>`. */
export function TeamStandingsView({
  read,
  density,
  rowsPerPage,
  teamLink = true,
  gameLink = true,
}: { read: SourceRead; density?: Density; rowsPerPage?: number | string; teamLink?: boolean; gameLink?: boolean }) {
  const { t } = useTranslation();
  const paging = useEmbedPaging(rowsPerPage);
  const library = read.status === "ready" ? read.library : undefined;
  const base = libraryTestIdOf(read);
  const headers = read.status === "ready" ? read.headers : undefined;
  const tournament = useMemo(() => (headers === undefined ? undefined : teamTournamentOf([...headers])), [headers]);
  const players = useMemo(() => (headers === undefined || library === undefined ? undefined : teamPlayersOf([...headers])), [headers, library]);
  const toTeam = useCallback((team: string) => library?.toPlayers(players?.get(team) ?? []), [library, players]);
  const label = t("tournament.embed.standings", { event: (read.status === "ready" ? read.event : undefined) ?? t("tournament.embed.untitled") });

  if (read.status === "missing") return <Missing read={read} testId={base === undefined ? "tournament-team-standings-missing" : `${base}-team-missing`} />;
  if (read.status === "unreadable") return <Unreadable testId="tournament-team-standings-unreadable" detail={read.error} words={t("tournament.embed.unreadable")} />;
  // Games that name no teams: not a team event, said in the table's place.
  if (read.status === "ready" && read.headers.length > 0 && tournament?.games === 0) {
    return <Unreadable testId={base === undefined ? "tournament-team-standings-unreadable" : `${base}-team-unreadable`} detail={read.event} words={t("tournament.embed.notATeamEvent")} />;
  }
  const testId = base !== undefined ? `${base}-team` : read.status === "ready" ? `tournament-team-standings-${read.slug}` : "tournament-team-standings-loading";
  return (
    <TeamStandingsTable
      tournament={tournament}
      ariaLabel={label}
      density={density}
      paging={read.status === "ready" ? paging : undefined}
      {...(library === undefined ? {} : { teamLink: teamLink ? toTeam : undefined, gameLink: gameLink ? library.toGame : undefined })}
      testId={testId}
    />
  );
}
