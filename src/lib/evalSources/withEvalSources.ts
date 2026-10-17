import { withSearchInfo, type PositionLine, type PositionResult } from "../computerAnalysis";
import type {
  EngineHandle,
  EngineMessage,
  EngineMessageCallback,
  SearchOptions,
  UciOptionValue,
} from "../engineTypes";
import { parseEngineLine } from "../uciEngine";
import { backOffEvalSource, evalSourceBackedOff } from "./backOff";
import { anyEvalSourceEnabled, askEvalSources, recordInEvalSources } from "./evalSources";
import type { EvalSource } from "./types";

/**
 * **The eval sources in front of an engine** (CTA-196, [`docs/engine.md`](../../../docs/engine.md)
 * §10) — an `EngineHandle` that wraps another and, for an **eligible** search,
 * asks the enabled eval sources about the position first:
 *
 * - **a hit at the search's target depth or deeper** is the answer: its lines
 *   (up to the `MultiPV` last set) come out of {@link EngineHandle.onMessage}
 *   as the engine's own would — `info depth … multipv … score … pv …` lines,
 *   the score the side to move's as UCI writes it, then a `bestmove` — each
 *   stamped with the searched FEN and the source's id (`evalSource`); the
 *   engine is not asked;
 * - **a miss, a shallower eval, or no answer** — the engine searches, as it
 *   would have. A source that did not answer is left alone a minute by every
 *   board (`backOff.ts`), so a source that is down costs one timeout, not one
 *   per move.
 *
 * **Eligible** is the one rule, kept here and nowhere else: a search to a
 * depth (never `infinite`), not marked `evalSources: false` (Play with
 * Engine's and Masked Pieces' searches — an engine choosing its move in a game
 * — `usePlayGame`), on an engine not limited in strength (`UCI_LimitStrength`
 * on, or `Skill Level` under its top, last set through this handle).
 *
 * **Write-back**: an eligible search the engine finished **at its target
 * depth** is sent to every source that takes writes (`recordInEvalSources`),
 * in the background — never what a source answered, never one stopped short.
 *
 * **No stale answer**: a new `search` or `stop` drops the lookup in flight
 * (its signal aborted, its answer ignored), so a position navigated away from
 * never shows its lines on the next one or plays its move. Everything else —
 * `setOption`, `options`, `whenOptionsReady`, `terminate` — is the engine's.
 *
 * Built where a board builds its engine (`useEngineModule`); the Jobs V2
 * runner asks the layer itself.
 */

/** What the decorator is told of the engine it wraps. */
export type EvalSourcesContext = {
  /** The engine's name, sent with a write. */
  engine: string;
  /** The deepest `go depth` the engine is asked for — a search's target is held to it, as the wrapper holds the `go`. */
  maxDepth: number;
  /** **For tests**: the sources instead of the registry's. */
  sources?: readonly EvalSource[];
};

/** Whether a value asks an option on — a check's `true`, or the older `1`. */
const isOn = (value: UciOptionValue) => value === true || value === 1 || value === "true" || value === "1";

/** The UCI `score` of a White's-view score, from the side to move's view. */
const uciScoreOf = (line: PositionLine, whiteToMove: boolean): string => {
  const sign = whiteToMove ? 1 : -1;
  return line.score.kind === "mate" ? `mate ${line.score.value * sign}` : `cp ${Math.round(line.score.value) * sign}`;
};

/** A source's answer as the engine's messages: an `info` per line, then the `bestmove`. */
const messagesOf = (fen: string, result: PositionResult, source: string): EngineMessage[] => {
  const whiteToMove = fen.split(" ")[1] !== "b";
  const lines = result.lines.filter((line) => line.pv.length > 0);
  if (lines.length === 0) return [];
  return [
    ...lines.map((line, index) =>
      parseEngineLine(`info depth ${line.depth} multipv ${index + 1} score ${uciScoreOf(line, whiteToMove)} pv ${line.pv.join(" ")}`, fen),
    ),
    parseEngineLine(`bestmove ${lines[0].pv[0]}`, fen),
  ].map((message) => ({ ...message, evalSource: source }));
};

