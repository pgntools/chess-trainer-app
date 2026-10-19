import { gradePosition, trainingPositionFrom, type StoredTrainingLine, type TrainingPosition, type TrainingSide } from "./accuracyTrainer";
import { turnOf } from "./computerAnalysis";
import type { Score } from "./engineAnalysis";
import { lineMovesOf, nodeAtPath, SESSION_COMMAND, type SessionState } from "./findBestMoveSession";
import { addLine, emptyTree, findNode, sanPathTo, setComments, setNags, type GameTree, type VariationNode } from "./gameTree";

/**
 * **A Find Best Move session in its PGN** (CTA-239) — pure: the session's
 * whole state written into its Case's tree, and read back from it. The Case
 * *is* the session: reloaded, opened from the lobby, downloaded and loaded
 * again as a file, it resumes where it was left. The reference is
 * `.claude/rules/accuracy-trainer.md` §7.
 *
 * - **Tags** — the session's own, in the header: `[FindBestMove "1"]` (the
 *   format's version, and what marks a PGN as a session), `FindBestMoveSide`
 *   (`white` / `black` / `both`), `FindBestMoveMoves` (N, the moves to find),
 *   `FindBestMoveEngine` and `FindBestMoveArrows` (`on` / `off`),
 *   `FindBestMovePosition` (the position on screen, 1-based),
 *   `FindBestMoveStatus` (`ongoing` / `done` — for a reader of the file; the
 *   session reads it from the positions) and `FindBestMoveGame` (the game's
 *   name).
 * - **One command per position** — `[%fbm …]`, a comment of its own on the
 *   move the position follows, its first (the game's opening comment for the start),
 *   its fields `key:value`, space-separated, absent when empty:
 *   `game:` the game's move; `state:` `open` / `answered` / `passed` /
 *   `reopened` (a pass being answered again, on screen); `answer:` the
 *   reader's moves in their order (`Nf3,d4,c4`); `lines:` every line the
 *   position is graded against, best first not required — each its moves
 *   from the position dot-joined, its score in White's view (centipawns, or
 *   `#N` a mate) and its flags, `l` one of the engine's listed lines and `p`
 *   the game's move (`e4.e5.Nf3/31/l,d4/25/l,Qh5/-150/p`); `work:` the
 *   reader's own lines from the position, each line to a leaf dot-joined, the
 *   leaves `|`-separated in the tree's order (`Nf3.d5|Nf3.Nf6|d4` — their
 *   first moves' order is their ranking); `job:` its Evaluate Position job,
 *   or `searched:` that job once it is done, its lines in `lines:`.
 *
 * The readable rest stays what any PGN reader shows: the game, the reader's
 * variations, the engine's lines with their `[%eval]`, the answers as
 * comments ("Find Best Move: 1. e4 (#1, Best) …"). Nothing a session knows
 * lives anywhere else.
 */

/** The tag that marks a PGN as a Find Best Move session — its value the format's version. */
const SESSION_TAG = "FindBestMove";

/** The format this build writes and reads. */
const SESSION_FORMAT_VERSION = 1;

/** The session's tags, in the order they are written. */
const SESSION_TAGS = {
  format: SESSION_TAG,
  side: "FindBestMoveSide",
  moves: "FindBestMoveMoves",
  engine: "FindBestMoveEngine",
  arrows: "FindBestMoveArrows",
  position: "FindBestMovePosition",
  status: "FindBestMoveStatus",
  game: "FindBestMoveGame",
} as const;

/** How many best moves a session may ask for — the setting's own range. */
const SESSION_MOVES_BOUNDS = { min: 1, max: 10 } as const;

/** The moves to find when a PGN does not say (or says something unreadable). */
const DEFAULT_MOVES = 3;

/** The settings a session keeps beside its state: the engine switch and the next-move arrows. */
type SessionSettingsRecord = { engine: boolean; showArrows: boolean };

/** **What a session's PGN holds** besides its tree: its state and its settings. */
export type SessionRecord = SessionState & SessionSettingsRecord;

/** A position's state as its command says it. */
type StoredState = "open" | "answered" | "passed" | "reopened";

const SIDE_WORDS: Record<TrainingSide, string> = { w: "white", b: "black", both: "both" };

