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
/** Across every Project. */
export const MAX_ANALYSIS_CASES = 10_000;

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
 * the engine's eval bar and lines. Kept with the Case, autosaved like its
 * analysis.
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
};

/** A new Case's display — and an older record's, which has none: arrows, marks, eval bar and lines on, sized by nothing, classic colours. */
export const DEFAULT_CASE_DISPLAY: CaseDisplay = {
  showArrows: true,
  arrowWidthSource: DEFAULT_ARROW_WIDTH_SOURCE,
  arrowPalette: DEFAULT_ARROW_PALETTE,
  showMoveMarks: true,
  showEvalBar: true,
  showVariations: true,
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
  };
};

const sameDisplay = (a: CaseDisplay, b: CaseDisplay): boolean =>
  a.showArrows === b.showArrows &&
  a.arrowWidthSource === b.arrowWidthSource &&
  a.arrowPalette === b.arrowPalette &&
  a.showMoveMarks === b.showMoveMarks &&
  a.showEvalBar === b.showEvalBar &&
  a.showVariations === b.showVariations;

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
    createdAt,
    updatedAt: stringOr(value.updatedAt, createdAt),
  };
};

/** The Cases of one Project, in the caller's order. */
export const casesOf = (cases: readonly AnalysisCase[], projectId: string): AnalysisCase[] =>
  cases.filter((record) => record.projectId === projectId);

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
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

/** **A Game Case** of one parsed game — it opens at the start, facing White (a game does not turn the board). */
export const gameCaseOf = (made: NewCase, tree: GameTree): AnalysisCase => {
  const pgn = treeToPgn(tree);
  return caseOf(made, "game", { kind: "pgn", pgn, startPath: [], fen: tree.startFen }, tree, [], "white");
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

/** The analysis on a Case as the board holds it now, and how it draws — what the autosave writes. */
export type CaseState = { pgn: string; path: readonly string[]; orientation: "white" | "black"; display: CaseDisplay };

/** The board's state as a Case keeps it. */
export const caseStateOf = (
  tree: GameTree,
  nodeId: string | null,
  orientation: "white" | "black",
  display: CaseDisplay = DEFAULT_CASE_DISPLAY,
): CaseState => ({ pgn: treeToPgn(tree), path: sanPathTo(tree, nodeId), orientation, display });

/** Whether a Case already holds this state — the autosave's idempotency. */
export const sameCaseState = (record: AnalysisCase, state: CaseState): boolean =>
  record.pgn === state.pgn &&
  record.orientation === state.orientation &&
  sameDisplay(record.display, state.display) &&
  record.path.length === state.path.length &&
  record.path.every((san, index) => san === state.path[index]);

/** A Case copied under a new id into a Project — its source, analysis and place; its name as given. */
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
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

