import { useMemo } from "react";
import { Link as RouterLink, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { LoadingLine, MissState } from "../../design-system/components/states";
import type { GameTree } from "../../lib/gameTree";
import type { LibraryCollection } from "../../lib/libraryCollections";
import { parsePgnTree } from "../../lib/pgn";
import LibraryGameBoard from "./LibraryGameBoard";
import LibraryMiss from "./LibraryMiss";
import { useCollectionGames } from "./useLibraryCollections";

/**
 * The route of one Library game — `/library/<collection>/<game>`, the game its
 * 1-based number: the collection's games resolved (a shipped file's whole PGN
 * fetched on first use, an upload's read from IndexedDB), the game parsed **with its side lines** (`parsePgnTree` — `chess.js`
 * `loadPgn` would drop them), then the board. A number the collection does not
 * have is the miss; a game that will not parse says so, with the way back.
 *
 * The board is keyed by collection and number, so the previous / next game
 * mounts a fresh session rather than re-seeding one — every arrival option of
 * the core is read on its first render only.
 */
function LibraryGameScreen() {
  const { collectionId, game } = useParams();
  const { t } = useTranslation();
  const state = useCollectionGames(collectionId);
  const summary = state.status === "ready" ? state.summary : undefined;
  const games = state.status === "ready" ? state.value : undefined;
  const collection = useMemo(
    (): LibraryCollection | undefined =>
      summary === undefined || games === undefined
        ? undefined
        : { id: summary.id, name: summary.name, source: summary.source, addedAt: summary.addedAt, games },
    [summary, games],
  );

  const number = /^\d+$/.test(game ?? "") ? Number(game) : NaN;
  const pgn = collection !== undefined && number >= 1 ? collection.games[number - 1] : undefined;
  const tree = useMemo((): GameTree | null | undefined => {
    if (pgn === undefined) return undefined;
    try {
      return parsePgnTree(pgn);
    } catch {
      return null;
    }
  }, [pgn]);

  if (state.status === "loading") {
    return <LoadingLine testId="library-loading">{t("library.table.loading")}</LoadingLine>;
  }
  if (collection === undefined) return <LibraryMiss what="collection" />;
  if (tree === undefined) return <LibraryMiss what="game" />;
  if (tree === null) {
    return (
      <MissState
        backLabel={t("library.game.back", { name: collection.name })}
        backLink={{ component: RouterLink, to: `/library/${encodeURIComponent(collection.id)}` }}
        testId="library-game-unreadable"
      >
        {t("library.game.unreadable")}
      </MissState>
    );
  }
  return (
    <LibraryGameBoard
      key={`${collection.id}/${number}`}
      collection={collection}
      number={number}
      tree={tree}
    />
  );
}

export default LibraryGameScreen;
