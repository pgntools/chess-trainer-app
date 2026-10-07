import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Link as RouterLink, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { PlayedGamesFilters, playedGameSideFilterOf } from "../../../blocks/forms";
import {
  PLAYED_GAMES_COLUMNS,
  PLAYED_GAMES_DEFAULT_SORT,
  PlayedGamesTable,
  playedGamesFirstDirection,
} from "../../../blocks/tables";
import { DeleteManyDialog } from "../../../design-system/components/dialogs";
import { useTableUrlState } from "../../../design-system/components/tables";
import { ListScreenHeader } from "../../../design-system/components/toolbars";
import { PLAY_REFERENCE_KEY } from "../../../lib/gameReference";
import { mainline } from "../../../lib/gameTree";
import { openingOfLine } from "../../../lib/openings";
import { removePlayedGame } from "../../../lib/playedGameStore";
import {
  PLAYED_GAMES_PATH,
  playedGameSummary,
  type PlayedGameSummary,
  playedGameToTree,
  type PlayedGameRow,
} from "../../../lib/playedGames";
import { RightPanel } from "../../main/rightPanel";
import { useOpeningBook } from "../../shared/useOpeningBook";
import NewGameForm from "./NewGameForm";
import { usePlayedGames } from "./usePlayedGames";
import { useOwnPageHeading } from "../../main/pageTitle";

/**
 * How the engine's side is named in the table (CTA-153): the default engine
 * keeps its wording, "Stockfish level N"; another is named — "Stockfish 19
 * Lite level N", or, where its strength was an Elo, "Stockfish 19 Lite Elo
 * 1800". The words are the app's, the engine's name the build's own.
 */
const engineLabelOf = (t: TFunction, summary: PlayedGameSummary): string =>
  summary.engineName === undefined
    ? t("playedGames.engine", { level: summary.skillLevel })
    : summary.strength === "elo"
      ? t("playedGames.engineElo", { name: summary.engineName, elo: summary.engineElo })
      : t("playedGames.engineNamed", { name: summary.engineName, level: summary.skillLevel });

/**
 * **The Lobby** (`/engine/games`; the Saved games list of CTA-74, a lobby
 * since CTA-82) — the board square holds the games, the right-hand panel the
 * new-game form (`NewGameForm.tsx`), whose Start button is how Play with
 * Engine is reached.
 *
 * Since CTA-109 the screen is a composition of the design system and its
 * blocks, and holds only the state:
 *
 * - **`ListScreenHeader`** — the title, the count ("Games: N", or "N of M"
 *   under a filter) and, once rows are picked, **Delete picked (N)**, which
 *   asks first (`DeleteManyDialog`, the contained red confirm) and removes them
 *   all. The picks are the screen's, not the URL's — a link carries the
 *   filter, not a hand-made selection.
 * - **`PlayedGamesTable`** (`blocks/tables/`) — the games of Play with Engine
 *   and Masked Pieces as a `DataTable`: sortable, paginated, a pick per row
 *   with select-all in the header, the always-visible **Analysis** and
 *   **Continue** row actions, an unreadable record's row saying so. Its sort
 *   and page are the URL's (`useTableUrlState`: `?sort=`, `?dir=`, `?page=`,
 *   `?rows=`, history replace, only what differs from the default), opening
 *   **Date-descending**; the page sizes are the design system's one set,
 *   25 / 50 / 100 / 250, 50 by default — an older `?rows=10` link reads as
 *   the default, and a `?page=` past the end as the last page.
 * - **`PlayedGamesFilters`** (`blocks/forms/`) in the table's filters slot:
 *   the side the reader played (`?color=`) and the opening each game reached
 *   (`?opening=` — the deepest eco.json names along its mainline,
 *   `openingOfLine`). The ~3 MB book loads lazily (`useOpeningBook`); until it
 *   lands the opening filter is off, the table not narrowed by it and the
 *   Opening cells empty. A new filter or sort starts at the first page.
 *
 * The rows are built here from each record's summary — the reader's side
 * the localized "Human", the engine's "Stockfish level N" (an engine other
 * than the default is named, CTA-153), its Elo the
 * strength slider's estimate — and the table sorts them by `lib`'s own rule.
 */
