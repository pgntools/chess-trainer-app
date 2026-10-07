import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import type { Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { Flag, LabelChip, type SortDirection } from "../../../design-system/components/tables";
import { DataTable, type DataTableColumn, type DataTableSort } from "../../../design-system/patterns/tables";
import type { TournamentPlayer } from "../../../lib/tournament";
import type { Participant } from "../../../lib/tournamentParticipants";
import { flagOfFederation, formatPoints, titleBadgeOf } from "../tournamentTable";
import type { ParticipantsColumn } from "./participantsColumns";

export type ParticipantsTableProps = {
  /** Every participant, in the standings' order (`participantsOf`) — the order `rank` is. */
  participants: readonly Participant[];
  sort: DataTableSort<ParticipantsColumn>;
  onSort: (column: ParticipantsColumn, direction: SortDirection) => void;
  /** Where a player's name leads — their games. Absent, plain text. */
  playerLink?: (player: TournamentPlayer) => LinkTarget | undefined;
  /** A team event: a column naming each player's team. */
  teams?: boolean;
  /** The table's accessible name ("FIDE Candidates 2026 — participants"). */
  ariaLabel: string;
  /** The root; a row is `<testId>-row-<player id, slugged>`. */
  testId: string;
};

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

const rowIdOf = (participant: Participant) => participant.player.id.replace(/[^\p{L}\p{N}]+/gu, "-");

/**
 * **A tournament's players, each one's record** (CTA-142) — the Library's
 * tournament view's Participants tab as a `DataTable`: the standings' rank,
 * the player (the title a chip before the name, the federation a flag after
 * it — the tournament tables' marks, `tournamentTable.ts` — the name a link
 * to their games where `playerLink` gives one), a team event's team, the
 * rating, the points, the games, the wins, draws and losses, and the
 * performance where one could be worked out (a dash where not). Every
 * column sorts from its header; the sort is the screen's.
 */
function ParticipantsTable({ participants, sort, onSort, playerLink, teams = false, ariaLabel, testId }: ParticipantsTableProps) {
  const { t, i18n } = useTranslation();
  const ranks = new Map(participants.map((participant, index) => [participant, index + 1]));
  const words = (id: "rating" | "score" | "games" | "wins" | "draws" | "losses" | "performance") =>
    abbreviated(t(`library.tournament.participants.columns.${id}`), t(`library.tournament.participants.columns.${id}Name`));
  const number = (value: number | undefined) => (value === undefined ? "—" : value.toLocaleString(i18n.language));

  const columns: DataTableColumn<Participant, ParticipantsColumn>[] = [
    {
      id: "rank",
      header: abbreviated(t("tournament.columns.rank"), t("tournament.columns.rankName")),
      sortable: true,
      align: "end",
      render: (participant) => ranks.get(participant),
      sortValue: (participant) => ranks.get(participant),
    },
    {
      id: "player",
      header: t("library.tournament.participants.columns.player"),
      sortable: true,
      render: ({ player }) => {
        const badge = titleBadgeOf(t, player.title);
        const flag = flagOfFederation(player.federation, i18n.language);
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
      sortValue: ({ player }) => player.name,
    },
    ...(teams
      ? [
          {
            id: "team" as const,
            header: t("library.tournament.participants.columns.team"),
            sortable: true,
            dir: "auto" as const,
            render: (participant: Participant) => participant.team ?? "—",
            sortValue: (participant: Participant) => participant.team,
          },
        ]
      : []),
    {
      id: "rating",
      header: words("rating"),
      sortable: true,
      align: "end",
      firstDirection: "desc",
      render: ({ player }) => number(player.rating),
      sortValue: ({ player }) => player.rating,
    },
    {
      id: "score",
      header: words("score"),
      sortable: true,
      align: "end",
      firstDirection: "desc",
      render: (participant) => formatPoints(participant.points),
      sortValue: (participant) => participant.points,
    },
    ...(["games", "wins", "draws", "losses"] as const).map(
      (id): DataTableColumn<Participant, ParticipantsColumn> => ({
        id,
        header: words(id),
        sortable: true,
        align: "end",
        firstDirection: "desc",
        render: (participant) => number(participant[id]),
        sortValue: (participant) => participant[id],
      }),
    ),
    {
      id: "performance",
      header: words("performance"),
      sortable: true,
      align: "end",
      firstDirection: "desc",
      render: (participant) => number(participant.performance),
      sortValue: (participant) => participant.performance,
    },
  ];

  return (
    <DataTable<Participant, ParticipantsColumn>
      columns={columns}
      rows={participants}
      rowId={rowIdOf}
      sort={sort}
      onSort={onSort}
      // Ties keep the standings' order.
      tieBreak={(a, b) => (ranks.get(a) ?? 0) - (ranks.get(b) ?? 0)}
      hint={t("library.tournament.participants.sortHint")}
      rowTestId={(participant) => `${testId}-row-${rowIdOf(participant)}`}
      emptyLabel={t("library.tournament.participants.empty")}
      density="dense"
      ariaLabel={ariaLabel}
      testId={testId}
    />
  );
}

export default ParticipantsTable;
