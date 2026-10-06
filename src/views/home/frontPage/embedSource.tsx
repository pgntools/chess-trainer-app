import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link as RouterLink, useLocation } from "react-router";

import type { LinkTarget } from "../../../design-system/components/link";
import { sourceAddressOf, gameReferenceOf, type SourceAddress } from "../../../lib/embedSource";
import { gameTag, type GameHeaders } from "../../../lib/gameModel";
import { isAnalysisReference, isReferenceRead, loadReferencedGames, resolveGameReference } from "../../../lib/gameReference";
import type { CollectionSummary } from "../../../lib/libraryCollections";
import { readPgnTags, splitPgnGames } from "../../../lib/pgn";
import { slugify } from "../../../lib/pgnText";
import { loadSavedAnalyses, savedAnalysesSnapshot } from "../../../lib/savedAnalysisStore";
import { useCollectionGames } from "../../library/useLibraryCollections";
import { useSavedRepertoires } from "../../repertoires/useSavedRepertoires";
import { usePgnSource, type PgnSourceProps } from "./pgnTournament";

/**
 * **Where an embed's games come from** (CTA-140) — one reader for every
 * source, so a component is written once and only its `src` changes:
 *
 * - `pgn={games}` (or `src={games}`) — a PGN of the article's own, its text;
 *   `load` — one imported as a chunk of its own;
 * - `src="<app path>"` — anything the app keeps, by the path its screen has
 *   (`lib/embedSource.ts`): a Library collection or one game of it, a saved
 *   analysis, a game played against the engine, a repertoire.
 *
 * `<EmbedSource>` reads it and hands its children one {@link SourceRead}:
 * the games (each its PGN) and their tags, the event's name, and — for a
 * Library source — the links into the Library a table makes of a player or
 * a game. A reader per kind of source is a component of its own, so each
 * calls only its own hooks (the Library's needs the router; a PGN does not).
 */

/** A Library source's links: a player's games in the collection's table, a game on the Library's board. */
export type LibrarySource = {
  collectionId: string;
  summary: CollectionSummary;
  /** The collection's table filtered by these players (`?player=`, repeated). */
  toPlayers: (names: readonly string[]) => LinkTarget;
  /** A game — its index among the source's games — on the Library's board, its back button returning here. */
  toGame: (index: number) => LinkTarget;
};

export type SourceRead =
  /** `collectionId`: a Library source's — what its tables' ids are made of from the start. */
  | { status: "loading"; collectionId?: string }
  /** Nothing answers to the address in this browser — `detail` the address. */
  | { status: "missing"; detail: string; collectionId?: string }
  | { status: "unreadable"; error: string }
  | {
      status: "ready";
      games: readonly string[];
      headers: readonly GameHeaders[];
      /** The first `Event` tag, else the record's own name. */
      event: string | undefined;
      /** The event, slugified — what a PGN source's test ids are made of. */
      slug: string;
      /** Present for a Library source: its links. */
      library?: LibrarySource;
    };

export type EmbedSourceProps = PgnSourceProps & {
  /** An app path (`/library/<c>`, `/tools/analysis?analysis=<id>`, …) — or a PGN's text. */
  src?: string;
};

type ReaderProps = { children: (read: SourceRead) => ReactNode };

/** The games as a ready read — their tags, and the event they name, else `fallback`. */
const useReady = (games: readonly string[] | undefined, fallback: string | undefined, library?: LibrarySource): SourceRead | undefined =>
  useMemo(() => {
    if (games === undefined) return undefined;
    const headers = games.map(readPgnTags);
    const event = headers.map((game) => gameTag(game, "Event")).find((name) => name !== undefined) ?? fallback;
    return { status: "ready", games, headers, event, slug: slugify(event ?? "") || "tournament", library };
  }, [games, fallback, library]);

/** A PGN's text — written in, or loaded. */
function PgnReader({ pgn, load, children }: PgnSourceProps & ReaderProps) {
  const { text, error } = usePgnSource({ pgn, load });
  const split = useMemo((): { games: readonly string[] } | { error: string } | undefined => {
    if (error !== undefined) return { error };
    if (text === undefined) return undefined;
    try {
      const games = splitPgnGames(text);
      return games.length === 0 ? { error: "no game in the PGN" } : { games };
    } catch (caught) {
      return { error: caught instanceof Error ? caught.message : String(caught) };
    }
  }, [text, error]);
  const ready = useReady(split !== undefined && "games" in split ? split.games : undefined, undefined);
  if (split === undefined) return children({ status: "loading" });
  if ("error" in split) return children({ status: "unreadable", error: split.error });
  return children(ready ?? { status: "loading" });
}

