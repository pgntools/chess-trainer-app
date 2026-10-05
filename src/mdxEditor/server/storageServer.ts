/**
 * **The MDX editor's storage service** (CTA-137) — started by
 * `yarn mdx-editor:start` (`start.ts`) beside Vite.
 *
 * A small local server the MDX editor (`/dev/mdx-editor`) saves through: it
 * writes an article's `.mdx`, or a `.pgn` an article imports, straight into
 * `src/views/blog/articles/`, where Vite's watcher picks it up. Node alone
 * (`node:http`, run as TypeScript by Node's own type stripping) — no
 * dependency, and nothing of it ships.
 *
 *   GET  /health   → { ok: true, service, articles }
 *   GET  /folders  → { folders: [{ path, title?, files }] } — every folder under
 *                    articles/ (the root is ""), its index's title, its .mdx
 *                    and .pgn files
 *   PUT  /files    { path, content, overwrite? } → 201 { written, created, foldersCreated }
 *                    409 { error, exists: path } when the file is there and
 *                    `overwrite` is not set
 *
 * **What it refuses** (400): a path that is not relative, that leaves
 * `articles/` — `..`, absolute, a backslash, or a symlink pointing out — or a
 * file that is not `.mdx` or `.pgn`; a folder or `.mdx` name that is not a
 * Blog path (lower-case words and dashes). A folder the path names that is
 * not there yet is made, with a stub `index.mdx` titled from its name, so the
 * Blog registers it. Nothing is ever moved or deleted.
 *
 * **Who it answers** (403 otherwise): a request whose `Host` is this
 * machine's loopback (no DNS rebinding) and, from a browser, whose `Origin`
 * is a local one — `http://localhost:<port>`, `127.0.0.1` or `[::1]`, where
 * Vite's dev server runs — or one of `MDX_EDITOR_ORIGINS` (comma-separated)
 * when that is set. A write must be JSON, so a page elsewhere cannot send one
 * without the preflight this refuses.
 *
 * It listens on `127.0.0.1:5172`, or `VITE_MDX_EDITOR_PORT` — the same
 * variable the editor reads (`start.ts` reads `.env.local` / `.env` for it).
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

/** The port the editor and the server agree on, unless `VITE_MDX_EDITOR_PORT` says otherwise. */
export const DEFAULT_PORT = 5172;
/** Where articles live, from the checkout's root. */
export const ARTICLES = "src/views/blog/articles";
/** The largest body a write takes — the biggest shipped PGN is ~5 MB. */
const MAX_BODY_BYTES = 32 * 1024 * 1024;

/** A Blog path segment — a folder's name, an article's slug. */
const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
/** An article file's name: a slug or `index`, a language's two letters optional, `.mdx`. */
const MDX_NAME = /^[a-z0-9][a-z0-9-]*(?:\.[a-z]{2})?\.mdx$/;
/** A PGN's name: letters, digits, dots, dashes and underscores, `.pgn`. */
const PGN_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pgn$/;

export type StorageRequest = {
  method: string;
  /** The request's path and query — `/folders`. */
  url: string;
  /** The `Origin` header — absent from a request no browser made. */
  origin?: string;
  /** The `Host` header. */
  host?: string;
  /** The `Content-Type` header. */
  contentType?: string;
  body?: string;
};

export type StorageResponse = { status: number; headers: Record<string, string>; body?: string };

export type StorageOptions = {
  /** The articles folder — the only place anything is written. */
  root: string;
  /** The origins a browser may call from; absent, any loopback origin. */
  origins?: readonly string[];
};

/** A folder under `articles/`, as `GET /folders` lists it. */
export type StorageFolder = { path: string; title?: string; files: string[] };

class Refused extends Error {}

/** A loopback host, with or without a port: `localhost`, `127.0.0.1`, `[::1]`. */
const LOOPBACK = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const LOOPBACK_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

const originAllowed = (origin: string, origins: readonly string[] | undefined): boolean =>
  origins === undefined ? LOOPBACK_ORIGIN.test(origin) : origins.includes(origin);

/** `new-folder` → "New folder" — a stub index's title. */
const titleFromName = (name: string): string => {
  const words = name.replace(/-+/g, " ").trim();
  return words === "" ? name : `${words[0].toUpperCase()}${words.slice(1)}`;
};

/** The stub `index.mdx` a folder made for a write gets, so the Blog names it. */
export const stubIndexOf = (name: string): string => `---\ntitle: ${JSON.stringify(titleFromName(name))}\n---\n`;

