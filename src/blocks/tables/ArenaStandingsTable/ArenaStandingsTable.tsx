import { Fragment, useMemo, type ReactNode } from "react";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import type { Theme } from "@mui/material/styles";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { Flag, LabelChip } from "../../../design-system/components/tables";
import { ViewToggle } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type TablePaging } from "../../../design-system/patterns/tables";
import { MIN_TARGET_PX } from "../../../design-system/theme";
import { ARENA_SCORINGS, type Arena, type ArenaGame, type ArenaScoring, type ArenaStanding } from "../../../lib/arena";
import { flagOfFederation, formatPoints, titleBadgeOf, type TournamentLinks } from "../tournamentTable";

export type ArenaStandingsTableProps = TournamentLinks & {
  /**
   * The arena — `arenaOf(headers, { scoring })` (`lib/arena.ts`), ranked by
   * its points, then performance. `undefined` while its games are read.
   */
  arena: Arena | undefined;
  /** How it is scored — the switch over the table shows it. */
  scoring: ArenaScoring;
  /** The switch was turned: the caller scores the arena again (`arenaOf`) and hands it back. */
  onScoringChange: (scoring: ArenaScoring) => void;
  /** The table's accessible name — the event's ("Titled Arena June '26 — standings"). */
  ariaLabel: string;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** Cut the rows into pages, the pager under the table. Absent, every row shows. */
  paging?: TablePaging;
  /**
   * The root, and every id under it: `-scoring` (the switch; its buttons
   * `-scoring-lichess`, `-scoring-game`), `-table` (the `DataTable`:
   * `-table-frame`, `-table-loading`, `-table-empty`, `-table-pager`),
   * `-row-<player id, slugged>`, a row's score sheet `-sheet-<player id,
   * slugged>` (its game links `-sheet-<…>-link-<n>`), `-legend` (an entry
   * `-legend-fire`, `-legend-berserk`, `-legend-unfinished`).
   */
  testId: string;
};

type Column = "rank" | "player" | "rating" | "sheet" | "points" | "games" | "performance";

/** A player's id as a test id's part. */
const slugOf = (standing: ArenaStanding) => standing.player.id.replace(/[^\p{L}\p{N}]+/gu, "-");

/** A column's header: an abbreviation in view, its full name read in its place and shown on hover. */
const abbreviated = (header: string, name: string) => (
  <Box component="span" title={name} sx={{ position: "relative" }}>
    <span aria-hidden="true">{header}</span>
    <Box component="span" sx={visuallyHidden}>
      {name}
    </Box>
  </Box>
);

const nameLinkSx = (theme: Theme) => ({ "&:focus-visible": { ...theme.mixins.focusRing, outlineOffset: 1 } });

/** A result's tone — `ResultMark`'s own, each measured as text on every surface. */
const TONES: Readonly<Record<ArenaGame["outcome"], string>> = {
  win: "success.main",
  draw: "text.secondary",
  loss: "error.main",
  unfinished: "text.primary",
};

/** What a game scored, as the sheet writes it: Lichess's points as they are, a game point as `1`, `½`, `0`; `*` unfinished. */
const glyphOf = (game: ArenaGame, scoring: ArenaScoring): string => {
  if (game.outcome === "unfinished") return "*";
  if (scoring === "lichess") return String(game.score);
  return game.score === 0.5 ? "½" : String(game.score);
};

/** A game scored double — a win or a draw on fire (a loss on fire scores nothing, as ever). */
const doubled = (game: ArenaGame) => game.fire && game.score > 0;

/** A total, as the table writes it: Lichess's points whole, game points to one decimal like the Swiss standings. */
const totalOf = (points: number, scoring: ArenaScoring) => (scoring === "lichess" ? String(points) : formatPoints(points));

/** A game's words, read in its mark's place: its number, the colour, the opponent, the result, the score — and what made the score. */
const gameLabelOf = (t: TFunction, game: ArenaGame, number: number, opponent: string, scoring: ArenaScoring): string => {
  const base = t(`tournament.arena.game.${game.color}`, { number, opponent, result: t(`tournament.result.${game.outcome}`) });
  const notes: string[] = [];
  if (game.outcome !== "unfinished") notes.push(t("tournament.arena.notes.scored", { score: glyphOf(game, scoring) }));
  if (scoring === "lichess") {
    if (doubled(game)) notes.push(t("tournament.arena.notes.fire"));
    if (game.berserk) {
      notes.push(
        t(game.berserkScored ? "tournament.arena.notes.berserkScored" : game.outcome === "win" ? "tournament.arena.notes.berserkShort" : "tournament.arena.notes.berserk"),
      );
    }
    if (game.voided !== undefined) notes.push(t(`tournament.arena.notes.${game.voided}`));
  }
  return notes.length === 0 ? base : t("tournament.arena.withNotes", { game: base, notes: notes.join(", ") });
};

