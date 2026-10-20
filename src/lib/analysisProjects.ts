import { DEFAULT_POSITION } from "chess.js";

import {
  arrowPaletteFrom,
  arrowWidthSourceFrom,
  DEFAULT_ARROW_PALETTE,
  DEFAULT_ARROW_WIDTH_SOURCE,
  type ArrowPaletteId,
  type ArrowWidthSource,
} from "./arrowSettings";
import { gameTag, type GameHeaders } from "./gameModel";
import {
  emptyTree,
  fenAtNode,
  nodeAtSanPath,
  sanPathTo,
  treeToPgn,
  type GameTree,
} from "./gameTree";
import { parsePgnTree, readPgnTags } from "./pgn";
import {
  gameFolderChildren,
  gameFolderFrom,
  gameFolderPath,
  gameFolderSubtree,
  type GameFolder,
} from "./savedGameFolders";

/**
 * **Analysis V2's records** (CTA-186) — the reader's analysis organised into
 * **Projects** filed in nested **folders**, each Project holding **Cases**: a
 * Game or a Position, the one board the reader works on. The whole module is
 * `.claude/rules/analysis-v2.md`; the stores are
 * `analysisProjectFolderStore.ts`, `analysisProjectStore.ts` and
 * `analysisCaseStore.ts`, over one database (`analysisProjectsDb.ts`).
 *
 * ```
 * folders (nested) ──▶ Projects ──▶ Cases (game | position)
 * ```
 *
 * - **A folder is a {@link GameFolder}** — the app's one nested-folder model
 *   (cycles cut, a dangling parent read as the top level), its reads reused.
 *   Folders hold sub-folders and Projects, never a Case.
 * - **A Project** is a name (required) and the folder it is filed in.
 * - **A Case** is its type (fixed), where it came from (`source`, fixed) and
 *   the analysis on it — the whole tree as PGN, where the reader stands (as
 *   SAN from the start: node ids do not survive a PGN round trip) and the
 *   way the board faces — autosaved as the reader works.
 *
 * Every row's schema is its normaliser (`…From`): a field an older record
 * lacks reads as its default, a row without its identity is dropped
 * (`.claude/rules/database.md` §1.2). Pure — nothing here reads a store.
 */

/* ------------------------------------------------------------------ *
 * Folders
 * ------------------------------------------------------------------ */

/** One folder of Projects. */
export type ProjectFolder = GameFolder;

export const projectFolderFrom = gameFolderFrom;
export const projectFolderChildren = gameFolderChildren;
export const projectFolderPath = gameFolderPath;
export const projectFolderSubtree = gameFolderSubtree;

/* ------------------------------------------------------------------ *
 * Projects
 * ------------------------------------------------------------------ */

/** How long a folder's or a Project's name may be. */
export const MAX_PROJECT_NAME = 100;

/** The stores' caps (CTA-186) — here, so the import plans against them without opening a store. */
export const MAX_PROJECT_FOLDERS = 100;
export const MAX_ANALYSIS_PROJECTS = 1_000;

/**
 * **A Project's soft limit of Cases** (CTA-225 — the app-wide cap of 10,000
 * before it): past it a Project is slow to open and work in, so an
 * interactive add that would take one past it asks first and suggests a
 * Library collection. The store never refuses for it; nothing else asks.
 */
export const MAX_CASES_PER_PROJECT = 1_000;

/** Whether `adding` Cases would take a Project holding `existing` past {@link MAX_CASES_PER_PROJECT}. */
export const passesProjectCaseLimit = (existing: number, adding: number): boolean =>
  existing + adding > MAX_CASES_PER_PROJECT;