/** Whether `child` is `parent` or inside it. */
const inside = (parent: string, child: string): boolean => {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
};

/**
 * **The path guard**: `path` (relative to `root`, `/`-separated) checked and
 * resolved to the file it names — or a `Refused` saying why not. Lexically
 * it must stay under `root`, name a `.mdx` or `.pgn` and use Blog names for
 * its folders; on disk, the nearest part of it that exists must, with its
 * symlinks followed, still be under `root`.
 */
export const resolveArticlePath = (root: string, path: unknown): { absolute: string; folders: string[]; name: string } => {
  if (typeof path !== "string" || path.trim() === "") throw new Refused("No path to write.");
  if (path.includes("\0") || path.includes("\\")) throw new Refused(`${path}: not a path under articles/ — use / between folders.`);
  if (path.startsWith("/") || isAbsolute(path) || /^[A-Za-z]:/.test(path)) throw new Refused(`${path}: an absolute path — give it relative to articles/.`);
  const parts = path.split("/");
  if (parts.some((part) => part === ".." || part === "." || part === "")) throw new Refused(`${path}: leaves articles/ or has an empty folder — give it as folder/name.`);
  const name = parts.at(-1) ?? "";
  const folders = parts.slice(0, -1);
  if (!name.endsWith(".mdx") && !name.endsWith(".pgn")) throw new Refused(`${path}: only .mdx and .pgn files are written.`);
  const bad = folders.find((folder) => !SEGMENT.test(folder));
  if (bad !== undefined) throw new Refused(`${path}: the folder "${bad}" is not a Blog name — lower-case words and dashes.`);
  if (name.endsWith(".mdx") && !MDX_NAME.test(name)) throw new Refused(`${path}: "${name}" is not an article's name — lower-case words and dashes, then .mdx (.he.mdx for a translation).`);
  if (name.endsWith(".pgn") && !PGN_NAME.test(name)) throw new Refused(`${path}: "${name}" is not a PGN's name — letters, digits, dots, dashes and underscores.`);

  const base = resolve(root);
  const absolute = resolve(base, ...parts);
  if (!inside(base, absolute)) throw new Refused(`${path}: leaves articles/.`);

  // Follow what is already on disk: a symlink anywhere along the way may not lead out.
  const realBase = realpathSync(base);
  const link = lstatSync(absolute, { throwIfNoEntry: false });
  // A link to nowhere: writing through it would make its target, wherever that is.
  if (link?.isSymbolicLink() === true && !existsSync(absolute)) throw new Refused(`${path}: is a link to nothing.`);
  let existing = absolute;
  while (!existsSync(existing) && existing !== base) existing = dirname(existing);
  if (!inside(realBase, realpathSync(existing))) throw new Refused(`${path}: leads out of articles/ through a link.`);
  if (existsSync(absolute) && !statSync(absolute).isFile()) throw new Refused(`${path}: is a folder, not a file.`);
  return { absolute, folders, name };
};

/** The `title:` of an `index.mdx`'s frontmatter — enough to name a folder in a picker. */
const titleOf = (indexFile: string): string | undefined => {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(indexFile, "utf8"));
  const line = block?.[1].split(/\r?\n/).find((candidate) => candidate.startsWith("title:"));
  if (line === undefined) return undefined;
  const value = line.slice("title:".length).trim();
  if (/^".*"$/.test(value)) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  return /^'.*'$/.test(value) ? value.slice(1, -1).replace(/''/g, "'") : value || undefined;
};

/** Every folder under `root`, the root first and each folder's sub-folders after it, with its `.mdx` and `.pgn` files. */
export const listFolders = (root: string): StorageFolder[] => {
  const folders: StorageFolder[] = [];
  const walk = (path: string) => {
    const dir = join(root, ...path.split("/").filter(Boolean));
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    const files = entries.filter((entry) => entry.isFile() && /\.(?:mdx|pgn)$/.test(entry.name)).map((entry) => entry.name);
    const title = files.includes("index.mdx") ? titleOf(join(dir, "index.mdx")) : undefined;
    folders.push({ path, ...(title === undefined ? {} : { title }), files });
    for (const entry of entries) if (entry.isDirectory() && SEGMENT.test(entry.name)) walk(path === "" ? entry.name : `${path}/${entry.name}`);
  };
  walk("");
  return folders;
};

const json = (status: number, value: unknown, headers: Record<string, string>): StorageResponse => ({
  status,
  headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(value),
});

