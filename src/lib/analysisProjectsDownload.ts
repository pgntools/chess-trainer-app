import { strToU8, zipSync } from "fflate";

import { projectPicksDeletion, projectPicksOf } from "./analysisProjectPicks";
import {
  casesInOrder,
  projectFolderChildren,
  type AnalysisCase,
  type AnalysisProject,
  type ProjectFolder,
} from "./analysisProjects";
import { pgnFileOf } from "./pgnExport";

/**
 * **Analysis's picks downloaded** (CTA-241) — the Projects browser's zip and
 * the Project view's `.pgn`, written by one module. Pure: what goes in which
 * file, and the zip's bytes; the screens hand them to the browser
 * (`lib/pgnExport.ts`).
 *
 * - **A Case is written as its Export tab writes it** ({@link casePgnOf}): the
 *   record's `pgn` — the autosaved tree, `treeToPgn`'s, side lines, comments
 *   and NAGs kept — never re-parsed; a Position Case of a FEN carries its
 *   `[SetUp "1"]` / `[FEN …]` (the tree's start writes them; a record without
 *   them is given them).
 * - **A Project is one `.pgn`** of its Cases in the Project's order
 *   (`casesInOrder`), named after it.
 * - **The browser's zip mirrors the picks** ({@link picksDownloadEntries}),
 *   read the way the delete reads them (`projectPicksDeletion`): a directory
 *   per ticked folder — its sub-folders nested, an empty one kept — with a
 *   `.pgn` per Project in it; each ticked Project outside a ticked folder a
 *   `.pgn` at the top; the Cases ticked without their Project one more `.pgn`
 *   per Project, named after it, holding them in its order.
 * - **The names are the reader's, made safe** ({@link safeFileName}): no
 *   separator, reserved character or control character, no name Windows
 *   reserves, no dot or space at either end, at most
 *   {@link MAX_FILE_NAME_CHARS}; two that clash in one directory (any case)
 *   numbered, "Name (2)".
 */

/** What the picks are read against — the records as stored. */
export type ProjectsDownloadModel = {
  folders: readonly ProjectFolder[];
  projects: readonly AnalysisProject[];
  cases: readonly AnalysisCase[];
};

/** A name for what the reader left unnamed, in their language. */
export type ProjectsDownloadNames = { untitledFolder: string; untitledProject: string };

/** One entry of the zip: a `.pgn` and its text, or a directory (`text` `null`, its path ending in `/`). */
export type ProjectsDownloadEntry = { path: string; text: string | null };

/** The longest name a file or directory is given, in characters — the extension aside. */
export const MAX_FILE_NAME_CHARS = 100;