export type AnalysisProject = {
  id: string;
  /** The reader's name — required when it is made; a stored row without one reads as `""`. */
  name: string;
  /** The folder it is filed in; `null` is the top level (as is a folder that is gone). */
  folderId: string | null;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601 — renamed, moved. */
  updatedAt: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const stringOr = (value: unknown, fallback: string): string => (typeof value === "string" ? value : fallback);

const idOrNull = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

/** A stored Project, normalised — `undefined` for a row without an id. */
export const analysisProjectFrom = (value: unknown): AnalysisProject | undefined => {
  if (!isObject(value) || typeof value.id !== "string" || value.id === "") return undefined;
  const createdAt = stringOr(value.createdAt, "");
  return {
    id: value.id,
    name: stringOr(value.name, "").slice(0, MAX_PROJECT_NAME),
    folderId: idOrNull(value.folderId),
    createdAt,
    updatedAt: stringOr(value.updatedAt, createdAt),
  };
};

/**
 * The Projects filed **directly** in `folderId` (`null`: the top level) — a
 * Project naming a folder that is gone reads as top level, so every one shows
 * somewhere. In the caller's order.
 */
export const projectsHere = (
  projects: readonly AnalysisProject[],
  folders: readonly ProjectFolder[],
  folderId: string | null,
): AnalysisProject[] => {
  const known = new Set(folders.map((folder) => folder.id));
  return projects.filter((project) => {
    const parent = project.folderId !== null && known.has(project.folderId) ? project.folderId : null;
    return parent === folderId;
  });
};

/** Every Project anywhere under a folder — its own and its sub-folders'. */
export const projectsUnder = (
  projects: readonly AnalysisProject[],
  folders: readonly ProjectFolder[],
  folderId: string,
): AnalysisProject[] => {
  const subtree = projectFolderSubtree(folders, folderId);
  return projects.filter((project) => project.folderId !== null && subtree.has(project.folderId));
};

/* ------------------------------------------------------------------ *
 * Cases
 * ------------------------------------------------------------------ */

/** A Case's type — fixed when it is made. "Position" is what it is, not what it was read from. */
export type AnalysisCaseType = "game" | "position";

/**
 * **Where a Case came from** — fixed when it is made (to change it, the
 * reader duplicates the Case or makes a new one):
 *
 * - `pgn` — one game's PGN as it was read (`treeToPgn` of `parsePgnTree`, so
 *   side lines, comments, NAGs and `[%eval]`s are kept); `startPath` the
 *   moves from the start to where the Case begins (`[]` for a Game, the
 *   chosen ply's line for a Position from a PGN — its moves kept as context);
 * - `fen` — a position.
 *
 * `fen` is the position the Case begins on, in both: what a list shows, and
 * what a Position's name is derived from.
 */
export type AnalysisCaseSource =
  | { kind: "pgn"; pgn: string; startPath: readonly string[]; fen: string }
  | { kind: "fen"; fen: string };

/**
 * **How a Case's board draws** (CTA-186, its Display tab): the next-move
 * arrows on or off, what sizes them and their colours (the Analysis Board's
 * Arrows settings, `lib/arrowSettings.ts`), the move marks on the board, and
 * the engine's eval bar and lines — and, beside them on its Settings tab,
 * whether the engine's evaluations are written into the game (CTA-199). Kept
 * with the Case, autosaved like its analysis.
 */
export type CaseDisplay = {
  showArrows: boolean;
  arrowWidthSource: ArrowWidthSource;
  arrowPalette: ArrowPaletteId;
  showMoveMarks: boolean;
  /** The eval bar beside the board while the engine is on — the header's engine menu says the same. */
  showEvalBar: boolean;
  /** The engine's lines pinned above the panel's tabs. */
  showVariations: boolean;
  /** *Write evaluations into the game* (CTA-167; kept with the Case, on by default, since CTA-199) — each finished search's `[%eval]` on its move. */
  writeEvals: boolean;
};

/** A new Case's display — and an older record's, which has none: arrows, marks, eval bar and lines on, sized by nothing, classic colours, evaluations written. */
export const DEFAULT_CASE_DISPLAY: CaseDisplay = {
  showArrows: true,
  arrowWidthSource: DEFAULT_ARROW_WIDTH_SOURCE,
  arrowPalette: DEFAULT_ARROW_PALETTE,
  showMoveMarks: true,
  showEvalBar: true,
  showVariations: true,
  writeEvals: true,
};

/** A stored display, each field read back leniently — a missing or unknown one its default. */
const caseDisplayFrom = (value: unknown): CaseDisplay => {
  const row = isObject(value) ? value : {};
  return {
    showArrows: typeof row.showArrows === "boolean" ? row.showArrows : DEFAULT_CASE_DISPLAY.showArrows,
    arrowWidthSource: arrowWidthSourceFrom(row.arrowWidthSource),
    arrowPalette: arrowPaletteFrom(row.arrowPalette),
    showMoveMarks: typeof row.showMoveMarks === "boolean" ? row.showMoveMarks : DEFAULT_CASE_DISPLAY.showMoveMarks,
    showEvalBar: typeof row.showEvalBar === "boolean" ? row.showEvalBar : DEFAULT_CASE_DISPLAY.showEvalBar,
    showVariations: typeof row.showVariations === "boolean" ? row.showVariations : DEFAULT_CASE_DISPLAY.showVariations,
    writeEvals: typeof row.writeEvals === "boolean" ? row.writeEvals : DEFAULT_CASE_DISPLAY.writeEvals,
  };
};

const sameDisplay = (a: CaseDisplay, b: CaseDisplay): boolean =>
  a.showArrows === b.showArrows &&
  a.arrowWidthSource === b.arrowWidthSource &&
  a.arrowPalette === b.arrowPalette &&
  a.showMoveMarks === b.showMoveMarks &&
  a.showEvalBar === b.showEvalBar &&
  a.showVariations === b.showVariations &&
  a.writeEvals === b.writeEvals;

export type AnalysisCase = {
  id: string;
  /** The reader's name; `""` is derived ({@link caseDerivedName}). */
  name: string;
  type: AnalysisCaseType;
  projectId: string;
  source: AnalysisCaseSource;
  /** The analysis: the whole tree as PGN — side lines, comments, NAGs, `[%eval]`s. */
  pgn: string;
  /** Where the reader stands, as SAN from the start (`sanPathTo` / `nodeAtSanPath`). */
  path: readonly string[];
  orientation: "white" | "black";
  /** How its board draws — its Display tab. */
  display: CaseDisplay;
  /**
   * The Jobs V2 whose computer analysis was merged into `pgn` (CTA-188), by
   * job id, oldest first — how an open board learns its tree has grown under
   * it, and how its autosave never writes the tree from before a merge back
   * (`saveCaseState`). `[]` for a Case none was merged into.
   */
  merges: readonly string[];
  /**
   * **Its place in its Project's order** (CTA-203) — the reader's, 1 the
   * first: a Project can be a tutorial, its Cases its chapters. A new Case
   * goes last (the store sets it — `addAnalysisCases`); reordering it is not
   * an edit, so `updatedAt` stays. `0` is a record from before, given its
   * place by {@link withCaseOrders} as the store reads it.
   */
  order: number;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601 — any change, the autosave's too. */
  updatedAt: string;
};

/** How long a Case's name may be. */
export const MAX_CASE_NAME = 200;

const sanList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((san): san is string => typeof san === "string") : [];

const sourceFrom = (value: unknown, pgn: string): AnalysisCaseSource => {
  if (isObject(value)) {
    if (value.kind === "fen" && typeof value.fen === "string" && value.fen !== "") {
      return { kind: "fen", fen: value.fen };
    }
    if (value.kind === "pgn" && typeof value.pgn === "string" && value.pgn !== "") {
      return { kind: "pgn", pgn: value.pgn, startPath: sanList(value.startPath), fen: stringOr(value.fen, "") };
    }
  }
  // A source that will not read: the analysis itself stands for it.
  return { kind: "pgn", pgn, startPath: [], fen: "" };
};

/**
 * A stored Case, normalised — `undefined` for a row without its identity (an
 * id, its Project, its analysis). A source that will not read is the
 * analysis' own PGN; an unknown type a Game.
 */
export const analysisCaseFrom = (value: unknown): AnalysisCase | undefined => {
  if (
    !isObject(value) ||
    typeof value.id !== "string" ||
    value.id === "" ||
    typeof value.projectId !== "string" ||
    value.projectId === "" ||
    typeof value.pgn !== "string" ||
    value.pgn === ""
  ) {
    return undefined;
  }
  const createdAt = stringOr(value.createdAt, "");
  return {
    id: value.id,
    name: stringOr(value.name, "").slice(0, MAX_CASE_NAME),
    type: value.type === "position" ? "position" : "game",
    projectId: value.projectId,
    source: sourceFrom(value.source, value.pgn),
    pgn: value.pgn,
    path: sanList(value.path),
    orientation: value.orientation === "black" ? "black" : "white",
    display: caseDisplayFrom(value.display),
    merges: sanList(value.merges),
    order: typeof value.order === "number" && Number.isInteger(value.order) && value.order > 0 ? value.order : 0,
    createdAt,
    updatedAt: stringOr(value.updatedAt, createdAt),
  };
};

/** The Cases of one Project, in the caller's order. */
export const casesOf = (cases: readonly AnalysisCase[], projectId: string): AnalysisCase[] =>
  cases.filter((record) => record.projectId === projectId);

/* ------------------------------------------------------------------ *
 * A Project's order (CTA-203)
 * ------------------------------------------------------------------ */

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * **A Project's order**: by `order`, a Case without one (`0`) after every
 * Case with one; ties — which only an older record or an import can make —
 * oldest first, then by id, so the order is total.
 */
export const byCaseOrder = (a: Pick<AnalysisCase, "order" | "createdAt" | "id">, b: Pick<AnalysisCase, "order" | "createdAt" | "id">): number => {
  if (a.order !== b.order) {
    if (a.order === 0) return 1;
    if (b.order === 0) return -1;
    return a.order - b.order;
  }
  return compareText(a.createdAt, b.createdAt) || compareText(a.id, b.id);
};

/** The Cases of one Project in its order. */
export const casesInOrder = (cases: readonly AnalysisCase[], projectId: string): AnalysisCase[] =>
  casesOf(cases, projectId).sort(byCaseOrder);

/** Each Project's highest `order`, by Project id. */
const highestOrders = (cases: readonly AnalysisCase[]): Map<string, number> => {
  const highest = new Map<string, number>();
  for (const record of cases) highest.set(record.projectId, Math.max(highest.get(record.projectId) ?? 0, record.order));
  return highest;
};

/**
 * **Cases put last in their Projects** — each given the next `order` after
 * the highest its Project holds in `current`, in the order they come:
 * every new Case, one moved in from another Project, a copy, a job's result.
 */
export const appendedCases = (current: readonly AnalysisCase[], added: readonly AnalysisCase[]): AnalysisCase[] => {
  const highest = highestOrders(current);
  return added.map((record) => {
    const order = (highest.get(record.projectId) ?? 0) + 1;
    highest.set(record.projectId, order);
    return record.order === order ? record : { ...record, order };
  });
};

/**
 * **Every Case given its place** — a record from before (`order` `0`) put
 * after the highest its Project holds, oldest first, so a Project of them
 * alone reads 1 (the oldest), 2, …. The same array back when every Case has
 * one. What the store runs over every read (and writes back), and an
 * import over the Cases it brings.
 */
export const withCaseOrders = (cases: readonly AnalysisCase[]): readonly AnalysisCase[] => {
  const missing = cases.filter((record) => record.order === 0);
  if (missing.length === 0) return cases;
  const placed = new Map(
    appendedCases(
      cases.filter((record) => record.order !== 0),
      [...missing].sort(byCaseOrder),
    ).map((record) => [record.id, record]),
  );
  return cases.map((record) => placed.get(record.id) ?? record);
};

/**
 * **These Projects' orders closed up** — their Cases numbered 1, 2, … in
 * their order, after a Case left (deleted, moved away). Only a Case whose
 * number changes is a new object; the same array back when none does.
 */
export const compactedCaseOrders = (cases: readonly AnalysisCase[], projectIds: Iterable<string>): readonly AnalysisCase[] => {
  const numbers = new Map<string, number>();
  for (const projectId of new Set(projectIds)) {
    casesInOrder(cases, projectId).forEach((record, index) => numbers.set(record.id, index + 1));
  }
  let changed = false;
  const next = cases.map((record) => {
    const order = numbers.get(record.id);
    if (order === undefined || order === record.order) return record;
    changed = true;
    return { ...record, order };
  });
  return changed ? next : cases;
};

/** Where a reorder takes a Case in its Project: one place up or down, or to either end. */
export type CaseOrderMove = "up" | "down" | "top" | "bottom";

/**
 * **A Case moved in its Project's order** — its Project then numbered 1, 2,
 * … again; nothing else about any Case changes (`updatedAt` neither). The
 * same array back for an unknown Case, or a move past an end.
 */
export const reorderedCases = (cases: readonly AnalysisCase[], id: string, move: CaseOrderMove): readonly AnalysisCase[] => {
  const record = cases.find((candidate) => candidate.id === id);
  if (record === undefined) return cases;
  const line = casesInOrder(cases, record.projectId);
  const from = line.indexOf(record);
  const to = move === "up" ? from - 1 : move === "down" ? from + 1 : move === "top" ? 0 : line.length - 1;
  if (to < 0 || to >= line.length || to === from) return cases;
  line.splice(from, 1);
  line.splice(to, 0, record);
  const numbers = new Map(line.map((entry, index) => [entry.id, index + 1]));
  let changed = false;
  const next = cases.map((entry) => {
    const order = numbers.get(entry.id);
    if (order === undefined || order === entry.order) return entry;
    changed = true;
    return { ...entry, order };
  });
  return changed ? next : cases;
};

/** How many Cases each Project holds, by Project id. */
export const caseCountsOf = (cases: readonly AnalysisCase[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const record of cases) counts.set(record.projectId, (counts.get(record.projectId) ?? 0) + 1);
  return counts;
};

/** The side to move in a FEN. */
const turnOf = (fen: string): "w" | "b" => (fen.split(" ")[1] === "b" ? "b" : "w");

const facing = (fen: string): "white" | "black" => (turnOf(fen) === "b" ? "black" : "white");

/** The full-move number of a FEN — `1` where it cannot be read. */
export const moveNumberOf = (fen: string): number => {
  const number = Number.parseInt(fen.split(" ")[5] ?? "", 10);
  return Number.isFinite(number) && number > 0 ? number : 1;
};

/**
 * A Game's name from its tags: "White – Black, Event, year" — each part only
 * where the tags name it (a `?` is no name), `""` when none does.
 */
export const gameCaseDerivedName = (headers: GameHeaders): string => {
  const white = gameTag(headers, "White");
  const black = gameTag(headers, "Black");
  const event = gameTag(headers, "Event");
  const year = gameTag(headers, "Date")?.slice(0, 4);
  const players = white !== undefined && black !== undefined ? `${white} – ${black}` : (white ?? black);
  return [players, event, year !== undefined && /^\d{4}$/.test(year) ? year : undefined]
    .filter((part): part is string => part !== undefined && part !== "")
    .join(", ");
};

/**
 * What a Case with no name of its own is called: a Game by its tags (read
 * off the source, never parsing the analysis), a Position by its side to
 * move and move number — words the screen puts in the reader's language.
 */
export type CaseDerivedName =
  | { kind: "game"; text: string }
  | { kind: "position"; turn: "w" | "b"; moveNumber: number };

export const caseDerivedName = (record: Pick<AnalysisCase, "type" | "source" | "pgn">): CaseDerivedName => {
  if (record.type === "position") {
    const fen = record.source.fen !== "" ? record.source.fen : DEFAULT_POSITION;
    return { kind: "position", turn: turnOf(fen), moveNumber: moveNumberOf(fen) };
  }
  return { kind: "game", text: gameCaseDerivedName(readPgnTags(record.source.kind === "pgn" ? record.source.pgn : record.pgn)) };
};

/** The Case's tree, or `undefined` for one whose PGN will not parse. */
export const caseTree = (record: Pick<AnalysisCase, "pgn">): GameTree | undefined => {
  try {
    return parsePgnTree(record.pgn);
  } catch {
    return undefined;
  }
};

/** Where the reader stood, resolved against the tree — a node id, or `null` for the start. */
export const caseNode = (record: Pick<AnalysisCase, "path">, tree: GameTree): string | null =>
  nodeAtSanPath(tree, record.path);

/** What a new Case is made of: its id, Project, name (`""` to derive it) and the moment. */
export type NewCase = { id: string; projectId: string; name: string; now?: Date };

const caseOf = (
  { id, projectId, name, now = new Date() }: NewCase,
  type: AnalysisCaseType,
  source: AnalysisCaseSource,
  tree: GameTree,
  path: readonly string[],
  orientation: "white" | "black",
): AnalysisCase => ({
  id,
  name: name.trim().slice(0, MAX_CASE_NAME),
  type,
  projectId,
  source,
  pgn: treeToPgn(tree),
  path: [...path],
  orientation,
  display: { ...DEFAULT_CASE_DISPLAY },
  merges: [],
  // Its place is the store's to give — last in its Project (`addAnalysisCases`).
  order: 0,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

/** **A Game Case** of one parsed game — it opens at the start, facing White (a game does not turn the board). */
export const gameCaseOf = (made: NewCase, tree: GameTree, display?: Partial<CaseDisplay>): AnalysisCase => {
  const pgn = treeToPgn(tree);
  const record = caseOf(made, "game", { kind: "pgn", pgn, startPath: [], fen: tree.startFen }, tree, [], "white");
  // How its board draws, where the maker says (CTA-244 — a Find Best Move session's, evaluations not written); absent, the defaults.
  return display === undefined ? record : { ...record, display: { ...record.display, ...display } };
};

/** **A Position Case** of a FEN (already checked with `parseFen`) — facing the side to move. */
export const positionCaseOfFen = (made: NewCase, fen: string): AnalysisCase =>
  caseOf(made, "position", { kind: "fen", fen }, emptyTree(fen), [], facing(fen));

/**
 * **A Position Case** of a parsed game, at the node the reader picked: the
 * moves before it kept as context, the Case opening there, facing the side to
 * move.
 */
export const positionCaseOfGame = (made: NewCase, tree: GameTree, nodeId: string | null): AnalysisCase => {
  const startPath = sanPathTo(tree, nodeId);
  const fen = fenAtNode(tree, nodeId);
  return caseOf(made, "position", { kind: "pgn", pgn: treeToPgn(tree), startPath, fen }, tree, startPath, facing(fen));
};

/**
 * The analysis on a Case as the board holds it now, and how it draws — what
 * the autosave writes; `merges`, the Jobs V2 merges the board's tree holds
 * (CTA-188) — absent, none.
 */
export type CaseState = {
  pgn: string;
  path: readonly string[];
  orientation: "white" | "black";
  display: CaseDisplay;
  merges?: readonly string[];
};

/** The board's state as a Case keeps it. */
export const caseStateOf = (
  tree: GameTree,
  nodeId: string | null,
  orientation: "white" | "black",
  display: CaseDisplay = DEFAULT_CASE_DISPLAY,
  merges: readonly string[] = [],
): CaseState => ({ pgn: treeToPgn(tree), path: sanPathTo(tree, nodeId), orientation, display, merges });

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * Whether a state's tree is **from before a merge** the Case holds (CTA-188):
 * a Jobs V2 merge the record lists that the state does not. Its tree must not
 * be written over the merged one.
 */
export const isBehindMerges = (record: Pick<AnalysisCase, "merges">, state: Pick<CaseState, "merges">): boolean => {
  const known = new Set(state.merges ?? []);
  return record.merges.some((id) => !known.has(id));
};

/** Whether a Case already holds this state — the autosave's idempotency. A state behind a merge holds its tree as the record's. */
export const sameCaseState = (record: AnalysisCase, state: CaseState): boolean =>
  (isBehindMerges(record, state) || (record.pgn === state.pgn && sameList(record.merges, state.merges ?? []))) &&
  record.orientation === state.orientation &&
  sameDisplay(record.display, state.display) &&
  sameList(record.path, state.path);

/**
 * Whether a state differs from what a Case holds **only in the move on
 * screen** (CTA-222) — the tree, the merges, the orientation and the display
 * the same. Such a change is the reader stepping through the game:
 * `saveCaseState` writes it quietly, the open board's screen not redrawn for it.
 */
export const onlyCasePathDiffers = (record: CaseState, state: CaseState): boolean =>
  record.pgn === state.pgn &&
  sameList(record.merges ?? [], state.merges ?? []) &&
  record.orientation === state.orientation &&
  sameDisplay(record.display, state.display) &&
  !sameList(record.path, state.path);

/** A Case copied under a new id into a Project — its source, analysis and place on the board; its name as given. Its place in the Project's order is the store's to give. */
export const copiedCase = (
  record: AnalysisCase,
  id: string,
  projectId: string,
  name: string,
  now: Date = new Date(),
): AnalysisCase => ({
  ...record,
  id,
  projectId,
  name: name.trim().slice(0, MAX_CASE_NAME),
  path: [...record.path],
  order: 0,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

/* ------------------------------------------------------------------ *
 * Links between Cases (CTA-188)
 * ------------------------------------------------------------------ */

/** How many links are kept, across every Case. */
export const MAX_CASE_LINKS = 50_000;

/**
 * **A link from one Case to another** (CTA-188) — directed (`fromId` links to
 * `toId`), many to many, across Projects: a Case links to any number and is
 * linked from any number, cycles allowed; never to itself, never twice the
 * same pair (`lib/analysisCaseLinkStore.ts`). Removed with either Case. A Jobs
 * V2 computer analysis links its source Case to every new Case it makes; the
 * reader links and unlinks on a Case's Info tab.
 */
export type CaseLink = {
  id: string;
  fromId: string;
  toId: string;
  /** ISO 8601. */
  createdAt: string;
};

/** A stored link, normalised — `undefined` for one without its id or either end, or one to itself. */
export const caseLinkFrom = (value: unknown): CaseLink | undefined => {
  if (!isObject(value) || typeof value.id !== "string" || value.id === "") return undefined;
  const fromId = idOrNull(value.fromId);
  const toId = idOrNull(value.toId);
  if (fromId === null || toId === null || fromId === toId) return undefined;
  return { id: value.id, fromId, toId, createdAt: stringOr(value.createdAt, "") };
};

/** One end of a Case's link: the link, and the Case at its other end. */
export type CaseLinkEnd = { link: CaseLink; record: AnalysisCase };

/**
 * The Cases `caseId` links to, and the ones linking to it — each link with the
 * Case at its other end, in the links' order; a link whose other end is gone
 * is left out.
 */
export const caseLinksOf = (
  links: readonly CaseLink[],
  cases: readonly AnalysisCase[],
  caseId: string,
): { to: CaseLinkEnd[]; from: CaseLinkEnd[] } => {
  const byId = new Map(cases.map((record) => [record.id, record]));
  const ends = (side: "to" | "from") =>
    links.flatMap((link) => {
      const near = side === "to" ? link.fromId : link.toId;
      const record = byId.get(side === "to" ? link.toId : link.fromId);
      return near === caseId && record !== undefined ? [{ link, record }] : [];
    });
  return { to: ends("to"), from: ends("from") };
};
