#!/usr/bin/env node
/**
 * **The eco.json opening tree as one evaluated PGN** (CTA-184) — data for a
 * future update of the Openings module, which no screen reads yet.
 *
 * Reads the vendored book (`src/data/openings/eco{A..E}.json`, written by
 * `vendorOpenings.mjs` from https://github.com/JeffML/eco.json), replays every
 * entry's line with chess.js and merges them into one move tree from the
 * standard start, looks the position after every move up in the **lichess
 * evaluation database** (https://database.lichess.org/#evals) through its API
 * (https://github.com/pgntools/lichess-eval-db-api — `GET /fen?fen=…&best=true`;
 * no engine runs), and writes `src/data/openings/eco-evals.pgn`: one game,
 * every move carrying `[%eval pawns,depth]`, the named positions their ECO
 * and name, the best move for its mover first at every branch. The rules are
 * `src/lib/openingEvalTree.ts`, loaded through Vite's module runner as
 * `wirepgn.js` loads `src/lib/` — the app's code, not a copy of it.
 *
 * Every answer — a miss (HTTP 404) too — is cached in a file outside `src/`
 * (gitignored), so a re-run or an interrupted run asks again only for what it
 * lacks, and the same book and cache write the same bytes. The date in the
 * PGN's opening comment is the cache's: the day it last learnt something.
 *
 * Run manually — not part of the build — with the API reachable, and commit
 * the PGN (re-vendoring the book means running this again):
 *
 *   node scripts/ecoEvalsPgn.mjs [--api http://localhost:8000] [--concurrency 16]
 *                                [--cache .cache/eco-evals.json] [--out src/data/openings/eco-evals.pgn]
 *
 * `ECO_EVALS_API` sets the API's address too (`--api` wins).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runnerImport } from "vite";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CACHE_FORMAT = "chessapp.ecoEvalsCache";

const { values: args } = parseArgs({
  options: {
    api: { type: "string" },
    concurrency: { type: "string", default: "16" },
    cache: { type: "string", default: join(ROOT, ".cache", "eco-evals.json") },
    out: { type: "string", default: join(ROOT, "src", "data", "openings", "eco-evals.pgn") },
    help: { type: "boolean", short: "h" },
  },
});
if (args.help) {
  console.log(
    "Usage: node scripts/ecoEvalsPgn.mjs [--api <url>] [--concurrency <n>] [--cache <file>] [--out <file>]",
  );
  process.exit(0);
}

const api = (args.api ?? process.env.ECO_EVALS_API ?? "http://localhost:8000").replace(/\/+$/, "");
const concurrency = Number(args.concurrency);
if (!Number.isInteger(concurrency) || concurrency < 1) {
  console.error(`--concurrency must be a whole number above 0, not "${args.concurrency}"`);
  process.exit(1);
}

const lib = (
  await runnerImport(join(ROOT, "src/lib/openingEvalTree.ts"), {
    configFile: false,
    root: ROOT,
    logLevel: "silent",
  })
).module;

// The book, and its tree.
const book = {};
for (const letter of ["A", "B", "C", "D", "E"])
  Object.assign(book, JSON.parse(readFileSync(join(ROOT, "src", "data", "openings", `eco${letter}.json`), "utf8")));
const tree = lib.openingTreeOf(book);
const fens = lib.lookupFensOf(tree);

// The cache: { format, updated: "YYYY-MM-DD", positions: { [lookupFen]: PositionEval | null } }.
const cachePath = resolve(args.cache);
const cache = existsSync(cachePath)
  ? JSON.parse(readFileSync(cachePath, "utf8"))
  : { format: CACHE_FORMAT, updated: null, positions: {} };
if (cache.format !== CACHE_FORMAT) {
  console.error(`${cachePath} is not an eco-evals cache — move it away or pass --cache`);
  process.exit(1);
}
let unsaved = 0;
const saveCache = () => {
  if (unsaved === 0) return;
  mkdirSync(dirname(cachePath), { recursive: true });
  // Sorted keys, written whole then moved in, so an interrupted write never leaves half a file.
  const positions = Object.fromEntries(Object.entries(cache.positions).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(`${cachePath}.tmp`, JSON.stringify({ ...cache, positions }));
  renameSync(`${cachePath}.tmp`, cachePath);
  unsaved = 0;
};
process.on("SIGINT", () => {
  saveCache();
  console.error("\ninterrupted — the answers so far are cached; run again to carry on");
  process.exit(130);
});

/** Thrown for an answer the run cannot go on from (not a 404). */
class ApiError extends Error {}

const lookUp = async (fen) => {
  const url = `${api}/fen?fen=${encodeURIComponent(fen)}&best=true`;
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new ApiError(`cannot reach the evaluation API at ${api} (${error.cause?.code ?? error.cause?.errors?.[0]?.code ?? error.message})`);
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new ApiError(`${url} answered HTTP ${response.status}: ${await response.text()}`);
  return lib.evalFromApi(await response.json());
};

const todo = fens.filter((fen) => !(fen in cache.positions));
if (todo.length > 0) {
  console.log(`${fens.length} positions, ${todo.length} not cached — asking ${api} (${concurrency} at a time)`);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < todo.length) {
      const fen = todo[next++];
      cache.positions[fen] = await lookUp(fen);
      cache.updated = new Date().toISOString().slice(0, 10);
      unsaved += 1;
      done += 1;
      if (unsaved >= 500) saveCache();
      if (done % 1000 === 0 || done === todo.length) process.stdout.write(`\r  ${done} / ${todo.length}`);
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));
    process.stdout.write("\n");
  } catch (error) {
    saveCache();
    console.error(`\n${error instanceof ApiError ? error.message : error.stack}`);
    console.error("the answers so far are cached; run again once the API answers (--api / ECO_EVALS_API)");
    process.exit(1);
  }
  saveCache();
}

const evals = (fen) => cache.positions[fen];
const about =
  `The opening tree of eco.json (https://github.com/JeffML/eco.json), ${Object.keys(book).length} positions, ` +
  "each move evaluated from the lichess evaluation database (https://database.lichess.org/#evals), " +
  `as of ${cache.updated ?? "never"}; at every branch the best move for the side that plays it comes first.`;
const pgn = lib.openingEvalsPgn(tree, evals, about);
const outPath = resolve(args.out);
writeFileSync(outPath, pgn);

const summary = lib.evalSummaryOf(tree, evals);
console.log(`${outPath}: ${(pgn.length / 1024).toFixed(0)} KB`);
console.log(`  moves in the tree:   ${summary.moves}`);
console.log(`  positions looked up: ${summary.positions}`);
console.log(`  evaluated:           ${summary.evaluated}`);
console.log(`  missing:             ${summary.missing}`);
console.log(`  checkmates:          ${summary.checkmates} (moves that mate: nothing to look up)`);
if (summary.depth !== undefined)
  console.log(`  depth:               min ${summary.depth.min}, median ${summary.depth.median}, max ${summary.depth.max}`);
