import { DEFAULT_POSITION } from "chess.js";

import type { StoredTrainingLine, TrainingSide } from "../accuracyTrainer";
import type { Score } from "../engineAnalysis";
import type { GameHeaders } from "../gameModel";
import { treeToPgn, type GameTree } from "../gameTree";
import { parsePgnTree } from "../pgn";
import {
  DEFAULT_ENGINE_START,
  DEFAULT_MOVES,
  MOVES_BOUNDS,
  SESSION_FORMAT_VERSION,
  isPositionOf,
  positionFenOf,
  replayGame,
  type AnswerState,
  type EngineState,
  type FindBestMoveRecord,
  type PositionKey,
  type PositionRecord,
} from "./model";

/**
 * **A session in its PGN, format 2** (CTA-244, the design note §5) — pure:
 * the record written into tags, and read back from them. **Every byte of
 * session state is in the header**; the movetext is a projection
 * (`projection.ts`), written and never read back, so no movetext writer — an
 * `[%eval]`, an engine's line, a typed comment, the Analysis autosave — can
 * reach the session.
 *
 * | Tag | Value |
 * | --- | --- |
 * | `FindBestMove` | `2` — what makes a PGN a session; any other value is none |
 * | `FindBestMoveName` | the game's name |
 * | `FindBestMoveSide` | `white` / `black` / `both` |
 * | `FindBestMoveMoves` | N, 1–10 |
 * | `FindBestMoveEngine`, `FindBestMoveArrows` | `on` / `off` |
 * | `FindBestMoveEngineStart` | `move` / `grade` — when a position's search starts (CTA-247); absent, or anything else, `move` |
 * | `FindBestMoveGame` | the recorded game's SANs, space-separated (the start is `SetUp` / `FEN`) |
 * | `FindBestMoveKeys` | the manifest, ascending, comma-separated |
 * | `FindBestMoveCurrent` | the position on screen |
 * | `FindBestMoveStatus` | `ongoing` / `done` — written, never read |
 * | `FindBestMove_<key>` | `state:` `answer:` `lines:` `engine:` |
 * | `FindBestMoveWork_<key>` | the reader's lines there, a PGN movetext fragment from its FEN |
 *
 * **Every write drops every `FindBestMove*` tag** and writes the record's
 * ({@link withSessionTags}), so stale data lives until the next write at
 * most. **Reading is lenient about fields, strict about structure**
 * ({@link sessionRecordOf}).
 */

const TAG = {
  format: "FindBestMove",
  name: "FindBestMoveName",
  side: "FindBestMoveSide",
  moves: "FindBestMoveMoves",
  engine: "FindBestMoveEngine",
  arrows: "FindBestMoveArrows",
  engineStart: "FindBestMoveEngineStart",
  game: "FindBestMoveGame",
  keys: "FindBestMoveKeys",
  current: "FindBestMoveCurrent",
  status: "FindBestMoveStatus",
} as const;

/** A position's tag, and its work's. */
const positionTag = (key: PositionKey): string => `FindBestMove_${key}`;
const workTag = (key: PositionKey): string => `FindBestMoveWork_${key}`;

/** Every tag a session may write — the ones a write drops first. */
const isSessionTag = (name: string): boolean => name.startsWith(TAG.format);

const SIDE_WORDS: Record<TrainingSide, string> = { w: "white", b: "black", both: "both" };

/** **Whether a PGN's tags are a session's** — this build's format. The one predicate the Analysis screens read (S3). */
export const isSessionTags = (tags: Readonly<GameHeaders>): boolean => tags[TAG.format] === String(SESSION_FORMAT_VERSION);

/** The headers with every session tag taken off — a plain game's (S3's *Duplicate as a plain Case*). */
export const withoutSessionTags = (headers: Readonly<GameHeaders>): GameHeaders =>
  Object.fromEntries(Object.entries(headers).filter(([name]) => !isSessionTag(name)));

/* ─── Writing ─────────────────────────────────────────────────────────── */

