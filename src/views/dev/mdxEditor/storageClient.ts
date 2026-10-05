/**
 * **The MDX editor's side of its storage service** (CTA-137) — the local
 * server `yarn mdx-editor:start` runs (`scripts/mdx-editor-server.ts`), which
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

/** A folder under `articles/` — `""` is the root — with its index's title and its `.mdx` and `.pgn` files. */
export type StorageFolder = { path: string; title?: string; files: string[] };

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
