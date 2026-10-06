#!/usr/bin/env node
/**
 * **`yarn mdx-editor:start`** (CTA-137) — the MDX editor, in one command:
 * its storage service (`storageServer.ts`) and Vite's dev server with the
 * editor compiled in (`VITE_MDX_EDITOR=1`, read by `../enabled.ts`). Plain
 * `yarn dev` has no editor — no route, no sidebar folder — and a production
 * build never has one.
 *
 *   yarn mdx-editor:start              Vite on this checkout's port (.env.local's VITE_DEV_PORT, else Vite's own)
 *   yarn mdx-editor:start --port 5300  any of Vite's own flags, passed on
 *
 * `.env.local` and `.env` are read first (a variable already set wins, and
 * `.env.local` before `.env`, as Vite ranks them): `VITE_MDX_EDITOR_PORT`
 * moves the service, `MDX_EDITOR_ORIGINS` names the origins it answers.
 * Ctrl+C stops both; either stopping stops the other.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { ARTICLES, DEFAULT_PORT, startServer } from "./storageServer.ts";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
for (const file of [".env.local", ".env"]) {
  if (existsSync(join(ROOT, file))) process.loadEnvFile(join(ROOT, file));
}

const port = Number(process.env.VITE_MDX_EDITOR_PORT ?? DEFAULT_PORT);
const origins = process.env.MDX_EDITOR_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

try {
  await startServer({ port, root: join(ROOT, ...ARTICLES.split("/")), origins });
} catch (error) {
  const code = (error as NodeJS.ErrnoException).code;
  console.error(code === "EADDRINUSE" ? `mdx-editor: port ${port} is taken — is the editor already running? (VITE_MDX_EDITOR_PORT picks another)` : `mdx-editor: ${(error as Error).message}`);
  process.exit(1);
}
console.log(`mdx-editor: the storage service is on http://127.0.0.1:${port}, writing under ${ARTICLES}${sep}`);
console.log(`mdx-editor: ${origins === undefined ? "answering local origins" : `answering ${origins.join(", ")}`}`);

// Vite, with the editor in — on this checkout's port unless a --port is given.
const args = process.argv.slice(2);
const devPort = process.env.VITE_DEV_PORT;
const vite = spawn(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), ...args, ...(args.includes("--port") || devPort === undefined ? [] : ["--port", devPort])], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, VITE_MDX_EDITOR: "1" },
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => vite.kill(signal));
vite.on("exit", (code) => process.exit(code ?? 0));