const scoreText = (score: Score): string => (score.kind === "mate" ? `#${score.value}` : String(Math.round(score.value)));

/** One line as `lines:` keeps it — the game's move by itself alone: the game's continuation is the recorded game. */
const lineText = (line: StoredTrainingLine): string => {
  const sans = line.played || line.sans.length === 0 ? [line.san] : line.sans;
  const flags = `${line.listed ? "l" : ""}${line.played ? "p" : ""}`;
  return `${sans.join(".")}/${scoreText(line.score)}${flags === "" ? "" : `/${flags}`}`;
};

const engineText = (engine: EngineState): string | undefined => {
  switch (engine.kind) {
    case "idle":
      return undefined;
    case "wanted":
      return "wanted";
    case "queued":
    case "searched":
      return `${engine.kind}/${engine.jobId}`;
    case "failed":
      return engine.jobId === undefined ? "failed" : `failed/${engine.jobId}`;
  }
};

/** **A position's tag value** — its fields, absent when empty. */
const positionText = (position: PositionRecord): string => {
  const fields = [`state:${position.answer.kind}`];
  if (position.answer.kind === "answered") fields.push(`answer:${position.answer.moves.join(",")}`);
  if (position.lines.length > 0) fields.push(`lines:${position.lines.map(lineText).join(",")}`);
  const engine = engineText(position.engine);
  if (engine !== undefined) fields.push(`engine:${engine}`);
  return fields.join(" ");
};

/**
 * **The reader's lines as a movetext fragment** — `treeToPgn`'s own writing
 * of the work from its FEN, its tags and result left off, on one line (a
 * comment's line breaks become spaces: a tag holds no newline). `""` for
 * none. Its comments and glyphs ride along with no encoding of their own.
 */
export const workFragmentOf = (work: GameTree | null): string => {
  if (work === null || work.moves.length === 0) return "";
  const text = treeToPgn({ ...work, headers: {} });
  const movetext = text.includes("\n\n") ? text.slice(text.indexOf("\n\n") + 2) : text;
  return movetext.replace(/\s*\*\s*$/, "").replace(/\s+/g, " ").trim();
};

/** **The work read back** — the fragment under a `SetUp` / `FEN` header of its position; `undefined` where it does not parse. */
export const workFromFragment = (fen: string, fragment: string): GameTree | null | undefined => {
  if (fragment.trim() === "") return null;
  try {
    const tree = parsePgnTree(`[SetUp "1"]\n[FEN "${fen}"]\n\n${fragment} *`);
    return tree.moves.length === 0 ? undefined : { ...tree, headers: {} };
  } catch {
    return undefined;
  }
};

/** **The session's tags**, in the order they are written: the session's, then each position's and its work's. */
const sessionTagsOf = (record: FindBestMoveRecord, done: boolean): GameHeaders => {
  const tags: GameHeaders = {
    [TAG.format]: String(SESSION_FORMAT_VERSION),
    [TAG.name]: oneLine(record.name),
    [TAG.side]: SIDE_WORDS[record.side],
    [TAG.moves]: String(record.wanted),
    [TAG.engine]: record.settings.engine ? "on" : "off",
    [TAG.arrows]: record.settings.arrows ? "on" : "off",
    [TAG.engineStart]: record.settings.engineStart,
    [TAG.game]: record.game.moves.join(" "),
    [TAG.keys]: record.keys.join(","),
    [TAG.current]: String(record.current),
    [TAG.status]: done ? "done" : "ongoing",
  };
  for (const key of record.keys) {
    const position = record.positions.get(key);
    if (position === undefined) continue;
    tags[positionTag(key)] = positionText(position);
    const work = workFragmentOf(position.work);
    if (work !== "") tags[workTag(key)] = work;
  }
  return tags;
};

/** **Every session tag dropped, then the record's written** — the source game's own tags kept, in their order, before them. */
export const withSessionTags = (headers: Readonly<GameHeaders>, record: FindBestMoveRecord, done: boolean): GameHeaders => ({
  ...withoutSessionTags(headers),
  ...sessionTagsOf(record, done),
});