/** A Library collection's games — or one game of it — with the links its tables make. */
function CollectionReader({ collection, number, detail, children }: { collection: string; number?: number; detail: string } & ReaderProps) {
  const location = useLocation();
  const state = useCollectionGames(collection);
  const from = `${location.pathname}${location.search}`;
  const toPlayers = useCallback(
    (names: readonly string[]): LinkTarget => ({
      component: RouterLink,
      to: `/library/${collection}?${names.map((name) => `player=${encodeURIComponent(name)}`).join("&")}`,
    }),
    [collection],
  );
  const toGame = useCallback(
    // A game's place in the collection: its index among the source's games — after `number` where the source is one game of it.
    (index: number): LinkTarget => ({ component: RouterLink, to: `/library/${collection}/${(number ?? 1) + index}`, state: { from } }),
    [collection, number, from],
  );
  const summary = state.status === "ready" ? state.summary : undefined;
  const library = useMemo(() => (summary === undefined ? undefined : { collectionId: collection, summary, toPlayers, toGame }), [collection, summary, toPlayers, toGame]);
  const games = useMemo(() => {
    if (state.status !== "ready") return undefined;
    if (number === undefined) return state.value;
    const game = state.value[number - 1];
    return game === undefined ? null : [game];
  }, [state, number]);
  const ready = useReady(games ?? undefined, summary?.name, library);
  if (state.status === "missing" || games === null) return children({ status: "missing", detail, collectionId: collection });
  return children(ready ?? { status: "loading", collectionId: collection });
}

/** Whether what a stored game's reference names has been read. */
const isRead = (reference: string) => (!isAnalysisReference(reference) || savedAnalysesSnapshot() !== undefined) && isReferenceRead(reference);

/** A stored game — a saved analysis, a played game, or a Library game by its reference. */
function StoredGameReader({ reference, detail, children }: { reference: string; detail: string } & ReaderProps) {
  const [readReference, setReadReference] = useState<string | null>(() => (isRead(reference) ? reference : null));
  const ready = readReference === reference;
  useEffect(() => {
    if (ready) return;
    let live = true;
    void Promise.all([isAnalysisReference(reference) ? loadSavedAnalyses() : undefined, loadReferencedGames(reference)]).then(() => {
      if (live) setReadReference(reference);
    });
    return () => {
      live = false;
    };
  }, [ready, reference]);
  const game = ready ? resolveGameReference(reference) : undefined;
  const games = useMemo(() => (game === undefined ? undefined : [game.pgn]), [game]);
  const read = useReady(games, game?.name);
  if (!ready) return children({ status: "loading" });
  if (game === undefined) return children({ status: "missing", detail });
  return children(read ?? { status: "loading" });
}

/** A repertoire — its tree, one game of side lines. */
function RepertoireReader({ id, detail, children }: { id: string; detail: string } & ReaderProps) {
  const repertoires = useSavedRepertoires();
  const saved = repertoires?.find((candidate) => candidate.id === id);
  const games = useMemo(() => (saved === undefined ? undefined : [saved.pgn]), [saved]);
  const read = useReady(games, saved?.name.trim() || undefined);
  if (repertoires === undefined) return children({ status: "loading" });
  if (saved === undefined) return children({ status: "missing", detail });
  return children(read ?? { status: "loading" });
}

/** The reader for an address. */
function AddressReader({ address, detail, children }: { address: SourceAddress; detail: string } & ReaderProps) {
  if (address.kind === "collection") return <CollectionReader collection={address.collection} detail={detail}>{children}</CollectionReader>;
  if (address.kind === "libraryGame") {
    return (
      <CollectionReader collection={address.collection} number={address.number} detail={detail}>
        {children}
      </CollectionReader>
    );
  }
  if (address.kind === "repertoire") return <RepertoireReader id={address.id} detail={detail}>{children}</RepertoireReader>;
  return <StoredGameReader reference={gameReferenceOf(address) ?? ""} detail={detail}>{children}</StoredGameReader>;
}

/** Whether a `src` is meant as an address — a path, or a link — rather than a PGN's text. */
const looksLikeAddress = (src: string) => /^\s*(?:\/|https?:)/.test(src) && !src.includes("[");

/**
 * **The source, read** — `children` called with what it comes to. `src`
 * wins over `pgn`; an address that names nothing the app keeps is
 * `missing`, a PGN that holds no game `unreadable`.
 */
export function EmbedSource({ src, pgn, load, children }: EmbedSourceProps & ReaderProps) {
  if (src !== undefined && looksLikeAddress(src)) {
    const address = sourceAddressOf(src);
    if (address === undefined) return <>{children({ status: "missing", detail: src })}</>;
    return (
      <AddressReader address={address} detail={src}>
        {children}
      </AddressReader>
    );
  }
  return (
    <PgnReader pgn={src ?? pgn} load={load}>
      {children}
    </PgnReader>
  );
}
