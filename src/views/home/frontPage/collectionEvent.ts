import { useCallback, useMemo } from "react";
import { Link as RouterLink, useLocation } from "react-router";

import type { LinkTarget } from "../../../design-system/components/link";
import { gameTag } from "../../../lib/gameModel";
import { readPgnTags } from "../../../lib/pgn";
import { slugify } from "../../../lib/pgnText";
import { useCollectionGames } from "../../library/useLibraryCollections";
import { collectionPathOf } from "./paths";

/**
 * **An event from a Library collection** (CTA-128) — what every
 * `<Collection…Table>` / `<Collection…Bracket>` embed reads: the collection
 * `_id` names (`/library/<collection>`), its games' tags (`readPgnTags`, no
 * move replayed), the event's name (the first `Event` tag, else the
 * collection's), and the two links its tables make:
 *
 * - `toPlayers(names)` — the collection's table filtered by those players
 *   (`?player=`, repeated: the Library keeps a game any of them played). One
 *   name for a player; a team's players for a team, since the Library
 *   filters by player, not by team.
 * - `toGame(game)` — the game (its index in the collection) on the Library's
 *   board, whose back button returns to the article.
 *
 * `missing` is a collection this browser's Library does not hold (or an
 * `_id` that is no collection's address); `headers` is `undefined` while the
 * games are read. `testId` is `tournament-collection-<collection>`, each
 * embed adding its own table's word to it.
 */
export const useCollectionEvent = (_id: string) => {
  const location = useLocation();
  const collectionId = collectionPathOf(_id);
  const state = useCollectionGames(collectionId);
  const games = state.status === "ready" ? state.value : undefined;
  const headers = useMemo(() => games?.map(readPgnTags), [games]);
  const event =
    state.status === "ready" ? (headers?.map((game) => gameTag(game, "Event")).find((name) => name !== undefined) ?? state.summary.name) : undefined;

  const from = `${location.pathname}${location.search}`;
  const toPlayers = useCallback(
    (names: readonly string[]): LinkTarget => ({
      component: RouterLink,
      to: `/library/${collectionId}?${names.map((name) => `player=${encodeURIComponent(name)}`).join("&")}`,
    }),
    [collectionId],
  );
  const toGame = useCallback(
    (game: number): LinkTarget => ({ component: RouterLink, to: `/library/${collectionId}/${game + 1}`, state: { from } }),
    [collectionId, from],
  );

  return {
    collectionId,
    state,
    headers,
    event,
    missing: collectionId === undefined || state.status === "missing",
    testId: `tournament-collection-${slugify(collectionId ?? "") || "collection"}`,
    toPlayers,
    toGame,
  };
};
