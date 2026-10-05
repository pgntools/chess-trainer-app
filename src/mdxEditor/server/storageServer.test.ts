import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createStorageHandler, listFolders, parseGitStatus, resolveArticlePath, startServer, stubIndexOf, type StorageRequest } from "./storageServer.ts";

/*
  `yarn mdx-editor:start` (CTA-137) — the MDX editor's storage service,
  against a temporary articles folder: the path guard that keeps every write
  under it, and the handler's routes, origins and conflicts. One test puts
  it behind node:http for real.
*/

let work: string;
let root: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "mdx-editor-storage-"));
  root = join(work, "articles");
  mkdirSync(join(root, "tournaments"), { recursive: true });
  writeFileSync(join(root, "get-started.mdx"), "---\ntitle: Get started\nsummary: S\n---\n\nBody");
  writeFileSync(join(root, "tournaments", "index.mdx"), '---\ntitle: "Tournaments: 2026"\n---\n');
  writeFileSync(join(root, "tournaments", "cup.mdx"), "---\ntitle: Cup\nsummary: S\n---\n");
  writeFileSync(join(root, "tournaments", "cup.pgn"), "1. e4 *");
  mkdirSync(join(work, "outside"));
});

afterEach(() => rmSync(work, { recursive: true, force: true }));

const refusal = (path: unknown) => {
  try {
    resolveArticlePath(root, path);
  } catch (error) {
    return (error as Error).message;
  }
  return undefined;
};