/** Whether a tree is a session's — its format tag this build's version. */
export const isSessionTree = (tree: Pick<GameTree, "headers">): boolean =>
  tree.headers[SESSION_TAG] === String(SESSION_FORMAT_VERSION);

/** Whether every position has an answer (a pass is one) — the session done. */
const isSessionDone = (state: Pick<SessionState, "answers">): boolean => state.answers.every((given) => given !== null);

/* ─── Writing ─────────────────────────────────────────────────────────── */

const scoreText = (score: Score): string => (score.kind === "mate" ? `#${score.value}` : String(Math.round(score.value)));

/** One line as `lines:` keeps it — the game's move by its first move alone: the game's continuation is the tree's mainline. */
const lineText = (line: StoredTrainingLine): string => {
  const sans = line.played || line.sans.length === 0 ? [line.san] : line.sans;
  const flags = `${line.listed ? "l" : ""}${line.played ? "p" : ""}`;
  return `${sans.join(".")}/${scoreText(line.score)}${flags === "" ? "" : `/${flags}`}`;
};

/** Every line of a tree of moves to a leaf, in the tree's order — the tree again, once each is added in turn. */
const leafPaths = (nodes: readonly VariationNode[], prefix: readonly string[] = []): string[][] =>
  nodes.flatMap((node) => (node.children.length === 0 ? [[...prefix, node.san]] : leafPaths(node.children, [...prefix, node.san])));

/** **A position's command** — its state, answer, lines, the reader's lines and its job. */
const commandOf = (record: SessionRecord, index: number): string | undefined => {
  const position = record.positions[index];
  if (position === undefined) return undefined;
  const given = record.answers[index] ?? null;
  const state: StoredState = given === null ? (record.reopened === index ? "reopened" : "open") : given.length === 0 ? "passed" : "answered";
  const fields = [`game:${position.playedSan}`, `state:${state}`];
  if (given !== null && given.length > 0) fields.push(`answer:${given.join(",")}`);
  if (position.lines.length > 0) fields.push(`lines:${position.lines.map(lineText).join(",")}`);
  const work = record.work[index];
  const leaves = work === null || work === undefined ? [] : leafPaths(work.moves);
  if (leaves.length > 0) fields.push(`work:${leaves.map((leaf) => leaf.join(".")).join("|")}`);
  const job = record.jobs[index];
  if (job !== null && job !== undefined) fields.push(`${record.searched[index] === true ? "searched" : "job"}:${job}`);
  return `[%fbm ${fields.join(" ")}]`;
};