/** A mark's look: the score toned by the result — or, scored double, on the theme's warning fill — and a bolt after a berserk game. */
function SheetGlyph({ glyph, outcome, fire, berserk }: { glyph: string; outcome: ArenaGame["outcome"]; fire: boolean; berserk: boolean }) {
  return (
    <Box
      component="span"
      aria-hidden="true"
      dir="ltr"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "1.1em",
        paddingInline: fire ? 0.375 : 0,
        borderRadius: 0.5,
        color: fire ? "warning.contrastText" : TONES[outcome],
        ...(fire && { bgcolor: "warning.main" }),
        ...(outcome === "win" && { fontWeight: 700 }),
      }}
    >
      {glyph}
      {berserk && <BoltRoundedIcon sx={{ fontSize: "0.95em", marginInlineStart: "-0.05em" }} />}
    </Box>
  );
}

/** One game on the sheet: its glyph, its words read in its place — and, where `link` gives one, a link to the game, a 24 px target. */
function SheetMark({ glyph, label, link, testId }: { glyph: ReactNode; label: string; link?: LinkTarget; testId: string }) {
  const mark = (
    <Box component="span" sx={{ position: "relative", whiteSpace: "nowrap" }}>
      {glyph}
      <Box component="span" sx={visuallyHidden}>
        {label}
      </Box>
    </Box>
  );
  if (link === undefined) return mark;
  return (
    <Link
      {...(linkProps(link) as Record<string, unknown>)}
      underline="hover"
      data-testid={testId}
      sx={(theme: Theme) => ({
        ...nameLinkSx(theme),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: MIN_TARGET_PX,
        minHeight: MIN_TARGET_PX,
        verticalAlign: "middle",
      })}
    >
      {mark}
    </Link>
  );
}

/**
 * **An arena's standings** (CTA-204) — Lichess's arena standings as a
 * `DataTable`: a row per player in rank order — the rank, the player (the
 * title a chip before the name, the federation a flag after it, the name a
 * link to their games where `playerLink` gives one; the row's header), the
 * rating, the **score sheet** (every game in the order played, each its
 * score — a link to the game where `gameLink` gives one), the points, the
 * games and the performance.
 *
 * Over it, **the scoring switch** — *Lichess points* (a win 2, a draw 1; on
 * fire after two wins in a row, a win 4 and a draw 2 — those games on the
 * theme's warning fill; a berserk game marked with a bolt, a berserked win
 * one more) or *Game points* (1, ½, 0). The caller scores the arena
 * (`arenaOf`) and keeps the switch's state; the legend under the table
 * explains the marks the sheet shows.
 *
 * Each mark is read by its words ("Game 3, White against msb2: win, scored
 * 5, on fire, berserk, one point more"), never by its colour alone.
 * Presentational: its words are the app's (`tournament.*`).
 */
