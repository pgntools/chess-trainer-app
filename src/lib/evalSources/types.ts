import type { ComponentType } from "react";

import type { PositionResult } from "../computerAnalysis";

/**
 * **An eval source's types** (CTA-196) — what the generic layer
 * (`lib/evalSources/`, [`docs/engine.md`](../../../docs/engine.md) §10) asks
 * of a source of ready-made evaluations, and nothing more. Types only.
 */

/** What a search wants to know about a position: its lines, as deep as asked. */
export type EvalQuery = {
  /** The position — a full FEN, as the engine is asked for it. */
  fen: string;
  /** The search's target depth: an eval shallower than this is no answer. */
  depth: number;
  /** How many lines the search wants (`MultiPV`) — a source answers with at most this many. */
  multiPv: number;
};

/**
 * What a lookup came to: **found** — the position's lines at the asked depth
 * or deeper, line 1 first, each line's moves in UCI as the engine writes them
 * and its score White's view (`Score`); **missing** — not held, or held
 * shallower; **unreachable** — no usable answer (a timeout, a network error, a
 * body it cannot read). A lookup never throws.
 */
export type EvalLookup = { kind: "found"; result: PositionResult } | { kind: "missing" } | { kind: "unreachable" };

/** What a finished engine search is sent with, beside its lines. */
export type EvalRecordMeta = {
  /** The nodes the engine last reported. */
  nodes?: number;
  /** The engine that searched it, as a reader would name it. */
  engine?: string;
};

/**
 * A source's connection at a glance (CTA-199) — the dot on its tab of
 * Settings → Engine: **disabled** (turned off), **not-connected** (on, but not
 * answering — or not checked yet), **connected** (on and answering).
 */
export type EvalSourceConnection = "disabled" | "not-connected" | "connected";

/** How a source tells its connection — read, followed, checked once, and switched on or off. */
export type EvalSourceConnectionState = {
  /** The connection now — the same value until it changes (`useSyncExternalStore`). */
  read(): EvalSourceConnection;
  /** Call `listener` when it may have changed. Returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Check it once, where the reader turned the source on — call it from an effect. */
  ensureChecked(): void;
  /** Turn the source on or off — what else it keeps (an address) kept as it is. */
  setEnabled(enabled: boolean): void;
};

/**
 * **A source of ready-made evaluations** — asked about a position before an
 * engine searches it; one registry entry (`registry.ts`) each. The lichess
 * evaluation API (`lichess/`) is the one there is.
 */
export interface EvalSource {
  /** Stable, never renamed — the back-off and the jobs' warnings key on it. */
  readonly id: string;
  /** The catalog key of its name, as a warning says it ("The lichess evaluation API"). */
  readonly labelKey: string;
  /** The catalog key of its name as a title — its tab of Settings → Engine ("Lichess evaluation API"). */
  readonly titleKey: string;
  /**
   * What it keeps in this browser (`localStorage` keys, IndexedDB names) —
   * the legal pages must name each (`legalDocuments.test.ts` reads them here).
   */
  readonly storageKeys: readonly string[];
  /** Whether the reader turned it on. **Off, the app never contacts it.** Read at every search. */
  isEnabled(): boolean;
  /** Ask it about a position. Gives up when `signal` is aborted. Never throws. */
  lookup(query: EvalQuery, signal?: AbortSignal): Promise<EvalLookup>;
  /** Whether it takes an engine's evaluations now (on, and writing turned on) — absent: never. */
  writesEnabled?(): boolean;
  /** Send it what an engine found — `true` once it took it, `false` for no usable answer. Never throws. */
  record?(result: PositionResult, meta: EvalRecordMeta, signal?: AbortSignal): Promise<boolean>;
  /**
   * **Its settings** — its own inner tab of Settings → Engine, beside
   * Stockfish connectors, named by {@link titleKey} (`views/settings/EngineTab.tsx` adds a
   * tab per source that has them, in registry order; `?source=<id>` opens
   * it) — a lazy component, so the runner and the boards never load it.
   * Absent: no tab.
   */
  readonly SettingsSection?: ComponentType<{ testId: string }>;
  /** **Its connection** (CTA-199) — the dot on its tab. Absent: no dot. */
  readonly connection?: EvalSourceConnectionState;
  /** **For tests**: forget this visit's state (a status, a cache) — the teardown's, beside clearing `localStorage`. */
  reset?(): void;
}
