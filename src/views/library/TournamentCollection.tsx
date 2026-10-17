import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";
import LeaderboardOutlinedIcon from "@mui/icons-material/LeaderboardOutlined";
import { Link as RouterLink, useLocation, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { suggestionReasonOf } from "../../blocks/forms";
import { TeamRosters, type TeamRoster } from "../../blocks/lists";
import { TopPlayers } from "../../blocks/panels";
import { ArenaStandingsTable, PARTICIPANTS_DEFAULT_SORT, ParticipantsTable, type ParticipantsColumn } from "../../blocks/tables";
import { InlineAlert } from "../../design-system/components/feedback";
import type { LinkTarget } from "../../design-system/components/link";
import { LoadingLine } from "../../design-system/components/states";
import { PanelTabs, tabPanelProps } from "../../design-system/components/tabs";
import { IconAction, ListScreenHeader } from "../../design-system/components/toolbars";
import type { DataTableSort } from "../../design-system/patterns/tables";
import { arenaOf, pliesOfGames, type ArenaScoring } from "../../lib/arena";
import type { GameHeaders } from "../../lib/gameModel";
import { formatOfKind, type CollectionRow, type CollectionSummary, type TournamentFormat } from "../../lib/libraryCollections";
import { teamPlayersOf, teamTournamentOf } from "../../lib/teamTournament";
import type { TournamentPlayer } from "../../lib/tournament";
import { guessTournamentKind } from "../../lib/tournamentKind";
import { participantsOf, topPlayersOf } from "../../lib/tournamentParticipants";
import { slugify } from "../../lib/pgnText";
import { EmbedSource, type SourceRead } from "../home/frontPage/embedSource";
import { useEmbedPaging } from "../home/frontPage/pgnTournament";
import { KnockoutView, StandingsView, TeamStandingsView } from "../home/frontPage/tournamentEmbedViews";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { HideRightPanel, RightPanel } from "../main/rightPanel";
import { useShellCompact } from "../main/shellCompact";
import { tournamentTabOf, TOURNAMENT_TABS, type TournamentTab } from "./tournamentTabs";

/**
 * **A tournament collection** (`/library/<collection>`, CTA-142) — a
 * collection that reads as a tournament (`isTournamentCollection`: its mark
 * on, its games sharing one `Event`) opens here instead of on its games
 * table: one header (the name, the `h1`; no Back since CTA-229 — the page's
 * left panel's Close is the way back to the Library), and three tabs —
 *
 * - **Info** (the default): the tournament's table for the type it is
 *   marked as — the event's card (`TournamentInfo`) is the page's left
 *   panel's General since CTA-231, so the table has the width — the Blog's own
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
 *   (`TeamRosters`); the panel folds to the shell's rail (CTA-231, as the
 *   games table's filters, CTA-230).
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

/**
 * **An arena's standings** (CTA-204) — the Library's alone (no Blog embed):
 * `arenaOf` over the collection's games, scored as its type says — an Arena
 * in game points, a Lichess arena in Lichess arena points (each game's
 * length counted off its movetext for Lichess's edge cases). 50 rows a page.
 */
function ArenaTable({ read, scoring }: { read: SourceRead; scoring: ArenaScoring }) {
  const { t } = useTranslation();
  const paging = useEmbedPaging(50);
  const headers = read.status === "ready" ? read.headers : undefined;
  const games = read.status === "ready" ? read.games : undefined;
  const library = read.status === "ready" ? read.library : undefined;
  const plies = useMemo(() => (games === undefined ? undefined : pliesOfGames(games)), [games]);
  const arena = useMemo(() => (headers === undefined || plies === undefined ? undefined : arenaOf(headers, { scoring, plies })), [headers, plies, scoring]);
  const toPlayer = useCallback((player: TournamentPlayer) => library?.toPlayers([player.name]), [library]);

  if (read.status === "missing" || read.status === "unreadable") {
    return (
      <InlineAlert severity="warning" testId="library-tournament-arena-unreadable">
        {t("library.tournament.table.unreadable")}
      </InlineAlert>
    );
  }
  const collectionId = read.status === "ready" ? read.library?.collectionId : read.collectionId;
  return (
    <ArenaStandingsTable
      arena={arena}
      ariaLabel={t("tournament.embed.standings", { event: (read.status === "ready" ? read.event : undefined) ?? t("tournament.embed.untitled") })}
      density="dense"
      paging={read.status === "ready" ? paging : undefined}
      playerLink={library === undefined ? undefined : toPlayer}
      gameLink={library?.toGame}
      testId={`tournament-collection-${slugify(collectionId ?? "") || "collection"}-arena`}
    />
  );
}

/** The tournament's table for its type — the Blog's Library-backed views, and the Library's own arena table. */
function TournamentTable({ read, type }: { read: SourceRead; type: TournamentFormat }) {
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
      return <ArenaTable read={read} scoring="game" />;
    case "lichessArena":
      return <ArenaTable read={read} scoring="lichess" />;
  }
}