/** A tag's value as a PGN header can hold it — no quote or backslash, one line. */
const tagValue = (text: string): string => text.replace(/["\\]/g, "'").replace(/\s+/g, " ").trim();

/**
 * **The session written into its tree** — the tags set, and each position's
 * command the first comment on its move (the readable ones after it, next to
 * the move that follows), any older one taken off. Every
 * autosave writes it, so the Case's PGN always holds the whole session; the
 * same record twice gives the same PGN. A position whose move the tree lacks
 * is not written.
 */
export const withSessionRecord = (tree: GameTree, record: SessionRecord): GameTree => {
  const headers = {
    ...tree.headers,
    [SESSION_TAGS.format]: String(SESSION_FORMAT_VERSION),
    [SESSION_TAGS.side]: SIDE_WORDS[record.side],
    [SESSION_TAGS.moves]: String(record.wanted),
    [SESSION_TAGS.engine]: record.engine ? "on" : "off",
    [SESSION_TAGS.arrows]: record.showArrows ? "on" : "off",
    [SESSION_TAGS.position]: String(record.index + 1),
    [SESSION_TAGS.status]: isSessionDone(record) ? "done" : "ongoing",
    [SESSION_TAGS.game]: tagValue(record.game),
  };
  return record.positions.reduce((next, position, index) => {
    const at = nodeAtPath(next, position.path);
    const command = commandOf(record, index);
    if (at === undefined || command === undefined) return next;
    const current = at.id === null ? (next.comments ?? []) : (findNode(next, at.id)?.comments ?? []);
    return setComments(next, at.id, "comments", [command, ...current.filter((text) => !SESSION_COMMAND.test(text))]);
  }, { ...tree, headers } as GameTree);
};

/* ─── Reading ─────────────────────────────────────────────────────────── */

const SCORE = /^(#)?(-?\d+)$/;
const JOB_ID = /^[\w-]+$/;

const scoreOf = (text: string): Score | undefined => {
  const match = SCORE.exec(text);
  if (match === null) return undefined;
  return match[1] === "#" ? { kind: "mate", value: Number(match[2]) } : { kind: "cp", value: Number(match[2]) };
};

/** A command's fields, `key:value` — the first of each key. */
const fieldsOf = (command: string): Map<string, string> => {
  const body = command.trim().replace(/^\[%fbm\s*/, "").replace(/\]$/, "");
  const fields = new Map<string, string>();
  for (const token of body.split(/\s+/)) {
    const colon = token.indexOf(":");
    if (colon <= 0) continue;
    const key = token.slice(0, colon);
    if (!fields.has(key)) fields.set(key, token.slice(colon + 1));
  }
  return fields;
};

const linesOf = (text: string | undefined): StoredTrainingLine[] =>
  (text ?? "").split(",").flatMap((entry): StoredTrainingLine[] => {
    const [moves = "", score = "", flags = ""] = entry.split("/");
    const sans = moves.split(".").filter((san) => san !== "");
    const parsed = scoreOf(score);
    const first = sans[0];
    if (first === undefined || parsed === undefined) return [];
    return [{ san: first, sans, score: parsed, listed: flags.includes("l"), played: flags.includes("p") }];
  });

/** A comment as a reader's line gets it back: no `[%eval]` (the engine's word on a move it shares) and no session command. */
const readersComment = (text: string): string => (SESSION_COMMAND.test(text) ? "" : text.replace(/\[%eval\s[^\]]*\]/g, " ").replace(/\s{2,}/g, " ").trim());

/**
 * **The reader's lines at a position, rebuilt** — each line to a leaf played
 * from the position, in turn (so their order is the tree's again), each move
 * given the comments and glyphs the Case holds for it, but an `[%eval]`.
 */
const workOf = (tree: GameTree, path: readonly string[], fen: string, text: string | undefined): GameTree | null => {
  const leaves = (text ?? "").split("|").map((leaf) => leaf.split(".").filter((san) => san !== "")).filter((leaf) => leaf.length > 0);
  let work = emptyTree(fen);
  for (const leaf of leaves) work = addLine(work, null, lineMovesOf(fen, leaf)).tree;
  if (work.moves.length === 0) return null;
  const annotate = (nodes: readonly VariationNode[], prefix: readonly string[]) => {
    for (const node of nodes) {
      const sans = [...prefix, node.san];
      const at = nodeAtPath(tree, [...path, ...sans]);
      const source = at === undefined || at.id === null ? undefined : findNode(tree, at.id);
      const comments = (source?.comments ?? []).map(readersComment).filter((each) => each !== "");
      if (comments.length > 0) work = setComments(work, node.id, "comments", comments);
      if (source?.nags !== undefined && source.nags.length > 0) work = setNags(work, node.id, source.nags);
      annotate(node.children, sans);
    }
  };
  annotate(work.moves, []);
  return work;
};

/** Every node carrying a session command, with it — the start's too (`node` `null`), in game order. */
const commandsOf = (tree: GameTree): { node: VariationNode | null; command: string }[] => {
  const found: { node: VariationNode | null; command: string }[] = [];
  const opening = tree.comments?.find((text) => SESSION_COMMAND.test(text));
  if (opening !== undefined) found.push({ node: null, command: opening });
  const visit = (nodes: readonly VariationNode[]) => {
    for (const node of nodes) {
      const command = node.comments?.find((text) => SESSION_COMMAND.test(text));
      if (command !== undefined) found.push({ node, command });
      visit(node.children);
    }
  };
  visit(tree.moves);
  return found.sort((a, b) => (a.node?.ply ?? 0) - (b.node?.ply ?? 0));
};

/** A whole number in bounds, else `fallback`. */
const wholeIn = (text: string | undefined, min: number, max: number, fallback: number): number => {
  const value = Number(text);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};

/**
 * **A session read back from its tree** — `undefined` for a tree that is not
 * a session (no format tag, another version) or holds no position. Lenient
 * past that: a tag that does not read is its default, a command's field that
 * does not read is absent, a pass reopened that is not the position on screen
 * is a pass. Its positions are rebuilt from their stored lines alone
 * (`trainingPositionFrom`), so a session grades the same whatever became of
 * its jobs.
 */
export const sessionRecordOf = (tree: GameTree): SessionRecord | undefined => {
  if (!isSessionTree(tree)) return undefined;
  const { headers } = tree;
  const stored = commandsOf(tree);
  if (stored.length === 0) return undefined;

  const positions: TrainingPosition[] = [];
  const answers: (readonly string[] | null)[] = [];
  const work: (GameTree | null)[] = [];
  const jobs: (string | null)[] = [];
  const searched: boolean[] = [];
  const states: StoredState[] = [];
  for (const { node, command } of stored) {
    const fields = fieldsOf(command);
    const fen = node === null ? tree.startFen : node.fen;
    const path = sanPathTo(tree, node?.id ?? null);
    const turn = turnOf(fen);
    const playedSan = fields.get("game") ?? node?.children[0]?.san ?? tree.moves[0]?.san ?? "";
    positions.push(
      trainingPositionFrom(
        { nodeId: node?.id ?? null, path, fen, turn, ply: path.length + 1, moveNumber: Number(fen.split(" ")[5]) || 1, playedSan },
        linesOf(fields.get("lines")),
      ),
    );
    const state = fields.get("state");
    const answer = (fields.get("answer") ?? "").split(",").filter((san) => san !== "");
    const read: StoredState = state === "answered" && answer.length > 0 ? "answered" : state === "passed" || state === "reopened" ? state : "open";
    states.push(read);
    answers.push(read === "answered" ? answer : read === "passed" ? [] : null);
    work.push(workOf(tree, path, fen, fields.get("work")));
    const job = fields.get("searched") ?? fields.get("job");
    jobs.push(job !== undefined && JOB_ID.test(job) ? job : null);
    searched.push(fields.has("searched") && job !== undefined && JOB_ID.test(job));
  }

  const index = wholeIn(headers[SESSION_TAGS.position], 1, positions.length, 1) - 1;
  // A pass reopened is one only on screen: anywhere else it is a pass again.
  const reopened = states[index] === "reopened" ? index : null;
  states.forEach((state, at) => {
    if (state === "reopened" && at !== reopened) answers[at] = [];
  });
  const side = headers[SESSION_TAGS.side];
  return {
    side: side === "white" ? "w" : side === "black" ? "b" : "both",
    game: headers[SESSION_TAGS.game] ?? "",
    positions,
    wanted: wholeIn(headers[SESSION_TAGS.moves], SESSION_MOVES_BOUNDS.min, SESSION_MOVES_BOUNDS.max, DEFAULT_MOVES),
    index,
    answers,
    jobs,
    searched,
    work,
    reopened,
    engine: headers[SESSION_TAGS.engine] === "on",
    showArrows: headers[SESSION_TAGS.arrows] !== "off",
  };
};

/* ─── Progress ────────────────────────────────────────────────────────── */

/** **How far a session has got** — what the lobby lists. */
export type SessionProgress = {
  /** Its positions. */
  total: number;
  /** Answered with moves. */
  answered: number;
  passed: number;
  /** The best moves found, in their place, and how many there were to find — over the graded positions. */
  found: number;
  inPlace: number;
  target: number;
  /** Every position answered or passed. */
  done: boolean;
};

/**
 * **A session's progress, from its record** — each answered position graded
 * against its stored lines, but one whose engine search has not landed in
 * them (its job still named `job:`), which waits as on the screen.
 */
export const sessionProgressOf = (record: SessionRecord): SessionProgress => {
  let found = 0;
  let inPlace = 0;
  let target = 0;
  record.positions.forEach((position, index) => {
    const given = record.answers[index];
    if (given === null || given === undefined || given.length === 0) return;
    if (record.jobs[index] !== null && record.searched[index] !== true) return;
    const grade = gradePosition(position, given, { wanted: record.wanted });
    found += grade.found;
    inPlace += grade.inPlace;
    target += grade.target;
  });
  return {
    total: record.positions.length,
    answered: record.answers.filter((given) => given !== null && given.length > 0).length,
    passed: record.answers.filter((given) => given !== null && given.length === 0).length,
    found,
    inPlace,
    target,
    done: isSessionDone(record),
  };
};