function PlayedGames() {
  // The list header's title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const { t } = useTranslation();
  const games = usePlayedGames();
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [searchParams] = useSearchParams();
  const side = playedGameSideFilterOf(searchParams.get("color"));
  const openingParam = searchParams.get("opening");

  // Each record read once per change of the store: whether it parses, and its summary.
  const parsed = useMemo(
    () =>
      (games ?? []).map((saved) => {
        const tree = playedGameToTree(saved);
        return { saved, tree, readable: tree !== undefined, summary: playedGameSummary(saved, tree) };
      }),
    [games],
  );

  const book = useOpeningBook();
  /* The opening each game reached, by id — one walk per game, once the book lands. */
  const openings = useMemo(() => {
    const found = new Map<string, string>();
    if (book === null) return found;
    for (const { saved, tree } of parsed) {
      if (tree === undefined) continue;
      const opening = openingOfLine(
        book.book,
        book.positions,
        mainline(tree).map((node) => node.fen),
      );
      if (opening !== undefined) found.set(saved.id, opening.name);
    }
    return found;
  }, [parsed, book]);
  /* The openings on offer: those the list holds, by name. */
  const openingChoices = useMemo(
    () => [...new Set(openings.values())].sort((a, b) => a.localeCompare(b)),
    [openings],
  );
  // Only once the book has landed: until then the table is not narrowed by opening.
  const opening = book !== null && openingParam !== null ? openingParam : null;

  /** The table's rows — the summaries with their words on, the filters applied. The table sorts them. */
  const shown = useMemo<PlayedGameRow[]>(
    () =>
      parsed
        .filter(({ summary }) => side === "all" || summary.playAs === side)
        .filter(({ saved }) => opening === null || openings.get(saved.id) === opening)
        .map(({ saved, readable, summary }) => ({
          id: saved.id,
          white: summary.whiteName === "human" ? t("playedGames.human") : engineLabelOf(t, summary),
          whiteElo: summary.whiteElo,
          black: summary.blackName === "human" ? t("playedGames.human") : engineLabelOf(t, summary),
          blackElo: summary.blackElo,
          result: summary.result,
          opening: openings.get(saved.id),
          moves: summary.moves,
          variations: summary.variations,
          masked: summary.masked,
          savedAt: saved.savedAt,
          readable,
        })),
    [parsed, openings, side, opening, t],
  );

  const table = useTableUrlState({
    columns: PLAYED_GAMES_COLUMNS,
    defaultSort: PLAYED_GAMES_DEFAULT_SORT,
    firstDirection: playedGamesFirstDirection,
    count: shown.length,
  });

  const filtered = side !== "all" || opening !== null;

  return (
    <>
      <Box
        data-testid="played-games-screen"
        sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <ListScreenHeader
          title={t("playedGames.title")}
          count={
            // The count keeps the id the Lobby's tests have always read it by.
            <span data-testid="played-games-count">
              {games === undefined
                ? ""
                : filtered
                  ? t("playedGames.countFiltered", { shown: shown.length, count: games.length })
                  : t("playedGames.count", { count: games.length })}
            </span>
          }
          actions={
            picked.size > 0 ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
                onClick={() => setDeleting(true)}
                data-testid="played-games-delete-picked"
              >
                {t("playedGames.deletePicked", { count: picked.size })}
              </Button>
            ) : undefined
          }
          testId="played-games-header"
        />
        <PlayedGamesTable
          rows={shown}
          sort={{ column: table.sort, direction: table.direction }}
          onSort={table.sortBy}
          paging={{
            page: table.page,
            rowsPerPage: table.rowsPerPage,
            onPageChange: table.setPage,
            onRowsPerPageChange: table.setRowsPerPage,
          }}
          picked={picked}
          onPickedChange={setPicked}
          analysisLink={(row) => ({
            component: RouterLink,
            // The `?game=` reference `lib/gameReference.ts` resolves against the store's catalog.
            to: `/tools/analysis?game=${encodeURIComponent(`${PLAY_REFERENCE_KEY}/${PLAYED_GAMES_PATH}/${row.id}`)}`,
          })}
          continueLink={(row) => ({
            component: RouterLink,
            // A masked game continues where it was begun, in the same disguise.
            to: `${row.masked ? "/engine/masked" : "/engine/play"}?saved=${encodeURIComponent(row.id)}`,
          })}
          loading={games === undefined}
          filtered={filtered}
          filters={
            <PlayedGamesFilters
              side={side}
              onSideChange={(next) => table.setParams({ color: next === "all" ? null : next })}
              opening={opening}
              onOpeningChange={(next) => table.setParams({ opening: next })}
              openings={openingChoices}
              openingsLoading={book === null}
              testId="played-games"
            />
          }
          testId="played-games"
        />
      </Box>

      <RightPanel>
        <NewGameForm />
      </RightPanel>

      <DeleteManyDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          // The rows are gone, so the picks go with them.
          for (const id of picked) void removePlayedGame(id);
          setPicked(new Set());
          setDeleting(false);
        }}
        title={t("playedGames.confirmDelete.title", { count: picked.size })}
        message={t("playedGames.confirmDelete.body", { count: picked.size })}
        confirmLabel={t("playedGames.confirmDelete.confirm")}
        cancelLabel={t("playedGames.confirmDelete.cancel")}
        testId="played-games-delete-dialog"
        confirmTestId="played-games-delete-confirm"
      />
    </>
  );
}

export default PlayedGames;
