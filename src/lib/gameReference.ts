import { analysisCasesSnapshot, findAnalysisCaseGame, loadAnalysisCases } from "./analysisCaseStore";
import { findCatalogGame, type CatalogGame } from "./gameCatalog";
import {
  findLibraryGame,
  libraryReferencePathOf,
  libraryReferenceRead,
  loadLibraryReferenceGames,
} from "./libraryGameCatalog";
import { loadPlayedGames, playedGamesCatalog, playedGamesSnapshot } from "./playedGameStore";

/**
 * **A stored game, by reference**: `<key>/<path>/<id>` — what an article's
 * embed (`views/home/frontPage/`) and the MDX editor read a game by.
 *
 * A game is too big for a URL — a played game carries its side lines, a
 * Case its comments — so what travels is a *reference into a store's
 * catalog* (`lib/gameCatalog.ts`), and the reader looks the game up for
 * itself; one that names nothing resolves to `undefined` and says so.
 *
 * The registry below is the single place a key meets its store, and it has
 * three entries: Analysis V2's Cases (`case/<projectId>/<caseId>`, CTA-192 —
 * the legacy saved analyses' `analysis/saved/<id>` before it), the reader's
 * games against the engine (`lib/playedGames.ts`, CTA-74) and a Library
 * collection's games (`lib/libraryGameCatalog.ts`, `library/<collection>/<n>`,
 * CTA-77). **A line in it is the whole cost of a new producer of games.**
 * (Until CTA-192 a reference crossed to the Analysis Board as `?game=`; a
 * game handed to Analysis now becomes a Case, `useSendToAnalysis`.)
 */

/** The section key Analysis V2's Cases carry (CTA-192): `case/<projectId>/<caseId>`. */
export const CASE_REFERENCE_KEY = "case";

/** The section key Play with Engine's games carry (CTA-74). */
export const PLAY_REFERENCE_KEY = "play";

/** The section key a Library collection's games carry (CTA-77). */
export const LIBRARY_REFERENCE_KEY = "library";

/** The reference to game `number` (1-based) of a Library collection. */
export const libraryGameReference = (collectionId: string, number: number): string =>
  `${LIBRARY_REFERENCE_KEY}/${libraryReferencePathOf(collectionId, number)}`;

/**
 * Which store a reference's first segment names, as the resolver of the rest
 * of it (`<path>/<id>`). *Called* rather than held, because the stores change
 * while the app runs and a game saved a moment ago has to be as referenceable
 * as an old one. Every store here is read asynchronously, and each resolves
 * out of what has been read — so a reader waits for that read
 * (`isReferenceRead` / `loadReferencedGames`) before it resolves a reference.
 * The played games memoise their whole catalog on their snapshot; the Cases
 * parse only the one named.
 */
const catalogsByKey: Record<string, (segments: readonly string[]) => CatalogGame | undefined> = {
  [CASE_REFERENCE_KEY]: findAnalysisCaseGame,
  [PLAY_REFERENCE_KEY]: (segments) => findCatalogGame(segments, playedGamesCatalog()),
  [LIBRARY_REFERENCE_KEY]: findLibraryGame,
};

const referenceSegments = (reference: string): string[] =>
  reference.split("/").filter(Boolean);

/**
 * Whether what a reference names has been read — the Cases and the played
 * games (IndexedDB) and a Library collection's games are read
 * asynchronously. Anything else is ready at once.
 */
export const isReferenceRead = (reference: string | null | undefined): boolean => {
  if (reference === null || reference === undefined) return true;
  const [sectionKey, ...rest] = referenceSegments(reference);
  if (sectionKey === CASE_REFERENCE_KEY) return analysisCasesSnapshot() !== undefined;
  if (sectionKey === PLAY_REFERENCE_KEY) return playedGamesSnapshot() !== undefined;
  return sectionKey !== LIBRARY_REFERENCE_KEY || libraryReferenceRead(rest);
};

/** Read what a reference names (a no-op for an unknown key). Never rejects. */
export const loadReferencedGames = async (reference: string | null | undefined): Promise<void> => {
  if (reference === null || reference === undefined) return;
  const [sectionKey, ...rest] = referenceSegments(reference);
  if (sectionKey === CASE_REFERENCE_KEY) await loadAnalysisCases();
  if (sectionKey === PLAY_REFERENCE_KEY) await loadPlayedGames();
  if (sectionKey === LIBRARY_REFERENCE_KEY) await loadLibraryReferenceGames(rest);
};

/**
 * The game a reference names, or `undefined` for anything that does not
 * resolve — an unknown key, a path the store does not have, a missing id.
 */
export const resolveGameReference = (
  reference: string | null | undefined,
): CatalogGame | undefined => {
  if (reference === null || reference === undefined) return undefined;

  const [sectionKey, ...rest] = referenceSegments(reference);
  if (sectionKey === undefined || rest.length === 0) return undefined;

  const resolve = catalogsByKey[sectionKey];
  return resolve === undefined ? undefined : resolve(rest);
};
