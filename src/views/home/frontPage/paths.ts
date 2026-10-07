/**
 * **The addresses the front page's components take** (CTA-126) — an app path,
 * as the address bar shows it, so an author copies it straight off the
 * screen: `/library/<collection>/<n>` for a Library game,
 * `/repertoires/<id>` for a repertoire, `/library/<collection>` for a
 * collection. The leading slash, and a trailing one, are optional. Anything
 * else reads as `undefined`, which the component shows as "not here". Pure.
 */

const segmentsOf = (path: string): string[] =>
  path
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split("/");

/** `/library/<collection>/<n>` → the collection and the 1-based game number. */
export const libraryGamePathOf = (path: string): { collectionId: string; number: number } | undefined => {
  const parts = segmentsOf(path);
  if (parts.length !== 3 || parts[0] !== "library" || parts[1] === "" || !/^\d+$/.test(parts[2])) return undefined;
  const number = Number(parts[2]);
  return number >= 1 ? { collectionId: parts[1], number } : undefined;
};

/** `/library/<collection>` → the collection's id. */
export const collectionPathOf = (path: string): string | undefined => {
  const parts = segmentsOf(path);
  return parts.length === 2 && parts[0] === "library" && parts[1] !== "" ? parts[1] : undefined;
};

/** `/repertoires/<id>` → the repertoire's id. */
export const repertoirePathOf = (path: string): string | undefined => {
  const parts = segmentsOf(path);
  return parts.length === 2 && parts[0] === "repertoires" && parts[1] !== "" ? parts[1] : undefined;
};
