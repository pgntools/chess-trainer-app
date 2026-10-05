#!/usr/bin/env node
/**
 * **The Blog, as built** (CTA-135) — `yarn check:blog-build`, run after
 * `yarn build` (a step of CI's build job). The Blog's manifest
 * (`plugins/blogArticles.ts`) promises three things of a production build,
 * and this holds `dist/` to each:
 *
 * 1. **No draft ships.** For every article whose frontmatter says
 *    `draft: true`, neither its path nor a phrase of its body is in any file.
 *    The fixture draft, `writing-an-article/a-draft.mdx`, keeps this from
 *    passing on nothing.
 * 2. **No article's body is in the entry chunk** — only the metadata is eager.
 * 3. **One chunk per article** — every published article's phrase is in
 *    the chunk named after its file (`assets/<name>-<hash>.js`).
 *
 * A phrase is the first line of a body's prose, cut where the compiled
 * output would split or escape it. Node runs the shared frontmatter reader
 * as it is (type stripping), so this reads the files exactly as the build does.
 */
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { readArticlesDir } from "../plugins/blogArticles.ts";
import { readArticleFiles, splitFrontmatter } from "../src/lib/articleFrontmatter.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");

const files = readArticlesDir(join(ROOT, "src/views/blog/articles"));
const textOf = new Map(files.map((file) => [file.name.replace(/\.mdx$/, ""), file.text]));
const { entries } = readArticleFiles(files);

/**
 * A phrase from a body as the build writes it: the first line of prose (not
 * a heading, an import or export, a component, a fence or a list), cut
 * before its first inline markup, quote or non-ASCII letter — compiled MDX
 * splits a line at its markup, and a minifier escapes the rest.
 */
const phraseOf = (file) => {
  const { body } = splitFrontmatter(textOf.get(file) ?? "");
  for (const line of body.split("\n").map((text) => text.trim())) {
    if (line === "" || /^(#|import |export |<|\{|```|~~~|[-*>|]|\d+\.)/.test(line)) continue;
    const phrase = line.split(/[`*_[\]<>{}"\\]|[^\x20-\x7e]/)[0].trim();
    if (phrase.length >= 16) return phrase.slice(0, 48);
  }
  return undefined;
};

const fail = (message) => {
  console.error(`check-dist-blog: ${message}`);
  process.exit(1);
};

const built = globSync("**/*", { cwd: DIST, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => {
    const path = join(entry.parentPath, entry.name);
    return { name: path.slice(DIST.length + 1), text: readFileSync(path, "utf8") };
  });
if (built.length === 0) fail("dist/ is empty — run yarn build first");
const entryName = /<script type="module"[^>]*src="[^"]*?\/(assets\/[^"]+\.js)"/.exec(built.find((file) => file.name === "index.html")?.text ?? "")?.[1];
if (entryName === undefined) fail("dist/index.html names no entry script");
const where = (needle) => built.filter((file) => file.text.includes(needle)).map((file) => file.name);
const problems = [];

// 1. No draft ships.
const drafts = entries.filter((entry) => entry.draft && entry.kind === "article");
if (drafts.length === 0) fail("no draft among the articles — the fixture, writing-an-article/a-draft.mdx, is missing");
for (const draft of drafts) {
  for (const needle of [draft.path, phraseOf(draft.file)]) {
    if (needle === undefined || (draft.language !== "en" && needle === draft.path)) continue;
    for (const name of where(needle)) problems.push(`a draft is in the build — ${name}: "${needle}" (articles/${draft.file}.mdx)`);
  }
}

// 2 and 3. Each published body in a chunk of its own — the one named after its file — and none in the entry.
const published = entries.filter((entry) => !entry.draft && entry.hasBody && entry.kind === "article");
let measured = 0;
for (const article of published) {
  const phrase = phraseOf(article.file);
  if (phrase === undefined) continue;
  measured += 1;
  const found = where(phrase);
  if (found.includes(entryName)) problems.push(`articles/${article.file}.mdx's body is in the entry chunk, ${entryName}: "${phrase}"`);
  const own = `assets/${article.file.split("/").at(-1)}-`;
  if (!found.some((name) => name.startsWith(own) && name.endsWith(".js"))) {
    problems.push(`articles/${article.file}.mdx has no chunk of its own (${own}….js holding "${phrase}") — found in ${found.join(", ") || "nothing"}`);
  }
}

if (problems.length > 0) fail(`\n${problems.join("\n")}`);
console.log(
  `check-dist-blog: ${drafts.length} draft file(s) absent; ${measured} of ${published.length} published bodies measured, each in its own chunk, none in ${entryName}.`,
);