export const withEvalSources = (engine: EngineHandle, { engine: engineName, maxDepth, sources }: EvalSourcesContext): EngineHandle => {
  const listeners = new Set<EngineMessageCallback>();
  let multiPv = 1;
  let limitStrength = false;
  let skillLevel: number | undefined;
  /** The lookup in flight — aborted by the next search or a stop. */
  let lookup: AbortController | undefined;
  /** Whether the engine runs a search this handle asked for, until its `bestmove`. */
  let engineBusy = false;
  /** The eligible search the engine runs — watched for the write-back. */
  let watched: { fen: string; target: number; lines: (PositionLine | undefined)[]; nodes?: number } | undefined;

  const emit = (message: EngineMessage) => listeners.forEach((listener) => listener(message));

  const strengthLimited = () => {
    const top = engine.options.get("Skill Level")?.max ?? 20;
    return limitStrength || (skillLevel !== undefined && skillLevel < top);
  };

  /** Fold the engine's word into the watched search, and send it on when it finished at its target. */
  const watch = (message: EngineMessage) => {
    if (message.heartbeat) return;
    if (message.bestMove !== undefined) engineBusy = false;
    const search = watched;
    if (search === undefined || message.fen !== search.fen) return;
    const whiteToMove = search.fen.split(" ")[1] !== "b";
    if (message.pv !== undefined && message.depth) {
      search.lines = withSearchInfo(search.lines, message, whiteToMove ? "w" : "b");
    }
    if (message.nodes !== undefined) search.nodes = message.nodes;
    if (message.bestMove === undefined) return;
    watched = undefined;
    const gap = search.lines.findIndex((line) => line === undefined);
    const lines = (gap === -1 ? search.lines : search.lines.slice(0, gap)) as PositionLine[];
    if (lines.length === 0 || lines[0].depth < search.target) return;
    // In the background: what the board shows never waits on it.
    void recordInEvalSources(
      { fen: search.fen, lines },
      { nodes: search.nodes, engine: engineName },
      { sources, skip: (source) => evalSourceBackedOff(source.id, "write") },
    ).then((refused) => refused.forEach((source) => backOffEvalSource(source.id, "write")));
  };

  const off = engine.onMessage((message) => {
    watch(message);
    emit(message);
  });

  /** The engine searches it — watched for the write-back when eligible. */
  const searchWithEngine = (fen: string, options: SearchOptions, target: number | undefined) => {
    watched = target === undefined ? undefined : { fen, target, lines: [] };
    engineBusy = true;
    engine.search(fen, options);
  };

  return {
    get options() {
      return engine.options;
    },
    search(fen, options) {
      lookup?.abort();
      lookup = undefined;
      watched = undefined;
      const eligible = !("infinite" in options) && options.evalSources !== false && !strengthLimited();
      // The engine is never told about the eval sources.
      const forEngine: SearchOptions = "infinite" in options ? options : { depth: options.depth, movetime: options.movetime };
      if (!eligible || !("depth" in options)) {
        searchWithEngine(fen, forEngine, undefined);
        return;
      }
      const target = Math.min(options.depth, maxDepth);
      if (!anyEvalSourceEnabled(sources)) {
        searchWithEngine(fen, forEngine, target);
        return;
      }
      // The previous position's search ends now: nothing searches while the sources are asked.
      if (engineBusy) engine.stop();
      const mine = new AbortController();
      lookup = mine;
      void askEvalSources(
        { fen, depth: target, multiPv },
        { signal: mine.signal, sources, skip: (source) => evalSourceBackedOff(source.id, "read") },
      ).then(({ found, unreachable }) => {
        unreachable.forEach((source) => backOffEvalSource(source.id, "read"));
        // A newer search, a stop or the end: this answer is about a position no longer asked for.
        if (lookup !== mine || mine.signal.aborted) return;
        lookup = undefined;
        const messages = found === undefined ? [] : messagesOf(fen, found.result, found.source.id);
        if (messages.length > 0) {
          messages.forEach(emit);
          return;
        }
        searchWithEngine(fen, forEngine, target);
      });
    },
    stop() {
      lookup?.abort();
      lookup = undefined;
      engine.stop();
    },
    setOption(name, value) {
      const taken = engine.setOption(name, value);
      if (taken && name === "MultiPV" && typeof value === "number") multiPv = Math.max(1, value);
      if (taken && name === "UCI_LimitStrength") limitStrength = isOn(value);
      if (taken && name === "Skill Level") skillLevel = Number(value);
      return taken;
    },
    whenOptionsReady: (callback) => engine.whenOptionsReady(callback),
    onMessage(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    terminate() {
      lookup?.abort();
      lookup = undefined;
      watched = undefined;
      off();
      listeners.clear();
      engine.terminate();
    },
  };
};