describe("the path guard", () => {
  it("takes a .mdx or .pgn under articles/, at any depth, a translation too", () => {
    expect(resolveArticlePath(root, "tournaments/cup.he.mdx")).toEqual({ absolute: join(root, "tournaments", "cup.he.mdx"), folders: ["tournaments"], name: "cup.he.mdx" });
    expect(resolveArticlePath(root, "new/deeper/index.mdx").folders).toEqual(["new", "deeper"]);
    expect(resolveArticlePath(root, "tournaments/Olym_26.v2.pgn").name).toBe("Olym_26.v2.pgn");
  });

  it("refuses a path that leaves articles/ — up, absolute, a backslash, an empty part", () => {
    expect(refusal("../outside/x.mdx")).toMatch(/leaves articles/);
    expect(refusal("tournaments/../../x.mdx")).toMatch(/leaves articles/);
    expect(refusal("/etc/x.mdx")).toMatch(/absolute/);
    expect(refusal(join(work, "outside", "x.mdx"))).toMatch(/absolute/);
    expect(refusal("C:/x.mdx")).toMatch(/absolute/);
    expect(refusal("tournaments\\x.mdx")).toMatch(/use \//);
    expect(refusal("tournaments//x.mdx")).toMatch(/empty folder/);
    expect(refusal("")).toBe("No path to write.");
    expect(refusal(3)).toBe("No path to write.");
  });

  it("writes only .mdx and .pgn, under Blog names", () => {
    expect(refusal("tournaments/x.js")).toMatch(/only .mdx and .pgn/);
    expect(refusal("tournaments/x.mdx.txt")).toMatch(/only .mdx and .pgn/);
    expect(refusal("Tournaments/x.mdx")).toMatch(/the folder "Tournaments" is not a Blog name/);
    expect(refusal("tournaments/My Article.mdx")).toMatch(/not an article's name/);
    expect(refusal("tournaments/x.hebrew.mdx")).toMatch(/not an article's name/);
    expect(refusal("tournaments/.hidden.pgn")).toMatch(/not a PGN's name/);
  });

  it("refuses a symlink that leads out, and one that leads nowhere", () => {
    symlinkSync(join(work, "outside"), join(root, "escape"));
    expect(refusal("escape/x.mdx")).toMatch(/through a link/);
    symlinkSync(join(work, "outside", "secret.mdx"), join(root, "dangling.mdx"));
    expect(refusal("dangling.mdx")).toMatch(/a link to nothing/);
    writeFileSync(join(work, "outside", "real.mdx"), "x");
    symlinkSync(join(work, "outside", "real.mdx"), join(root, "pointer.mdx"));
    expect(refusal("pointer.mdx")).toMatch(/through a link/);
  });
});

describe("the folder list", () => {
  it("lists every folder, the root first, with its index's title, its .mdx and .pgn files and each article's facts", () => {
    writeFileSync(join(root, "tournaments", "notes.txt"), "x");
    writeFileSync(join(root, "tournaments", "draft.mdx"), "---\ntitle: 'It''s a draft'\ndate: 2026-10-05\ndraft: true\n---\n");
    expect(listFolders(root)).toEqual([
      { path: "", files: ["get-started.mdx"], articles: { "get-started.mdx": { title: "Get started" } } },
      {
        path: "tournaments",
        title: "Tournaments: 2026",
        files: ["cup.mdx", "cup.pgn", "draft.mdx", "index.mdx"],
        // Each article's title, date and draft, read from its frontmatter.
        articles: { "cup.mdx": { title: "Cup" }, "draft.mdx": { title: "It's a draft", date: "2026-10-05", draft: true }, "index.mdx": { title: "Tournaments: 2026" } },
      },
    ]);
  });
});

const LOCAL = { host: "127.0.0.1:5172", origin: "http://localhost:5173" };
const put = (body: unknown, extra: Partial<StorageRequest> = {}): StorageRequest => ({
  method: "PUT",
  url: "/files",
  contentType: "application/json",
  body: JSON.stringify(body),
  ...LOCAL,
  ...extra,
});
const read = (path: string) => readFileSync(join(root, ...path.split("/")), "utf8");

describe("the handler", () => {
  it("answers the health check and the folder list to a local origin, saying so in CORS", () => {
    const handle = createStorageHandler({ root });
    const health = handle({ method: "GET", url: "/health", ...LOCAL });
    expect(health.status).toBe(200);
    expect(health.headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
    expect(JSON.parse(health.body ?? "")).toMatchObject({ ok: true, service: "mdx-editor-storage" });
    expect(JSON.parse(handle({ method: "GET", url: "/folders", ...LOCAL }).body ?? "").folders).toHaveLength(2);

    const preflight = handle({ method: "OPTIONS", url: "/files", ...LOCAL });
    expect(preflight.status).toBe(204);
    expect(preflight.headers["Access-Control-Allow-Methods"]).toContain("PUT");
    expect(preflight.headers["Access-Control-Allow-Headers"]).toBe("Content-Type");
  });

  it("refuses another origin, a host that is not loopback, and a write that is not JSON", () => {
    const handle = createStorageHandler({ root });
    expect(handle({ method: "GET", url: "/health", host: LOCAL.host, origin: "https://example.com" }).status).toBe(403);
    expect(handle({ method: "OPTIONS", url: "/files", host: LOCAL.host, origin: "https://example.com" }).status).toBe(403);
    expect(handle({ method: "GET", url: "/health", host: "attacker.example:5172" }).status).toBe(403);
    expect(handle(put({ path: "x.mdx", content: "x" }, { contentType: "text/plain" })).status).toBe(415);
    expect(existsSync(join(root, "x.mdx"))).toBe(false);
    // A named list of origins replaces the local rule.
    const named = createStorageHandler({ root, origins: ["http://localhost:5211"] });
    expect(named({ method: "GET", url: "/health", ...LOCAL }).status).toBe(403);
    expect(named({ method: "GET", url: "/health", host: LOCAL.host, origin: "http://localhost:5211" }).status).toBe(200);
  });

  it("writes a new file, refuses to write over one without overwrite, and writes over it with", () => {
    const handle = createStorageHandler({ root });
    const created = handle(put({ path: "tournaments/new-one.mdx", content: "---\ntitle: N\n---\n" }));
    expect(created.status).toBe(201);
    expect(JSON.parse(created.body ?? "")).toEqual({ written: "tournaments/new-one.mdx", created: true, foldersCreated: [] });
    expect(read("tournaments/new-one.mdx")).toBe("---\ntitle: N\n---\n");

    const conflict = handle(put({ path: "tournaments/cup.mdx", content: "mine" }));
    expect(conflict.status).toBe(409);
    expect(JSON.parse(conflict.body ?? "")).toMatchObject({ exists: "tournaments/cup.mdx" });
    expect(read("tournaments/cup.mdx")).toContain("title: Cup");

    const over = handle(put({ path: "tournaments/cup.mdx", content: "mine", overwrite: true }));
    expect(over.status).toBe(200);
    expect(JSON.parse(over.body ?? "")).toMatchObject({ created: false });
    expect(read("tournaments/cup.mdx")).toBe("mine");
  });

  it("makes a missing folder with a stub index titled from its name, so the Blog registers it", () => {
    const handle = createStorageHandler({ root });
    const response = handle(put({ path: "tournaments/club-nights/winter/games.pgn", content: "1. d4 *" }));
    expect(JSON.parse(response.body ?? "")).toMatchObject({ foldersCreated: ["tournaments/club-nights", "tournaments/club-nights/winter"] });
    expect(read("tournaments/club-nights/index.mdx")).toBe('---\ntitle: "Club nights"\n---\n');
    expect(read("tournaments/club-nights/winter/index.mdx")).toBe(stubIndexOf("winter"));
    expect(read("tournaments/club-nights/winter/games.pgn")).toBe("1. d4 *");
    // An index already there is left alone.
    expect(read("tournaments/index.mdx")).toContain("Tournaments: 2026");
  });

  it("says what it refuses", () => {
    const handle = createStorageHandler({ root });
    const response = handle(put({ path: "../escape.mdx", content: "x" }));
    expect(response.status).toBe(400);
    expect(JSON.parse(response.body ?? "").error).toMatch(/leaves articles/);
    expect(handle(put({ path: "x.mdx" })).status).toBe(400);
    expect(handle({ ...put({}), body: "{not json" }).status).toBe(400);
    expect(handle({ method: "POST", url: "/files", ...LOCAL }).status).toBe(404);
    expect(existsSync(join(work, "escape.mdx"))).toBe(false);
  });
});

describe("the service behind node:http", () => {
  it("answers a browser's request, preflight and all, on the loopback address", async () => {
    const server = await startServer({ port: 0, root });
    try {
      const { port } = server.address() as AddressInfo;
      const base = `http://127.0.0.1:${port}`;
      const health = await fetch(`${base}/health`, { headers: { Origin: "http://localhost:5173" } });
      expect(health.status).toBe(200);
      expect(health.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");

      const written = await fetch(`${base}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" },
        body: JSON.stringify({ path: "fresh.mdx", content: "---\ntitle: F\n---\n" }),
      });
      expect(written.status).toBe(201);
      expect(read("fresh.mdx")).toBe("---\ntitle: F\n---\n");
    } finally {
      await new Promise((done) => server.close(done));
    }
  });
});

describe("the git status (read only)", () => {
  it("reads git's porcelain: new, changed, deleted and renamed files under articles/, a rename's old path skipped", () => {
    const porcelain = [
      "?? src/views/blog/articles/club/new.mdx",
      " M src/views/blog/articles/get-started.mdx",
      "D  src/views/blog/articles/old.pgn",
      "R  src/views/blog/articles/moved.mdx",
      "src/views/blog/articles/before.mdx",
      "A  src/views/blog/articles/staged.pgn",
      " M src/other/file.ts",
      "",
    ].join("\0");
    expect(parseGitStatus(porcelain, "src/views/blog/articles/")).toEqual([
      { path: "club/new.mdx", state: "new" },
      { path: "get-started.mdx", state: "changed" },
      { path: "old.pgn", state: "deleted" },
      { path: "moved.mdx", state: "renamed" },
      { path: "staged.pgn", state: "new" },
    ]);
  });

  it("answers the branch and each file with its size — and why not, outside a checkout", () => {
    const git = (args: readonly string[]) =>
      args[0] === "rev-parse" ? (args[1] === "--show-prefix" ? "src/views/blog/articles/\n" : "feature/x\n") : "?? src/views/blog/articles/tournaments/cup.pgn\0";
    const handle = createStorageHandler({ root, git });
    expect(JSON.parse(handle({ method: "GET", url: "/git-status", ...LOCAL }).body ?? "")).toEqual({
      available: true,
      branch: "feature/x",
      files: [{ path: "tournaments/cup.pgn", state: "new", bytes: 7 }],
    });
    const outside = createStorageHandler({
      root,
      git: () => {
        throw new Error("fatal: not a git repository");
      },
    });
    expect(JSON.parse(outside({ method: "GET", url: "/git-status", ...LOCAL }).body ?? "")).toEqual({ available: false, reason: "git could not say: fatal: not a git repository" });
  });
});

describe("deleting, and who imports a PGN", () => {
  const del = (paths: unknown, extra: Partial<StorageRequest> = {}): StorageRequest => ({
    method: "DELETE",
    url: "/files",
    contentType: "application/json",
    body: JSON.stringify({ paths }),
    ...LOCAL,
    ...extra,
  });

  it("deletes the files asked for — all of them, or none when one is refused", () => {
    writeFileSync(join(root, "tournaments", "cup.he.mdx"), "---\ntitle: C\n---\n");
    const handle = createStorageHandler({ root });
    const refused = handle(del(["tournaments/cup.he.mdx", "tournaments/missing.mdx"]));
    expect(refused.status).toBe(400);
    expect(JSON.parse(refused.body ?? "").error).toBe("tournaments/missing.mdx is not there.");
    expect(existsSync(join(root, "tournaments", "cup.he.mdx"))).toBe(true);

    const deleted = handle(del(["tournaments/cup.mdx", "tournaments/cup.he.mdx", "tournaments/cup.pgn"]));
    expect(deleted.status).toBe(200);
    expect(JSON.parse(deleted.body ?? "")).toEqual({ deleted: ["tournaments/cup.mdx", "tournaments/cup.he.mdx", "tournaments/cup.pgn"] });
    expect(existsSync(join(root, "tournaments", "cup.mdx"))).toBe(false);
    // The folder and its index stay.
    expect(existsSync(join(root, "tournaments", "index.mdx"))).toBe(true);
  });

  it("refuses a path out, a folder, another extension, and a delete that is not JSON", () => {
    const handle = createStorageHandler({ root });
    expect(handle(del(["../outside/x.mdx"])).status).toBe(400);
    expect(handle(del(["tournaments"])).status).toBe(400);
    expect(handle(del(["tournaments/notes.txt"])).status).toBe(400);
    expect(handle(del([])).status).toBe(400);
    expect(handle(del(["tournaments/cup.mdx"], { contentType: "text/plain" })).status).toBe(415);
    expect(existsSync(join(root, "tournaments", "cup.mdx"))).toBe(true);
    expect(handle({ method: "OPTIONS", url: "/files", ...LOCAL }).headers["Access-Control-Allow-Methods"]).toContain("DELETE");
  });

  it("says which articles import a PGN, read from each article's folder", () => {
    writeFileSync(join(root, "tournaments", "cup.mdx"), 'import games from "./cup.pgn?raw"\n\n## Cup');
    writeFileSync(join(root, "get-started.mdx"), 'import cup from "./tournaments/cup.pgn?raw"\nimport other from "./other.pgn?raw"\n');
    mkdirSync(join(root, "tournaments", "deeper"));
    writeFileSync(join(root, "tournaments", "deeper", "again.mdx"), "import g from '../cup.pgn?raw'\n");
    const handle = createStorageHandler({ root });
    const answer = handle({ method: "GET", url: "/importers?path=tournaments%2Fcup.pgn", ...LOCAL });
    expect(JSON.parse(answer.body ?? "").importers.sort()).toEqual(["get-started.mdx", "tournaments/cup.mdx", "tournaments/deeper/again.mdx"]);
    expect(handle({ method: "GET", url: "/importers?path=..%2Fx.pgn", ...LOCAL }).status).toBe(400);
  });
});