const oneLine = (text: string): string => text.replace(/\s+/g, " ").trim();

/* ─── Reading ─────────────────────────────────────────────────────────── */

/** Something read leniently — said once on the screen ("1 position could not be read"). */
export type SessionIssue =
  /** A manifest key with no tag of its own, recreated open. */
  | { kind: "lost"; key: PositionKey }
  /** A manifest key that names no position of the game — left out. */
  | { kind: "outside"; key: PositionKey }
  /** A field that did not parse — its default. */
  | { kind: "field"; key: PositionKey; field: string }
  /** The reader's lines there did not parse from its FEN — none. */
  | { kind: "work"; key: PositionKey }
  /** `FindBestMoveCurrent` not in the manifest — the first open position instead. */
  | { kind: "current" };

const SCORE = /^(#)?(-?\d+)$/;
const JOB_ID = /^[\w-]+$/;

const scoreOf = (text: string): Score | undefined => {
  const match = SCORE.exec(text);
  if (match === null) return undefined;
  return match[1] === "#" ? { kind: "mate", value: Number(match[2]) } : { kind: "cp", value: Number(match[2]) };
};

/** A tag value's fields, `key:value` — the first of each key. */
const fieldsOf = (text: string): Map<string, string> => {
  const fields = new Map<string, string>();
  for (const token of text.trim().split(/\s+/)) {
    const colon = token.indexOf(":");
    if (colon <= 0) continue;
    const key = token.slice(0, colon);
    if (!fields.has(key)) fields.set(key, token.slice(colon + 1));
  }
  return fields;
};

/** `lines:` read — `undefined` where an entry does not parse. */
const linesOf = (text: string): StoredTrainingLine[] | undefined => {
  const lines: StoredTrainingLine[] = [];
  for (const entry of text.split(",")) {
    const [moves = "", score = "", flags = ""] = entry.split("/");
    const sans = moves.split(".").filter((san) => san !== "");
    const parsed = scoreOf(score);
    const first = sans[0];
    if (first === undefined || parsed === undefined) return undefined;
    lines.push({ san: first, sans, score: parsed, listed: flags.includes("l"), played: flags.includes("p") });
  }
  return lines;
};

/** `engine:` read — `undefined` where it does not parse. */
const engineOf = (text: string): EngineState | undefined => {
  const [kind, jobId] = text.split("/");
  const id = jobId !== undefined && JOB_ID.test(jobId) ? jobId : undefined;
  if (kind === "wanted" && jobId === undefined) return { kind: "wanted" };
  if ((kind === "queued" || kind === "searched") && id !== undefined) return { kind, jobId: id };
  if (kind === "failed" && (jobId === undefined || id !== undefined)) return id === undefined ? { kind: "failed" } : { kind: "failed", jobId: id };
  return undefined;
};

/** A position's record read from its tag — every field that does not parse its default, and said. */
const positionOf = (key: PositionKey, text: string, issues: SessionIssue[]): PositionRecord => {
  const fields = fieldsOf(text);
  const bad = (field: string) => issues.push({ kind: "field", key, field });

  const state = fields.get("state");
  const answerMoves = (fields.get("answer") ?? "").split(",").filter((san) => san !== "");
  let answer: AnswerState = { kind: "open" };
  if (state === "answered") {
    if (answerMoves.length > 0) answer = { kind: "answered", moves: answerMoves };
    else bad("answer");
  } else if (state === "passed" || state === "reopened") {
    answer = { kind: state };
  } else if (state !== "open") {
    bad("state");
  }

  const linesText = fields.get("lines");
  const lines = linesText === undefined ? [] : linesOf(linesText);
  if (lines === undefined) bad("lines");

  const engineField = fields.get("engine");
  const engine = engineField === undefined ? { kind: "idle" as const } : engineOf(engineField);
  if (engine === undefined) bad("engine");

  return { key, lines: lines ?? [], answer, engine: engine ?? { kind: "idle" }, work: null };
};

/** A whole number in bounds, else `fallback`. */
const wholeIn = (text: string | undefined, min: number, max: number, fallback: number): number => {
  const value = Number(text);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};

/** The manifest read — every whole key ≥ 1, once, ascending. */
const keysOf = (text: string | undefined): PositionKey[] =>
  [...new Set((text ?? "").split(",").map((each) => Number(each.trim())).filter((key) => Number.isInteger(key) && key >= 1))].sort((a, b) => a - b);

/** A session read back: its record, and what could not be read (said once on the screen). */
export type SessionReading = { record: FindBestMoveRecord; issues: readonly SessionIssue[] };

/**
 * **A session read back from its tags** — `undefined` for tags that are not
 * a session's (no `FindBestMove`, or not `2`), a recorded game that does not
 * replay from its start, or no manifest. Lenient past that (the design
 * note's §5.5): a manifest key with no tag of its own is **kept, recreated
 * open** and said — never skipped, so the count is the manifest's; a key
 * naming no position of the game is left out and said; a field that does
 * not read is its default; a reopened pass that is not on screen is a pass;
 * a `current` outside the manifest is the first open key, else the first.
 * Tags for keys outside the manifest are ignored — and gone at the next
 * write.
 */
export const sessionRecordOf = (tags: Readonly<GameHeaders>): SessionReading | undefined => {
  if (!isSessionTags(tags)) return undefined;
  const startFen = tags.SetUp === "1" && tags.FEN !== undefined ? tags.FEN : undefined;
  const moves = (tags[TAG.game] ?? "").split(/\s+/).filter((san) => san !== "");
  const game = { startFen: startFen ?? DEFAULT_POSITION, moves };
  if (replayGame(game) === undefined) return undefined;

  const issues: SessionIssue[] = [];
  const keys: PositionKey[] = [];
  for (const key of keysOf(tags[TAG.keys])) {
    if (isPositionOf(game, key)) keys.push(key);
    else issues.push({ kind: "outside", key });
  }
  if (keys.length === 0) return undefined;

  const positions = new Map<PositionKey, PositionRecord>();
  for (const key of keys) {
    const text = tags[positionTag(key)];
    if (text === undefined) issues.push({ kind: "lost", key });
    const position = positionOf(key, text ?? "state:open", issues);
    const fragment = tags[workTag(key)];
    const fen = positionFenOf(game, key);
    const work = fragment === undefined || fen === undefined ? null : workFromFragment(fen, fragment);
    if (work === undefined) issues.push({ kind: "work", key });
    positions.set(key, { ...position, work: work ?? null });
  }

  const named = Number(tags[TAG.current]);
  const current = keys.includes(named) ? named : (keys.find((key) => positions.get(key)?.answer.kind === "open") ?? keys[0]);
  if (!keys.includes(named)) issues.push({ kind: "current" });
  // A pass reopened is one only on screen: anywhere else it is a pass again.
  for (const [key, position] of positions) {
    if (position.answer.kind === "reopened" && key !== current) positions.set(key, { ...position, answer: { kind: "passed" } });
  }

  const side = tags[TAG.side];
  return {
    record: {
      version: SESSION_FORMAT_VERSION,
      name: tags[TAG.name] ?? "",
      side: side === "white" ? "w" : side === "black" ? "b" : "both",
      wanted: wholeIn(tags[TAG.moves], MOVES_BOUNDS.min, MOVES_BOUNDS.max, DEFAULT_MOVES),
      settings: {
        engine: tags[TAG.engine] === "on",
        arrows: tags[TAG.arrows] !== "off",
        // A session from before CTA-247 has no such tag: today's behaviour.
        engineStart: tags[TAG.engineStart] === "grade" ? "grade" : DEFAULT_ENGINE_START,
      },
      game,
      keys,
      current,
      positions,
    },
    issues,
  };
};