// Path separators, the characters Windows refuses, and control characters.
// eslint-disable-next-line no-control-regex -- control characters are what this removes
const UNSAFE_CHARS = /[\u0000-\u001f\u007f<>:"/\\|?*]/g;
/** The names Windows keeps for devices, with or without an extension. */
const RESERVED_NAME = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

const trimmedName = (name: string): string =>
  name
    .replace(/\s+/g, " ")
    .replace(UNSAFE_CHARS, "_")
    .replace(/^[\s.]+|[\s.]+$/g, "");

/**
 * **A reader's name as a file's** — the characters a file system refuses
 * replaced by `_`, white space folded, no dot or space at either end, cut to
 * {@link MAX_FILE_NAME_CHARS} (by character, never inside one), a name
 * Windows reserves (`CON`, `NUL`, `COM1` …) given a `_`; nothing left, the
 * fallback's, else `untitled`. Hebrew and every other script kept.
 */
export const safeFileName = (name: string, fallback = "untitled"): string => {
  const cut = (text: string) => trimmedName(Array.from(trimmedName(text)).slice(0, MAX_FILE_NAME_CHARS).join(""));
  const safe = cut(name) || cut(fallback) || "untitled";
  return RESERVED_NAME.test(safe) ? `${safe}_` : safe;
};

/** The tag section's names, as written — enough to tell whether `[FEN …]` is there. */
const hasTag = (pgn: string, tag: string): boolean => new RegExp(`^\\s*\\[${tag}\\s+"`, "m").test(pgn.split(/\n\s*\n/, 1)[0] ?? "");

/**
 * **One Case as its Export tab writes it**: the tree as kept (its `pgn`),
 * side lines and comments too. A Position Case of a FEN whose record lacks
 * its `[FEN]` is given `[SetUp "1"]` and `[FEN …]` first, so it reloads at
 * its position; a Position Case of a PGN begins where its game does, its
 * moves before the position kept, and is written as it is.
 */
export const casePgnOf = (record: AnalysisCase): string => {
  const pgn = record.pgn.trim();
  if (record.type !== "position" || record.source.kind !== "fen" || hasTag(pgn, "FEN")) return pgn;
  const tags = [...(hasTag(pgn, "SetUp") ? [] : ['[SetUp "1"]']), `[FEN "${record.source.fen}"]`].join("\n");
  return pgn.startsWith("[") ? `${tags}\n${pgn}` : `${tags}\n\n${pgn}`;
};

/** **A Project's Cases, written** — in the Project's order; `only` given, those of them alone. */
export const projectCasePgns = (cases: readonly AnalysisCase[], projectId: string, only?: ReadonlySet<string>): string[] =>
  casesInOrder(cases, projectId)
    .filter((record) => only === undefined || only.has(record.id))
    .map(casePgnOf);

/** Names taken in one directory, any case — the next of a name numbered. */
const namer = () => {
  const taken = new Set<string>();
  return (stem: string, extension: string): string => {
    for (let n = 1; ; n += 1) {
      const name = `${n === 1 ? stem : `${stem} (${n})`}${extension}`;
      if (!taken.has(name.toLowerCase())) {
        taken.add(name.toLowerCase());
        return name;
      }
    }
  };
};

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

/**
 * **The browser's picks as the zip's entries**, in order: the ticked
 * folders (by name), each a directory — its sub-folders, then its Projects'
 * `.pgn`s, by name — then the ticked Projects outside them, then a `.pgn`
 * per Project of the Cases ticked on their own. Nothing ticked, nothing.
 */
export const picksDownloadEntries = (
  model: ProjectsDownloadModel,
  picked: ReadonlySet<string>,
  names: ProjectsDownloadNames,
): ProjectsDownloadEntry[] => {
  const { folders, projects, cases } = model;
  const picks = projectPicksDeletion(model, projectPicksOf(model, picked));
  const projectsIn = (folderId: string) => projects.filter((project) => project.folderId === folderId).sort(byName);
  const projectFile = (project: AnalysisProject) => safeFileName(project.name, names.untitledProject);
  const entries: ProjectsDownloadEntry[] = [];

  const writeFolder = (folder: ProjectFolder, path: string, seen: Set<string>) => {
    if (seen.has(folder.id)) return; // a cycle the normaliser missed
    seen.add(folder.id);
    entries.push({ path, text: null });
    const name = namer();
    for (const child of projectFolderChildren(folders, folder.id)) {
      writeFolder(child, `${path}${name(safeFileName(child.name, names.untitledFolder), "")}/`, seen);
    }
    for (const project of projectsIn(folder.id)) {
      entries.push({ path: `${path}${name(projectFile(project), ".pgn")}`, text: pgnFileOf(projectCasePgns(cases, project.id)) });
    }
  };

  const top = namer();
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const topFolders = picks.folderIds.flatMap((id) => byId.get(id) ?? []).sort(byName);
  for (const folder of topFolders) writeFolder(folder, `${top(safeFileName(folder.name, names.untitledFolder), "")}/`, new Set());

  const projectById = new Map(projects.map((project) => [project.id, project]));
  for (const project of picks.projectIds.flatMap((id) => projectById.get(id) ?? []).sort(byName)) {
    entries.push({ path: top(projectFile(project), ".pgn"), text: pgnFileOf(projectCasePgns(cases, project.id)) });
  }

  // The Cases ticked on their own, by their Project.
  const alone = new Set(picks.caseIds);
  const theirProjects = [...new Set(cases.filter((record) => alone.has(record.id)).map((record) => record.projectId))]
    .flatMap((id) => projectById.get(id) ?? [])
    .sort(byName);
  for (const project of theirProjects) {
    entries.push({ path: top(projectFile(project), ".pgn"), text: pgnFileOf(projectCasePgns(cases, project.id, alone)) });
  }
  return entries;
};

/** **The zip's bytes** — each `.pgn` as UTF-8, each directory an entry of its own, in the order given. */
export const zipDownloadEntries = (entries: readonly ProjectsDownloadEntry[]): Uint8Array<ArrayBuffer> =>
  zipSync(Object.fromEntries(entries.map((entry) => [entry.path, entry.text === null ? new Uint8Array(0) : strToU8(entry.text)])));
