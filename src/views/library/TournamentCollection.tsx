import { useCallback, useMemo, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { Link as RouterLink, useLocation, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { TournamentInfo, type TournamentFacts } from "../../blocks/cards";
import { suggestionReasonOf } from "../../blocks/forms";
import { TeamRosters, type TeamRoster } from "../../blocks/lists";
import { TopPlayers } from "../../blocks/panels";
import { PARTICIPANTS_DEFAULT_SORT, ParticipantsTable, type ParticipantsColumn } from "../../blocks/tables";
import { InlineAlert } from "../../design-system/components/feedback";
import type { LinkTarget } from "../../design-system/components/link";
import { BackButton } from "../../design-system/components/navigation";
import { LoadingLine } from "../../design-system/components/states";
import { PanelTabs, tabPanelProps } from "../../design-system/components/tabs";
import { IconAction, ListScreenHeader } from "../../design-system/components/toolbars";
import type { DataTableSort } from "../../design-system/patterns/tables";
import { gameTag, type GameHeaders } from "../../lib/gameModel";
import {
  collectionMetadataOf,
  sharedEventOf,
  tableFormatOfKind,
  type CollectionRow,
  type CollectionSummary,
  type TournamentFormat,
} from "../../lib/libraryCollections";
import { teamPlayersOf, teamTournamentOf } from "../../lib/teamTournament";
import { roundPartsOf, type TournamentPlayer } from "../../lib/tournament";
import { guessTournamentKind } from "../../lib/tournamentKind";
import { participantsOf, topPlayersOf } from "../../lib/tournamentParticipants";
import { EmbedSource, type SourceRead } from "../home/frontPage/embedSource";
import { KnockoutView, StandingsView, TeamStandingsView } from "../home/frontPage/tournamentEmbedViews";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { HideRightPanel, RightPanel } from "../main/rightPanel";
import { tournamentTabOf, TOURNAMENT_TABS, type TournamentTab } from "./tournamentTabs";

/**
 * **A tournament collection** (`/library/<collection>`, CTA-142) — a
 * collection that reads as a tournament (`isTournamentCollection`: its mark
 * on, its games sharing one `Event`) opens here instead of on its games
 * table: one header (the name, the `h1`), and three tabs —
 *
 * - **Info** (the default): the event at a glance (`TournamentInfo`) and the
 *   tournament's table for the type it is marked as — the Blog's own
 *   Library-backed views over the same reader (`<EmbedSource>`,
 *   `tournamentEmbedViews.tsx`), a name linking to the Games tab filtered by
 *   that player, a result to the game on the Library's board. Games that do
 *   not read as the type say so, with the type they look like
 *   (`guessTournamentKind`). No right-hand panel: the tab spans its room
 *   (`HideRightPanel`), the left edge and the height those of the other tabs.
 * - **Participants**: every player's record (`ParticipantsTable`,
 *   `participantsOf`) — each name a link to the Games tab filtered by that
 *   player — and, in the right-hand panel, the statistics (the standouts,
 *   `TopPlayers`) and a team event's teams, a line each with its players
 *   (`TeamRosters`).
 * - **Games**: the collection's games table, exactly as an unmarked
 *   collection's (`CollectionTable` — its filters' panel, picks, Analyse,
 *   its URL state), the strip under its header.
 *
 * **The tab is the URL's** (`?tab=info|participants|games`), so a tab is a
 * link and Back from a game returns to it. Absent, Info — unless the URL
 * carries the games table's own state (a `?player=` link from a Blog table,
 * a filter, a sort), which opens Games.
 *
 * The Info and Participants tabs read the collection's **games** (their own
 * tags — titles, FIDE ids, teams — which the index does not keep); the
 * Games tab reads the rows alone, as ever.
 */

const TABS_ID = "library-tournament";

/** The strip, and what makes the region under it its tab's panel. */
export type TournamentTabs = { strip: ReactNode; panel: ReturnType<typeof tabPanelProps> };

/** The tab strip — each tab a link to the same URL with its `?tab=`. */
function useTournamentTabs(active: TournamentTab): TournamentTabs {
  const { t } = useTranslation();
  const location = useLocation();
  const to = (tab: TournamentTab) => {
    const next = new URLSearchParams(location.search);
    next.set("tab", tab);
    return `${location.pathname}?${next.toString()}`;
  };
  return {
    strip: (
      <PanelTabs
        tabs={TOURNAMENT_TABS.map((id) => ({
          id,
          label: t(`library.tournament.tabs.${id}`),
          link: { component: RouterLink, to: to(id) },
        }))}
        value={active}
        fullWidth={false}
        ariaLabel={t("library.tournament.tabs.label")}
        idPrefix={TABS_ID}
        testId="library-tournament-tabs"
      />
    ),
    panel: tabPanelProps(TABS_ID, active),
  };
}

/** The Games tab, filtered by these players. */
const gamesOfPlayers = (collectionId: string, names: readonly string[]): LinkTarget => ({
  component: RouterLink,
  to: `/library/${encodeURIComponent(collectionId)}?tab=games&${names.map((name) => `player=${encodeURIComponent(name)}`).join("&")}`,
});

/** A Library read whose player links open the Games tab (the Blog's open the table, which here is that tab). */
const useTabbedRead = (read: SourceRead, collectionId: string): SourceRead => {
  const toPlayers = useCallback((names: readonly string[]) => gamesOfPlayers(collectionId, names), [collectionId]);
  return useMemo(
    () => (read.status === "ready" && read.library !== undefined ? { ...read, library: { ...read.library, toPlayers } } : read),
    [read, toPlayers],
  );
};

/** The tournament's table for its type — the Blog's Library-backed views. */
function TournamentTable({ read, type }: { read: SourceRead; type: TournamentFormat }) {
  const { t } = useTranslation();
  switch (type) {
    case "swiss":
    case "roundRobin":
    case "match":
      return <StandingsView read={read} format={type} rowsPerPage={50} />;
    case "knockout":
    case "teamKnockout":
      return <KnockoutView read={read} />;
    case "doubleElimination":
      return <KnockoutView read={read} losersFromRound={51} word="doubleElimination" />;
    case "teamSwiss":
      return <TeamStandingsView read={read} rowsPerPage={50} />;
    case "arena":
      return (
        <InlineAlert severity="info" testId="library-tournament-no-table">
          {t("library.tournament.table.noTable", { type: t("library.settings.formats.arena") })}
        </InlineAlert>
      );
  }
}

/** The event's facts — from the rows at once, the games' own tags (the site, the teams) once read. */
const factsOf = (summary: CollectionSummary, rows: readonly CollectionRow[], headers: readonly GameHeaders[] | undefined): TournamentFacts => {
  const metadata = collectionMetadataOf(rows);
  const rounds = new Set(rows.map((row) => roundPartsOf(row.round)[0]).filter((round) => round !== undefined));
  const sites = new Set(headers?.map((game) => gameTag(game, "Site")));
  const [site] = sites;
  const type = summary.tournament?.type ?? "swiss";
  const teams = headers === undefined || (type !== "teamSwiss" && type !== "teamKnockout") ? undefined : teamPlayersOf(headers).size;
  return {
    type,
    event: sharedEventOf(rows),
    ...(sites.size === 1 && site !== undefined && { site }),
    ...(metadata.dates !== undefined && { dates: metadata.dates }),
    rounds: rounds.size,
    players: metadata.players,
    ...(teams !== undefined && teams > 0 && { teams }),
    games: rows.length,
    unfinished: rows.filter((row) => row.result === "*").length,
  };
};

/** Said over the table when the games do not read as the type they are marked as — with the type they look like. */
function Misfit({ collection, headers, type }: { collection: CollectionSummary; headers: readonly GameHeaders[]; type: TournamentFormat }) {
  const { t } = useTranslation();
  const location = useLocation();
  const guess = useMemo(() => guessTournamentKind(headers), [headers]);
  if (guess === undefined || tableFormatOfKind(guess.kind) === type) return null;
  const words = {
    type: t(`library.settings.formats.${type}`),
    guess: t(`library.settings.formats.${tableFormatOfKind(guess.kind)}`),
    reason: suggestionReasonOf(t, guess),
  };
  return (
    <InlineAlert
      severity="info"
      testId="library-tournament-misfit"
      action={
        collection.source === "uploaded" ? (
          <Link
            component={RouterLink}
            to={`/library/${encodeURIComponent(collection.id)}/settings`}
            state={{ from: `${location.pathname}${location.search}` }}
            data-testid="library-tournament-change-type"
            sx={{ alignSelf: "center", whiteSpace: "nowrap" }}
          >
            {t("library.tournament.table.changeType")}
          </Link>
        ) : undefined
      }
    >
      {t("library.tournament.table.misfitSuggest", words)}
    </InlineAlert>
  );
}

function InfoTab({ collection, rows, read }: { collection: CollectionSummary; rows: readonly CollectionRow[]; read: SourceRead }) {
  const { t } = useTranslation();
  const type = collection.tournament?.type ?? "swiss";
  const headers = read.status === "ready" ? read.headers : undefined;
  const facts = useMemo(() => factsOf(collection, rows, headers), [collection, rows, headers]);
  /*
    Centred, and as wide as the room allows: the event card beside the table
    where both fit, the table under it where they do not — each centred, the
    table its own width (a crosstable is no wider than its columns) and
    scrolling sideways past the screen's. Logical throughout, so it mirrors.
  */
  return (
    <Box
      data-testid="library-tournament-info-layout"
      sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", gap: 2, pb: 2 }}
    >
      <Box sx={{ flex: "0 1 22rem", minWidth: 0, maxWidth: "100%" }}>
        <TournamentInfo facts={facts} description={collection.description} testId="library-tournament-info" />
      </Box>
      <Box
        component="section"
        aria-labelledby="library-tournament-table-title"
        data-testid="library-tournament-table-section"
        sx={{ flex: "0 1 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 1, minWidth: "min(100%, 20rem)", maxWidth: "100%" }}
      >
        <Typography id="library-tournament-table-title" variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {t("library.tournament.table.title")}
        </Typography>
        {headers !== undefined && <Misfit collection={collection} headers={headers} type={type} />}
        <TournamentTable read={read} type={type} />
      </Box>
    </Box>
  );
}

const TEAM_TYPES: readonly TournamentFormat[] = ["teamSwiss", "teamKnockout"];

/** Where the collection comes from — the Library's note under a collection's panel. */
function SourceNote({ collection }: { collection: CollectionSummary }) {
  const { t } = useTranslation();
  return (
    <Typography variant="body2" data-testid="library-table-note" sx={{ color: "text.secondary" }}>
      {t(collection.source === "shipped" ? "library.table.shippedNote" : "library.table.uploadedNote")}
    </Typography>
  );
}

function ParticipantsTab({ collection, read }: { collection: CollectionSummary; read: SourceRead }) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<DataTableSort<ParticipantsColumn>>(PARTICIPANTS_DEFAULT_SORT);
  const headers = read.status === "ready" ? read.headers : undefined;
  const team = TEAM_TYPES.includes(collection.tournament?.type ?? "swiss");
  const participants = useMemo(() => (headers === undefined ? undefined : participantsOf(headers)), [headers]);
  const top = useMemo(() => (participants === undefined ? undefined : topPlayersOf(participants)), [participants]);
  const rosters = useMemo((): TeamRoster[] | undefined => {
    if (!team || headers === undefined) return undefined;
    const players = teamPlayersOf(headers);
    return teamTournamentOf(headers).standings.map(({ team: name, federation, matchPoints, boardPoints }) => ({
      team: name,
      ...(federation !== undefined && { federation }),
      matchPoints,
      boardPoints,
      players: players.get(name) ?? [],
    }));
  }, [team, headers]);
  const toPlayer = useCallback((player: TournamentPlayer) => gamesOfPlayers(collection.id, [player.name]), [collection.id]);

  // The right-hand panel: the statistics (the standouts), a team event's teams, then the shipped / uploaded note.
  const panel = (
    <RightPanel>
      {/* The aside does not scroll; the panel is its own scrolling column. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", alignContent: "start", gap: 3 }}>
        {top !== undefined && <TopPlayers top={top} playerLink={toPlayer} testId="library-tournament-top" />}
        {rosters !== undefined && rosters.length > 0 && (
          <TeamRosters
            teams={rosters}
            playerLink={(name) => gamesOfPlayers(collection.id, [name])}
            teamLink={(roster) => gamesOfPlayers(collection.id, roster.players)}
            testId="library-tournament-teams"
          />
        )}
        <SourceNote collection={collection} />
      </Box>
    </RightPanel>
  );
  if (read.status === "loading") {
    return (
      <>
        <LoadingLine testId="library-tournament-participants-loading">{t("library.tournament.table.loading")}</LoadingLine>
        {panel}
      </>
    );
  }
  if (read.status !== "ready" || participants === undefined || top === undefined) {
    return (
      <>
        <InlineAlert severity="warning" testId="library-tournament-participants-unreadable">
          {t("library.tournament.table.unreadable")}
        </InlineAlert>
        {panel}
      </>
    );
  }
  return (
    <Box sx={{ display: "grid", gap: 2, alignContent: "start", minWidth: 0 }}>
      {panel}
      <Box component="section" aria-labelledby="library-tournament-players-title" sx={{ display: "grid", gap: 1, minWidth: 0 }}>
        <Typography id="library-tournament-players-title" variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {t("library.tournament.participants.players")}
        </Typography>
        <ParticipantsTable
          participants={participants}
          sort={sort}
          onSort={(column, direction) => setSort({ column, direction })}
          playerLink={toPlayer}
          teams={team}
          ariaLabel={`${read.event ?? collection.name} — ${t("library.tournament.participants.title")}`}
          testId="library-tournament-participants"
        />
      </Box>
    </Box>
  );
}

/** The Info and Participants tabs over the read games — the links made to open the Games tab. */
function TabContent({ tab, collection, rows, read }: { tab: "info" | "participants"; collection: CollectionSummary; rows: readonly CollectionRow[]; read: SourceRead }) {
  const tabbed = useTabbedRead(read, collection.id);
  return tab === "info" ? <InfoTab collection={collection} rows={rows} read={tabbed} /> : <ParticipantsTab collection={collection} read={tabbed} />;
}

/** The Info and Participants tabs: the header, the strip, the tab's content scrolling under it. */
function TournamentOverview({
  collection,
  rows,
  tab,
  tabs,
}: {
  collection: CollectionSummary;
  rows: readonly CollectionRow[];
  tab: "info" | "participants";
  tabs: TournamentTabs;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  // The collection's name is the page's `h1`, and its title (CTA-112).
  useOwnPageHeading();
  usePageTitle(collection.name);
  return (
    <>
      <Box data-testid="library-tournament-screen" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          title={<span data-testid="library-table-name">{collection.name}</span>}
          titleDir="auto"
          count={<span data-testid="library-table-count">{t("library.games", { count: rows.length })}</span>}
          back={<BackButton label={t("library.table.back")} link={{ component: RouterLink, to: "/library" }} testId="library-table-back" />}
          actions={
            collection.source === "uploaded" ? (
              <IconAction
                label={t("library.table.settings")}
                link={{
                  component: RouterLink,
                  to: `/library/${encodeURIComponent(collection.id)}/settings`,
                  state: { from: `${location.pathname}${location.search}` },
                }}
                testId="library-table-settings"
              >
                <SettingsRoundedIcon fontSize="small" />
              </IconAction>
            ) : undefined
          }
          testId="library-table-header"
        />
        {tabs.strip}
        <Box {...tabs.panel} data-testid={`library-tournament-panel-${tab}`} sx={{ flex: 1, minHeight: 0, overflowY: "auto", pt: 2 }}>
          <EmbedSource src={`/library/${collection.id}`}>
            {(read) => <TabContent tab={tab} collection={collection} rows={rows} read={read} />}
          </EmbedSource>
        </Box>
      </Box>
      {/* Info spans the right-hand panel's room (the same left edge and height, the panel's width added); Participants fills the panel itself. */}
      {tab === "info" && <HideRightPanel />}
    </>
  );
}

/**
 * **The tournament view** — the tab the URL names: Info or Participants
 * drawn here, Games handed to `games` (the collection's games table, with
 * the strip to show under its header and the panel's attributes for the
 * region under it).
 */
export function TournamentCollection({
  collection,
  rows,
  games,
}: {
  collection: CollectionSummary;
  rows: readonly CollectionRow[];
  games: (tabs: TournamentTabs) => ReactNode;
}) {
  const [params] = useSearchParams();
  const tab = tournamentTabOf(params);
  const tabs = useTournamentTabs(tab);
  if (tab === "games") return <>{games(tabs)}</>;
  return <TournamentOverview key={tab} collection={collection} rows={rows} tab={tab} tabs={tabs} />;
}