function ArenaStandingsTable({ arena, scoring, onScoringChange, ariaLabel, density, paging, playerLink, gameLink, testId }: ArenaStandingsTableProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const names = useMemo(() => new Map(arena?.standings.map(({ player }) => [player.id, player.name])), [arena]);
  // The marks follow the arena as scored — the switch may be a render ahead of it.
  const scored = arena?.scoring ?? scoring;

  const columns = useMemo((): DataTableColumn<ArenaStanding, Column>[] => {
    const number = (value: number | undefined) => (value === undefined ? "—" : value.toLocaleString(language));
    return [
      {
        id: "rank",
        header: abbreviated(t("tournament.columns.rank"), t("tournament.columns.rankName")),
        align: "end",
        render: ({ rank }) => rank,
      },
      {
        id: "player",
        header: t("tournament.columns.player"),
        rowHeader: true,
        render: ({ player }) => {
          const badge = titleBadgeOf(t, player.title);
          const flag = flagOfFederation(player.federation, language);
          const link = playerLink?.(player);
          return (
            <>
              {badge !== undefined && (
                <>
                  <LabelChip {...badge} />{" "}
                </>
              )}
              {link === undefined ? (
                <bdi dir="auto">{player.name}</bdi>
              ) : (
                <Link {...(linkProps(link) as Record<string, unknown>)} underline="hover" sx={nameLinkSx}>
                  <bdi dir="auto">{player.name}</bdi>
                </Link>
              )}
              {flag !== undefined && (
                <>
                  {" "}
                  <Flag code={flag.code} label={flag.label} />
                </>
              )}
            </>
          );
        },
      },
      {
        id: "rating",
        header: abbreviated(t("tournament.columns.rating"), t("tournament.columns.ratingName")),
        align: "end",
        render: ({ player }) => number(player.rating),
      },
      {
        id: "sheet",
        header: t("tournament.arena.columns.sheet"),
        wrap: true,
        render: (standing) => {
          const sheetTest = `${testId}-sheet-${slugOf(standing)}`;
          return (
            // Wide enough for a run of marks before it wraps; a space between two marks keeps their words apart.
            <Box component="span" data-testid={sheetTest} sx={{ display: "block", minWidth: "10rem", lineHeight: 1.6 }}>
              {standing.games.map((game, index) => (
                <Fragment key={game.game}>
                  {index > 0 && " "}
                  <SheetMark
                    glyph={<SheetGlyph glyph={glyphOf(game, scored)} outcome={game.outcome} fire={scored === "lichess" && doubled(game)} berserk={scored === "lichess" && game.berserk} />}
                    label={gameLabelOf(t, game, index + 1, names.get(game.opponent) ?? game.opponent, scored)}
                    link={gameLink?.(game.game)}
                    testId={`${sheetTest}-link-${index}`}
                  />
                </Fragment>
              ))}
            </Box>
          );
        },
      },
      {
        id: "points",
        header: abbreviated(t("tournament.columns.points"), t("tournament.columns.pointsName")),
        align: "end",
        render: ({ points }) => (
          <Box component="span" sx={{ fontWeight: 700 }}>
            {totalOf(points, scored)}
          </Box>
        ),
      },
      {
        id: "games",
        header: abbreviated(t("tournament.arena.columns.games"), t("tournament.arena.columns.gamesName")),
        align: "end",
        render: ({ games }) => number(games.length),
      },
      {
        id: "performance",
        header: abbreviated(t("tournament.arena.columns.performance"), t("tournament.arena.columns.performanceName")),
        align: "end",
        render: ({ performance }) => number(performance),
      },
    ];
  }, [t, language, scored, names, playerLink, gameLink, testId]);

  // The legend names only the marks the sheet shows.
  const shows = useMemo(() => {
    const games = arena?.standings.flatMap((standing) => standing.games) ?? [];
    return {
      fire: scored === "lichess" && games.some(doubled),
      berserk: scored === "lichess" && games.some((game) => game.berserk),
      unfinished: games.some((game) => game.outcome === "unfinished"),
    };
  }, [arena, scored]);
  const legend = [
    ...(shows.fire ? [{ id: "fire", sample: <SheetGlyph glyph="4" outcome="win" fire berserk={false} />, words: t("tournament.arena.legend.fire") }] : []),
    ...(shows.berserk ? [{ id: "berserk", sample: <SheetGlyph glyph="3" outcome="win" fire={false} berserk />, words: t("tournament.arena.legend.berserk") }] : []),
    ...(shows.unfinished ? [{ id: "unfinished", sample: <SheetGlyph glyph="*" outcome="unfinished" fire={false} berserk={false} />, words: t("tournament.legend.unfinished") }] : []),
  ];
  const rows = arena?.standings ?? [];

  return (
    <Box data-testid={testId} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
      <DataTable<ArenaStanding, Column>
        columns={columns}
        rows={rows}
        rowId={(standing) => standing.player.id}
        sorted
        rowTestId={(standing) => `${testId}-row-${slugOf(standing)}`}
        toolbar={
          <ViewToggle<ArenaScoring>
            value={scoring}
            onChange={onScoringChange}
            options={ARENA_SCORINGS.map((value) => ({ value, label: t(`tournament.arena.scorings.${value}`) }))}
            ariaLabel={t("tournament.arena.scoring")}
            testId={`${testId}-scoring`}
          />
        }
        paging={paging}
        loading={arena === undefined}
        loadingLabel={t("tournament.loading")}
        emptyLabel={t("tournament.empty")}
        density={density}
        ariaLabel={ariaLabel}
        testId={`${testId}-table`}
      />
      {/* What the marks mean — out of the table's scroll, and only with rows to explain. */}
      {legend.length > 0 && rows.length > 0 && (
        <Box data-testid={`${testId}-legend`} sx={{ flexShrink: 0, display: "flex", flexWrap: "wrap", columnGap: 3, rowGap: 0.5, typography: "caption", color: "text.secondary" }}>
          {legend.map(({ id, sample, words }, index) => (
            <Fragment key={id}>
              {/* A space between two entries keeps their words apart for a screen reader; the flex row ignores it. */}
              {index > 0 && " "}
              <Box component="span" data-testid={`${testId}-legend-${id}`}>
                {sample}
                <span aria-hidden="true"> = </span>
                {words}
              </Box>
            </Fragment>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default ArenaStandingsTable;
