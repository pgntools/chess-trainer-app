import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { blogArticles } from "../../../plugins/blogArticles";

/*
  The build's Blog plugin (CTA-135): `virtual:blog-articles` from a folder of
  article files — what a production build ships of them, and how a file that
  does not pass fails the build.
*/

let dir: string;

const write = (files: Record<string, string>) => {
  dir = mkdtempSync(join(tmpdir(), "blog-articles-"));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
};

afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** The plugin's answer for the manifest, under `command`. */
const manifestCode = (command: "build" | "serve", context = { warn: vi.fn(), error: vi.fn((message: string) => { throw new Error(message); }) }) => {
  const plugin = blogArticles({ dir: join(dir, "articles") });
  (plugin.configResolved as (config: unknown) => void)({ root: dir, command });
  const id = (plugin.resolveId as (id: string) => string | undefined)("virtual:blog-articles");
  expect(id).toBe("\0virtual:blog-articles");
  // The hooks are plain functions here (not Rollup's `{ handler }` objects), called as Vite would.
  return (plugin.load as unknown as (this: typeof context, id: string) => string).call(context, id!);
};

const ARTICLES = {
  "articles/news/index.mdx": "---\ntitle: News\n---\n",
  "articles/news/out.mdx": "---\ntitle: Out now\nsummary: S\n---\n\n## Out\n\nPublished words.\n",
  "articles/news/out.he.mdx": "---\ntitle: יצא\nsummary: ס\n---\n",
  "articles/news/soon.mdx": "---\ntitle: Coming soon\nsummary: S\ndraft: true\n---\n\n## Soon\n\nSecret words.\n",
  "articles/news/soon.he.mdx": "---\ntitle: בקרוב\nsummary: ס\n---\n\nמילים סודיות.\n",
};

describe("the Blog's manifest plugin", () => {
  it("lists every file's metadata, and a lazy import for each body only", () => {
    write(ARTICLES);
    const code = manifestCode("serve");
    expect(code).toContain('import("/articles/news/out.mdx")');
    // The frontmatter-only translation is listed, with no body to load.
    expect(code).toMatch(/file: "news\/out\.he".*load: undefined/);
    // In yarn dev (and under Vitest) a draft is listed, marked.
    expect(code).toMatch(/file: "news\/soon".*draft: true/);
  });

  it("leaves every draft out of a production build — its title, its body and its translations", () => {
    write(ARTICLES);
    const code = manifestCode("build");
    expect(code).toContain("Out now");
    expect(code).not.toContain("soon");
    expect(code).not.toContain("Coming soon");
    expect(code).not.toContain("בקרוב");
  });

  it("fails the build naming the file, and warns of a folder with no index", () => {
    write({
      ...ARTICLES,
      "articles/news/bad.mdx": "---\nsummary: S\nslug: x\n---\n\nWords.\n",
      "articles/other/alone.mdx": "---\ntitle: Alone\nsummary: S\n---\n\nWords.\n",
    });
    const context = { warn: vi.fn(), error: vi.fn((message: string) => { throw new Error(message); }) };
    expect(() => manifestCode("build", context)).toThrow(/articles\/news\/bad\.mdx: unknown key "slug"\narticles\/news\/bad\.mdx: title is required/);
    expect(context.warn).toHaveBeenCalledWith("articles/other/: has no index.mdx — the folder is titled by its path");
  });
});