/** The two arena types (CTA-204): the same pairing, two scorings — either is the reader's choice for the other's games. */
const ARENA_TYPES: readonly TournamentFormat[] = ["arena", "lichessArena"];

/** Said over the table when the games do not read as the type they are marked as — with the type they look like. */
function Misfit({
  collection,
  headers,
  type,
  onOpenSettings,
}: {
  collection: CollectionSummary;
  headers: readonly GameHeaders[];
  type: TournamentFormat;
  onOpenSettings: () => void;
}) {
  const { t } = useTranslation();
  const guess = useMemo(() => guessTournamentKind(headers), [headers]);
  const looksLike = guess === undefined ? undefined : formatOfKind(guess.kind);
  if (guess === undefined || looksLike === type || (looksLike !== undefined && ARENA_TYPES.includes(looksLike) && ARENA_TYPES.includes(type))) return null;
  const words = {
    type: t(`library.settings.formats.${type}`),
    guess: t(`library.settings.formats.${formatOfKind(guess.kind)}`),
    reason: suggestionReasonOf(t, guess),
  };
  return (
    <InlineAlert
      severity="info"
      testId="library-tournament-misfit"
      action={
        collection.source === "uploaded" ? (
          // The collection's settings: the page's left panel's Settings tab (CTA-231, CTA-235).
          <Link
            component="button"
            type="button"
            onClick={onOpenSettings}
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

function InfoTab({ collection, read, onOpenSettings }: { collection: CollectionSummary; read: SourceRead; onOpenSettings: () => void }) {
  const { t } = useTranslation();
  const type = collection.tournament?.type ?? "swiss";
  const headers = read.status === "ready" ? read.headers : undefined;
  /*
    The table alone (CTA-231: the event's card is the left panel's General),
    centred and as wide as the room allows — its own width (a crosstable is
    no wider than its columns), scrolling sideways past the screen's.
  */
  return (
    <Box data-testid="library-tournament-info-layout" sx={{ display: "flex", justifyContent: "center", alignItems: "flex-start", pb: 2 }}>
      <Box
        component="section"
        aria-labelledby="library-tournament-table-title"
        data-testid="library-tournament-table-section"
        sx={{ flex: "0 1 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 1, minWidth: "min(100%, 20rem)", maxWidth: "100%" }}
      >
        <Typography id="library-tournament-table-title" variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {t("library.tournament.table.title")}
        </Typography>
        {headers !== undefined && <Misfit collection={collection} headers={headers} type={type} onOpenSettings={onOpenSettings} />}
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

/** The Participants panel folded to the shell's rail (CTA-231) — the page's state, for this visit only. */
type StatisticsFold = { statisticsFolded: boolean; onStatisticsFoldedChange: (folded: boolean) => void };

function ParticipantsTab({
  collection,
  read,
  statisticsFolded,
  onStatisticsFoldedChange,
}: { collection: CollectionSummary; read: SourceRead } & StatisticsFold) {
  const { t, i18n } = useTranslation();
  // Under the shell's breakpoint the panel is stacked under the table: nothing to fold.
  const compact = useShellCompact();
  const [sort, setSort] = useState<DataTableSort<ParticipantsColumn>>(PARTICIPANTS_DEFAULT_SORT);
  const headers = read.status === "ready" ? read.headers : undefined;
  const team = TEAM_TYPES.includes(collection.tournament?.type ?? "swiss");
  const participants = useMemo(() => (headers === undefined ? undefined : participantsOf(headers)), [headers]);
  const top = useMemo(() => (participants === undefined ? undefined : topPlayersOf(participants)), [participants]);
  const rosters = useMemo((): TeamRoster[] | undefined => {
    if (!team || headers === undefined || participants === undefined) return undefined;
    const players = teamPlayersOf(headers);
    // Each player's title as the participants read it (CTA-164): a tag one game of
    // theirs omits, another gives — the tables' own merging, `tournamentOf`'s.
    const titles = new Map(participants.flatMap(({ player }) => (player.title === undefined ? [] : [[player.name, player.title] as const])));
    return teamTournamentOf(headers).standings.map(({ team: name, federation, matchPoints, boardPoints }) => ({
      team: name,
      ...(federation !== undefined && { federation }),
      matchPoints,
      boardPoints,
      players: (players.get(name) ?? []).map((player) => {
        const title = titles.get(player);
        return { name: player, ...(title !== undefined && { title }) };
      }),
    }));
  }, [team, headers, participants]);
  const toPlayer = useCallback((player: TournamentPlayer) => gamesOfPlayers(collection.id, [player.name]), [collection.id]);

  /*
    Folding the panel (CTA-231, as the games table's filters, CTA-230) takes
    away the button pressed — the panel's Hide, the rail's Show — so the
    focus goes on to the one that undoes it, once the shell has drawn it.
  */
  const focusAfterFold = useRef<string | null>(null);
  const fold = (folded: boolean) => {
    focusAfterFold.current = folded ? "library-tournament-statistics-rail-expand" : "library-tournament-statistics-collapse";
    onStatisticsFoldedChange(folded);
  };
  useEffect(() => {
    const target = focusAfterFold.current;
    if (target === null) return;
    focusAfterFold.current = null;
    document.querySelector<HTMLElement>(`[data-testid="${target}"]`)?.focus();
  }, [statisticsFolded]);
  const collapse = compact ? undefined : (
    <IconAction label={t("library.tournament.participants.collapse")} onClick={() => fold(true)} expanded testId="library-tournament-statistics-collapse">
      {/* Towards the inline end, in the language's direction: the panel is drawn from inside the board's `ForceLTR`. */}
      <KeyboardDoubleArrowRightRoundedIcon fontSize="small" style={i18n.dir() === "rtl" ? { transform: "scaleX(-1)" } : undefined} />
    </IconAction>
  );
  // The standouts' heading carries the Hide; with none to show, it heads the panel alone.
  const standouts = top !== undefined && Object.values(top).some((standout) => standout !== undefined) ? top : undefined;

  // The right-hand panel: the statistics (the standouts), a team event's teams, then the shipped / uploaded note.
  const panel = (
    <RightPanel
      collapsed={statisticsFolded}
      rail={
        // Room above the button, as the collection's filters' rail.
        <Box data-testid="library-tournament-statistics-rail" sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 1 }}>
          <IconAction
            label={t("library.tournament.participants.expand")}
            onClick={() => fold(false)}
            expanded={false}
            testId="library-tournament-statistics-rail-expand"
          >
            <LeaderboardOutlinedIcon fontSize="small" />
          </IconAction>
        </Box>
      }
    >
      {/* The aside does not scroll; the panel is its own scrolling column. */}
      <Box data-testid="library-tournament-statistics" sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", alignContent: "start", gap: 3 }}>
        {standouts !== undefined ? (
          <TopPlayers top={standouts} playerLink={toPlayer} action={collapse} testId="library-tournament-top" />
        ) : (
          collapse !== undefined && <Box sx={{ display: "flex", justifyContent: "flex-end" }}>{collapse}</Box>
        )}
        {rosters !== undefined && rosters.length > 0 && (
          <TeamRosters
            teams={rosters}
            playerLink={(name) => gamesOfPlayers(collection.id, [name])}
            teamLink={(roster) => gamesOfPlayers(collection.id, roster.players.map(({ name }) => name))}
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
function TabContent({
  tab,
  collection,
  read,
  onOpenSettings,
  ...fold
}: { tab: "info" | "participants"; collection: CollectionSummary; read: SourceRead; onOpenSettings: () => void } & StatisticsFold) {
  const tabbed = useTabbedRead(read, collection.id);
  return tab === "info" ? (
    <InfoTab collection={collection} read={tabbed} onOpenSettings={onOpenSettings} />
  ) : (
    <ParticipantsTab collection={collection} read={tabbed} {...fold} />
  );
}

/** The Info and Participants tabs: the header, the strip, the tab's content scrolling under it. */
function TournamentOverview({
  collection,
  rows,
  tab,
  tabs,
  detailsToggle,
  onOpenSettings,
  ...fold
}: {
  collection: CollectionSummary;
  rows: readonly CollectionRow[];
  tab: "info" | "participants";
  tabs: TournamentTabs;
  detailsToggle?: ReactNode;
  onOpenSettings: () => void;
} & StatisticsFold) {
  const { t } = useTranslation();
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
          actions={detailsToggle}
          testId="library-table-header"
        />
        {tabs.strip}
        <Box {...tabs.panel} data-testid={`library-tournament-panel-${tab}`} sx={{ flex: 1, minHeight: 0, overflowY: "auto", pt: 2 }}>
          <EmbedSource src={`/library/${collection.id}`}>
            {(read) => <TabContent tab={tab} collection={collection} read={read} onOpenSettings={onOpenSettings} {...fold} />}
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
  detailsToggle,
  onOpenSettings,
  ...fold
}: {
  collection: CollectionSummary;
  rows: readonly CollectionRow[];
  games: (tabs: TournamentTabs) => ReactNode;
  /** The button opening the page's left panel in a drawer, under the shell's breakpoint (CTA-229) — first among the header's actions. */
  detailsToggle?: ReactNode;
  /** *Change the type*'s (the Info tab's misfit): the page's left panel on Settings (CTA-231, CTA-235). */
  onOpenSettings: () => void;
} & StatisticsFold) {
  const [params] = useSearchParams();
  const tab = tournamentTabOf(params);
  const tabs = useTournamentTabs(tab);
  if (tab === "games") return <>{games(tabs)}</>;
  return (
    <TournamentOverview
      key={tab}
      collection={collection}
      rows={rows}
      tab={tab}
      tabs={tabs}
      detailsToggle={detailsToggle}
      onOpenSettings={onOpenSettings}
      {...fold}
    />
  );
}
