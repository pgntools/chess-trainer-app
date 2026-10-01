#!/usr/bin/env node
/**
 * **No test falls outside the test groups** (CTA-123) — `yarn test:groups`,
 * a step of CI's lint job.
 *
 * The suite runs as three Vitest projects (`vite.config.ts`'s
 * `test.projects`): `unit`, `ui` and `gallery`, each its own CI job and none
 * of them the whole suite. A file whose name no group's glob matches would
 * simply never run, and nothing would say so. This asks Vitest itself which
 * files each group runs (`vitest list --filesOnly --json`) and fails unless
 * every `*.test.ts` / `*.test.tsx` under `src/` is in **exactly one** group.
 */
import { execFileSync } from "node:child_process";
import { globSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const GROUPS = ["unit", "ui", "gallery"];

const listed = JSON.parse(
  execFileSync(process.execPath, [join(ROOT, "node_modules/vitest/vitest.mjs"), "list", "--filesOnly", "--json", ...GROUPS.map((group) => `--project=${group}`)], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);

/** File (relative to the root) → the groups that run it. */
const groupsOf = new Map();
for (const { file, projectName } of listed) {
  const path = relative(ROOT, file);
  groupsOf.set(path, [...(groupsOf.get(path) ?? []), projectName]);
}

const onDisk = globSync("src/**/*.test.{ts,tsx}", { cwd: ROOT }).sort();
const problems = [
  ...onDisk.filter((file) => !groupsOf.has(file)).map((file) => `${file}: in no group — it would never run`),
  ...[...groupsOf]
    .filter(([, groups]) => groups.length > 1)
    .map(([file, groups]) => `${file}: in more than one group (${groups.join(", ")})`),
  ...[...groupsOf.keys()].filter((file) => !onDisk.includes(file)).map((file) => `${file}: run by a group, but not a src/**/*.test.ts(x)`),
];

if (problems.length > 0) {
  console.error(`The test groups (vite.config.ts, test.projects) do not cover src/ exactly once:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

const counts = GROUPS.map((group) => `${group} ${listed.filter((entry) => entry.projectName === group).length}`).join(", ");
console.log(`Every one of the ${onDisk.length} test files under src/ is in exactly one group: ${counts}.`);
