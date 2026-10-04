import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { TABLE_PAGE_SIZES } from "../../../design-system/components/tables";
import type { TablePaging } from "../../../design-system/patterns/tables";

import { gameTag, type GameHeaders } from "../../../lib/gameModel";
import { readPgnTags, splitPgnGames } from "../../../lib/pgn";
import { slugify } from "../../../lib/pgnText";
import { tournamentOf, type TieBreak, type Tournament } from "../../../lib/tournament";

/** An event's PGN, read for its tags: the games' headers, the event's name, and the slug the embed's ids are made of. */
export type PgnEvent = { headers: GameHeaders[]; event: string | undefined; slug: string };

/**
 * **An event from an article's PGN** (CTA-128) — what every tournament
 * embed draws from: the games' tags alone (`splitPgnGames` → `readPgnTags`,
 * no move replayed), and the event's name, the first `Event` tag. A PGN with
 * no game in it is an error.
 */
export const pgnEventOf = (pgn: string): PgnEvent | { error: string } => {
  try {
    const headers = splitPgnGames(pgn).map(readPgnTags);
    if (headers.length === 0) return { error: "no game in the PGN" };
    const event = headers.map((game) => gameTag(game, "Event")).find((name) => name !== undefined);
    return { headers, event, slug: slugify(event ?? "") || "tournament" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * **Where an embed's PGN comes from** (CTA-128): `pgn`, the text itself
 * (`import games from "./event.pgn?raw"`, in the article's own chunk) — or
 * `load`, a function that imports it (`load={() => import("./olym26.pgn?raw")}`),
 * so a large file is a chunk of its own, fetched when the table shows, and
 * the article opens at once. `pgn` wins.
 */
export type PgnSourceProps = {
  pgn?: string;
  load?: () => Promise<string | { default: string }>;
};

/** A source's text: `text`, or why there is none (`error`) — neither while `load` is under way. */
export type PgnText = { text?: string; error?: string };

/** {@link PgnSourceProps} as text. `load` is called once, on mount — a new function on a later render is not a new file. */
export const usePgnSource = ({ pgn, load }: PgnSourceProps): PgnText => {
  const loadOnMount = useRef(load);
  const [loaded, setLoaded] = useState<PgnText>({});
  useEffect(() => {
    const loader = loadOnMount.current;
    if (pgn !== undefined || loader === undefined) return;
    let live = true;
    loader().then(
      (module) => live && setLoaded({ text: typeof module === "string" ? module : module.default }),
      (error: unknown) => live && setLoaded({ error: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      live = false;
    };
  }, [pgn]);
  if (pgn !== undefined) return { text: pgn };
  if (load === undefined) return { error: "no pgn and nothing to load" };
  return loaded;
};

/**
 * What an embed made of its PGN: the event and its `made` (a tournament, a
 * knockout, a match) — or why it has none, or that its file is still loading.
 */
export type PgnMade<T> =
  | { made: T; event: string | undefined; slug: string; error?: undefined; loading?: undefined }
  | { error: string; made?: undefined; loading?: undefined }
  | { loading: true; made?: undefined; error?: undefined };

/**
 * {@link pgnEventOf} over a source's text, then `make` over its headers —
 * read again only when the text or `make` changes, so pass a stable `make` (a
 * module-level function, or a `useCallback`). `make` answering `undefined` is
 * an error (`notMade`).
 */
export const usePgnEvent = <T,>(source: PgnText, make: (headers: GameHeaders[]) => T | undefined, notMade = "not this kind of event"): PgnMade<T> => {
  const { text, error } = source;
  return useMemo(() => {
    if (error !== undefined) return { error };
    if (text === undefined) return { loading: true };
    const read = pgnEventOf(text);
    if ("error" in read) return { error: read.error };
    const made = make(read.headers);
    return made === undefined ? { error: notMade } : { made, event: read.event, slug: read.slug };
  }, [text, error, make, notMade]);
};

/** A tournament read from a PGN of its games — the Swiss standings' and the crosstable's. */
export type PgnTournament = PgnMade<Tournament>;

/** {@link usePgnEvent} for `tournamentOf`, ranked by `tieBreaks`. */
export const usePgnTournament = (source: PgnText, tieBreaks: readonly TieBreak[]): PgnTournament =>
  usePgnEvent(
    source,
    useCallback((headers: GameHeaders[]) => tournamentOf(headers, tieBreaks), [tieBreaks]),
  );

/**
 * **An embed's paging** (CTA-128) — `rowsPerPage` from the document
 * (`<SwissStandingsTable pgn={games} rowsPerPage="25" />`): absent, or not a
 * page size the pager offers (`TABLE_PAGE_SIZES`: 25, 50, 100, 250), no
 * paging; else the page, held here, starting at the first.
 */
export const useEmbedPaging = (rowsPerPage: number | string | undefined): TablePaging | undefined => {
  const { t } = useTranslation();
  const asked = rowsPerPage === undefined || rowsPerPage === "" ? Number.NaN : Number(rowsPerPage);
  const size = TABLE_PAGE_SIZES.includes(asked) ? asked : undefined;
  const [state, setState] = useState({ page: 0, rowsPerPage: size ?? 25 });
  if (size === undefined) return undefined;
  return {
    ...state,
    onPageChange: (page) => setState((old) => ({ ...old, page })),
    onRowsPerPageChange: (rows) => setState({ page: 0, rowsPerPage: rows }),
    labelRowsPerPage: t("tournament.rowsPerPage"),
  };
};
