import { libraryGameReference } from "../../../lib/gameReference";
import { libraryGamePathOf } from "./paths";
import { StoredGameEmbed } from "./StoredGameEmbed";

/**
 * **A Library game on the front page** (CTA-126) —
 * `<CollectionGameBoard game="/library/<collection>/<n>" startMove="17" />`:
 * the game at that address (the one its own screen has, copied off the
 * address bar), on a board the reader steps through from `startMove`, with a
 * link to open it on the Analysis Board. A shipped collection's game is there
 * for every reader; an upload's only on the device that has it. An address
 * that names no game says so in place of the board.
 *
 * It is `<StoredGameEmbed>` over the game's `?game=` reference.
 */

type CollectionGameBoardProps = {
  /** The game's address: `/library/<collection>/<n>`. */
  game: string;
  /** Where the board opens — `"17"` (after White's 17th move), `"17..."` (after Black's), or a line of SAN. */
  startMove?: string;
  /** Draw the arrows to the next moves. Default on. */
  showNextMoveArrow?: boolean;
};

export function CollectionGameBoard({ game, startMove, showNextMoveArrow }: CollectionGameBoardProps) {
  const path = libraryGamePathOf(game);
  // An address that is not a game's resolves to nothing, and says so.
  const reference = path === undefined ? `library/${game}` : libraryGameReference(path.collectionId, path.number);
  return <StoredGameEmbed reference={reference} startMove={startMove} shownAs={game} showNextMoveArrow={showNextMoveArrow} />;
}
