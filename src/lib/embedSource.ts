/**
 * **Where an article's component reads its games from** (CTA-140) — one
 * address for every resource the app keeps, so one component draws a PGN
 * of the article's own, a Library collection or one game of it, an
 * Analysis case, a game played against the engine, or a repertoire alike, and
 * only its `src` changes.
 *
 * An address is the **app path** the resource's own screen has, as the
 * address bar shows it — copied from there, host, base and language prefix
 * and all, and read back to its canonical path:
 *
 * | Address | What it names |
 * | --- | --- |
 * | `/library/<collection>` | a Library collection — its games |
 * | `/library/<collection>/<n>` | one game of it |
 * | `/analysis/projects/<project>/cases/<case>` | an Analysis case (CTA-192) |
 * | `/engine/play?saved=<id>` | a game played against the engine |
 * | `/repertoires/<id>` | a repertoire |
 *
 * Pure: the stores are read by the embeds (`views/home/frontPage/embedSource.tsx`).
 */

export type SourceAddress =
  | { kind: "collection"; collection: string }
  | { kind: "libraryGame"; collection: string; number: number }
  | { kind: "case"; projectId: string; caseId: string }
  | { kind: "playedGame"; id: string }
  | { kind: "repertoire"; id: string };

export type SourceKind = SourceAddress["kind"];

/** One segment, read back from the URL. */
const decoded = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/** The screens an address can start at — whatever comes before the first (a host, the base, `/he`) is not the address. */
const SCREENS = /\/(library|repertoires|analysis\/projects|engine\/play)(?=[/?#]|$)/;

/**
 * The address a text names — `undefined` for anything that is not one (a
 * PGN's text, a mistyped path). Tolerant of what comes before the screen's
 * path and of a trailing slash; a whole PGN is never read as an address.
 */
export const sourceAddressOf = (text: string): SourceAddress | undefined => {
  const trimmed = text.trim();
  if (trimmed === "" || /\s/.test(trimmed) || trimmed.includes("[")) return undefined;
  const start = SCREENS.exec(trimmed);
  if (start === null) return undefined;
  const url = new URL(trimmed.slice(start.index), "https://app.invalid");
  const parts = url.pathname.split("/").filter(Boolean).map(decoded);
  if (parts[0] === "library") {
    if (parts.length === 2) return { kind: "collection", collection: parts[1] };
    if (parts.length === 3 && /^\d+$/.test(parts[2]) && Number(parts[2]) >= 1) return { kind: "libraryGame", collection: parts[1], number: Number(parts[2]) };
    return undefined;
  }
  if (parts[0] === "repertoires") return parts.length === 2 ? { kind: "repertoire", id: parts[1] } : undefined;
  if (parts[0] === "analysis" && parts[1] === "projects" && parts[3] === "cases" && parts.length === 5) {
    return { kind: "case", projectId: parts[2], caseId: parts[4] };
  }
  if (parts[0] === "engine" && parts[1] === "play" && parts.length === 2) {
    const saved = url.searchParams.get("saved");
    return saved === null || saved === "" ? undefined : { kind: "playedGame", id: saved };
  }
  return undefined;
};

/** An address's canonical path — what an article is written with. */
export const sourcePathOf = (address: SourceAddress): string => {
  switch (address.kind) {
    case "collection":
      return `/library/${encodeURIComponent(address.collection)}`;
    case "libraryGame":
      return `/library/${encodeURIComponent(address.collection)}/${address.number}`;
    case "case":
      return `/analysis/projects/${encodeURIComponent(address.projectId)}/cases/${encodeURIComponent(address.caseId)}`;
    case "playedGame":
      return `/engine/play?saved=${encodeURIComponent(address.id)}`;
    case "repertoire":
      return `/repertoires/${encodeURIComponent(address.id)}`;
  }
};

/** The reference (`lib/gameReference.ts`) of an address that names one stored game — `undefined` for a collection or a repertoire. */
export const gameReferenceOf = (address: SourceAddress): string | undefined => {
  switch (address.kind) {
    case "libraryGame":
      return `library/${address.collection}/${address.number}`;
    case "case":
      return `case/${address.projectId}/${address.caseId}`;
    case "playedGame":
      return `play/games/${address.id}`;
    default:
      return undefined;
  }
};

/**
 * Whether only this browser has what an address names — the reader's own
 * Cases, played games, repertoires and uploaded collections. An article
 * that names one shows "not in this browser" to every other reader, the
 * published site included; a shipped collection is there for everyone.
 */
export const isBrowserOnly = (address: SourceAddress, isShipped: (collection: string) => boolean): boolean =>
  address.kind === "collection" || address.kind === "libraryGame" ? !isShipped(address.collection) : true;
