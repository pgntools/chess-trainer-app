/**
 * **The MDX editor's side of its storage service** (CTA-137) — the local
 * server `yarn mdx-editor:start` runs (`../server/storageServer.ts`), which
 * writes into `src/views/blog/articles/`. Every call answers in words the
 * editor can act on — the service being down among them — and none throws.
 */

/** The command that starts the service — what the editor tells the reader to run. */
export const STORAGE_COMMAND = "yarn mdx-editor:start";
/** Where the articles are written, from the checkout's root. */
export const ARTICLES_DIR = "src/views/blog/articles";

/** The port the server listens on — its default, or `VITE_MDX_EDITOR_PORT` (`.env.local`), which the server reads too. */
const PORT = Number(import.meta.env.VITE_MDX_EDITOR_PORT ?? 5172);
export const STORAGE_URL = `http://127.0.0.1:${PORT}`;

/** An article file's title, date and draft, from its frontmatter. */
export type ArticleFacts = { title?: string; date?: string; draft?: boolean };

/** A folder under `articles/` — `""` is the root — with its index's title, its `.mdx` and `.pgn` files, and each `.mdx`'s facts. */
export type StorageFolder = { path: string; title?: string; files: string[]; articles?: Record<string, ArticleFacts> };

/** What a write came to. */
export type WriteResult =
  | { kind: "written"; path: string; foldersCreated: string[] }
  /** Another file is there already: write again with `overwrite` to replace it. */
  | { kind: "exists"; path: string }
  /** The service would not write it, and why. */
  | { kind: "refused"; message: string }
  /** No service answered. */
  | { kind: "down" };

const errorOf = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not the service's JSON — the status will do.
  }
  return `The service answered ${response.status}.`;
};

/** The Blog's folders, as the service finds them on disk — or that it is not running, or what it refused. */
export const listStorageFolders = async (): Promise<{ kind: "folders"; folders: StorageFolder[] } | { kind: "down" } | { kind: "refused"; message: string }> => {
  let response: Response;
  try {
    response = await fetch(`${STORAGE_URL}/folders`);
  } catch {
    return { kind: "down" };
  }
  if (!response.ok) return { kind: "refused", message: await errorOf(response) };
  const body = (await response.json()) as { folders?: StorageFolder[] };
  return { kind: "folders", folders: body.folders ?? [] };
};

/** `path` (under `articles/`, `.mdx` or `.pgn`) written with `content`, over a file already there only with `overwrite`. */
export const writeStorageFile = async (path: string, content: string, overwrite = false): Promise<WriteResult> => {
  let response: Response;
  try {
    response = await fetch(`${STORAGE_URL}/files`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content, overwrite }),
    });
  } catch {
    return { kind: "down" };
  }
  if (response.status === 409) return { kind: "exists", path };
  if (!response.ok) return { kind: "refused", message: await errorOf(response) };
  const body = (await response.json()) as { written?: string; foldersCreated?: string[] };
  return { kind: "written", path: body.written ?? path, foldersCreated: body.foldersCreated ?? [] };
};

/** A file of the articles folder that git has not got as it is: new, changed, deleted or renamed. */
export type GitFile = { path: string; state: "new" | "changed" | "deleted" | "renamed"; bytes?: number };

/** A file's state, in words. */
export const GIT_STATE_WORDS: Readonly<Record<GitFile["state"], string>> = {
  new: "not in git yet",
  changed: "changed since the last commit",
  deleted: "deleted, not committed",
  renamed: "renamed, not committed",
};

/** What git has not got of the articles folder — or that it cannot say, or that the service is down. */
export type GitStatus = { kind: "status"; branch: string; files: GitFile[] } | { kind: "unavailable"; reason: string } | { kind: "down" };

/** The articles folder's git status, from the service — read only. */
export const readGitStatus = async (): Promise<GitStatus> => {
  let response: Response;
  try {
    response = await fetch(`${STORAGE_URL}/git-status`);
  } catch {
    return { kind: "down" };
  }
  if (!response.ok) return { kind: "unavailable", reason: await errorOf(response) };
  const body = (await response.json()) as { available?: boolean; branch?: string; files?: GitFile[]; reason?: string };
  return body.available === true ? { kind: "status", branch: body.branch ?? "", files: body.files ?? [] } : { kind: "unavailable", reason: body.reason ?? "git could not say." };
};

/** The folders (under articles/, `""` its root) holding a file git has not got — and every folder above one. */
export const unsyncedFoldersOf = (files: readonly GitFile[]): ReadonlySet<string> => {
  const folders = new Set<string>();
  for (const { path } of files) {
    const parts = path.split("/").slice(0, -1);
    folders.add("");
    for (let depth = 1; depth <= parts.length; depth += 1) folders.add(parts.slice(0, depth).join("/"));
  }
  return folders;
};

/** The articles importing a PGN file (a path under `articles/`) — `undefined` when the service cannot say. */
export const readImporters = async (path: string): Promise<string[] | undefined> => {
  try {
    const response = await fetch(`${STORAGE_URL}/importers?path=${encodeURIComponent(path)}`);
    if (!response.ok) return undefined;
    return ((await response.json()) as { importers?: string[] }).importers ?? [];
  } catch {
    return undefined;
  }
};

/** Files under `articles/` deleted — all of them, or none when the service refuses one. */
export const deleteStorageFiles = async (paths: readonly string[]): Promise<{ kind: "deleted"; paths: string[] } | { kind: "refused"; message: string } | { kind: "down" }> => {
  let response: Response;
  try {
    response = await fetch(`${STORAGE_URL}/files`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths }) });
  } catch {
    return { kind: "down" };
  }
  if (!response.ok) return { kind: "refused", message: await errorOf(response) };
  return { kind: "deleted", paths: ((await response.json()) as { deleted?: string[] }).deleted ?? [] };
};