/**
 * **The service's handler** — one request in, one response out, the files
 * under `root` written on the way. `startServer` puts it behind `node:http`;
 * the tests call it as it is.
 */
export const createStorageHandler = ({ root, origins }: StorageOptions) => {
  const handle = (request: StorageRequest): StorageResponse => {
    const cors: Record<string, string> = {};
    if (request.host === undefined || !LOOPBACK.test(request.host)) return json(403, { error: "This service answers on this machine's loopback address only." }, cors);
    if (request.origin !== undefined) {
      if (!originAllowed(request.origin, origins)) return json(403, { error: `Origin ${request.origin} may not use this service.` }, cors);
      cors["Access-Control-Allow-Origin"] = request.origin;
      cors["Vary"] = "Origin";
    }
    const route = request.url.split("?")[0];

    if (request.method === "OPTIONS") {
      return {
        status: 204,
        headers: { ...cors, "Access-Control-Allow-Methods": "GET, PUT, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" },
      };
    }
    if (request.method === "GET" && route === "/health") return json(200, { ok: true, service: "mdx-editor-storage", articles: ARTICLES }, cors);
    if (request.method === "GET" && route === "/folders") return json(200, { folders: listFolders(root) }, cors);
    if (request.method === "PUT" && route === "/files") {
      if (!(request.contentType ?? "").startsWith("application/json")) return json(415, { error: "A write is JSON: { path, content, overwrite? }." }, cors);
      let payload: { path?: unknown; content?: unknown; overwrite?: unknown };
      try {
        payload = JSON.parse(request.body ?? "") as typeof payload;
      } catch {
        return json(400, { error: "The body is not JSON." }, cors);
      }
      if (payload === null || typeof payload !== "object") return json(400, { error: "The body is not { path, content }." }, cors);
      if (typeof payload.content !== "string") return json(400, { error: "No content to write." }, cors);
      try {
        const { absolute, folders } = resolveArticlePath(root, payload.path);
        const path = payload.path as string;
        const exists = existsSync(absolute);
        if (exists && payload.overwrite !== true) return json(409, { error: `${path} is already there.`, exists: path }, cors);
        // Any folder not there yet, made with its stub index — outermost first.
        const foldersCreated: string[] = [];
        for (let depth = 1; depth <= folders.length; depth += 1) {
          const folder = folders.slice(0, depth);
          const dir = join(root, ...folder);
          if (existsSync(dir)) continue;
          mkdirSync(dir);
          writeFileSync(join(dir, "index.mdx"), stubIndexOf(folder.at(-1) ?? ""));
          foldersCreated.push(folder.join("/"));
        }
        writeFileSync(absolute, payload.content);
        return json(exists ? 200 : 201, { written: path, created: !exists, foldersCreated }, cors);
      } catch (error) {
        if (error instanceof Refused) return json(400, { error: error.message }, cors);
        throw error;
      }
    }
    return json(404, { error: `No ${request.method} ${route} here — /health, /folders and PUT /files.` }, cors);
  };
  return handle;
};

const readBody = (request: IncomingMessage): Promise<string> =>
  new Promise((done, fail) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        fail(new Refused(`The body is over ${MAX_BODY_BYTES / 1024 / 1024} MB.`));
        request.destroy();
      } else chunks.push(chunk);
    });
    request.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
    request.on("error", fail);
  });

/** The handler behind `node:http`, listening on `host:port` (port `0` picks a free one). */
export const startServer = ({ port, host = "127.0.0.1", ...options }: StorageOptions & { port: number; host?: string }): Promise<Server> => {
  const handle = createStorageHandler(options);
  const server = createServer((request, response) => {
    void (async () => {
      let result: StorageResponse;
      try {
        const header = (name: string) => (typeof request.headers[name] === "string" ? (request.headers[name] as string) : undefined);
        result = handle({
          method: request.method ?? "GET",
          url: request.url ?? "/",
          origin: header("origin"),
          host: header("host"),
          contentType: header("content-type"),
          body: request.method === "PUT" ? await readBody(request) : undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result = { status: error instanceof Refused ? 413 : 500, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ error: message }) };
      }
      response.writeHead(result.status, result.headers);
      response.end(result.body);
      if (request.method === "PUT" && result.status < 300) console.log(`mdx-editor: wrote ${ARTICLES}/${(JSON.parse(result.body ?? "{}") as { written?: string }).written}`);
    })();
  });
  return new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, host, () => done(server));
  });
};
