import { describe, expect, it } from "vitest";

import {
  articleFileName,
  joinFrontmatter,
  parseFrontmatterYaml,
  readArticleFiles,
  splitFrontmatter,
  validateFrontmatter,
} from "./articleFrontmatter";

/*
  A Blog article's frontmatter (CTA-135): the one reader the build's plugin,
  the browser pass's route list and the MDX editor share.
*/

const article = (yaml: string, body = "## Section\n\nWords.\n") => `---\n${yaml}---\n\n${body}`;

describe("a file's text", () => {
  it("splits into its frontmatter and its body, and joins back to the same file", () => {
    const text = article("title: One\nsummary: Two\n");
    expect(splitFrontmatter(text)).toEqual({ yaml: "title: One\nsummary: Two\n", body: "## Section\n\nWords.\n" });
    const { yaml, body } = splitFrontmatter(text);
    expect(joinFrontmatter(yaml, body)).toBe(text);
  });

  it("has no frontmatter unless a --- block is its very first line", () => {
    expect(splitFrontmatter("## Title\n\n---\n\nmore")).toEqual({ yaml: undefined, body: "## Title\n\n---\n\nmore" });
    expect(splitFrontmatter("\n---\ntitle: x\n---\n").yaml).toBeUndefined();
  });

  it("writes a frontmatter-only file with no blank body, and an empty block as an empty block", () => {
    expect(joinFrontmatter("title: A\n", "")).toBe("---\ntitle: A\n---\n");
    expect(splitFrontmatter("---\ntitle: A\n---\n")).toEqual({ yaml: "title: A\n", body: "" });
    expect(splitFrontmatter("---\n---\n## B")).toEqual({ yaml: "", body: "## B" });
    expect(joinFrontmatter(undefined, "## B")).toBe("## B");
  });

  it("parses YAML, or says where it does not", () => {
    expect(parseFrontmatterYaml("title: A\ntags: [x, y]\ndate: 2026-09-14\n")).toEqual({
      ok: true,
      data: { title: "A", tags: ["x", "y"], date: "2026-09-14" },
    });
    const broken = parseFrontmatterYaml("title: A\nsummary: [unclosed\n");
    expect(broken.ok).toBe(false);
  });
});

describe("a file's name", () => {
  it("is an article, a translation of one, or a folder's index", () => {
    expect(articleFileName("tournaments/olympiad-2026.mdx")).toEqual({ file: "tournaments/olympiad-2026", path: "tournaments/olympiad-2026", language: "en", kind: "article" });
    expect(articleFileName("tournaments/olympiad-2026.he.mdx")).toEqual({ file: "tournaments/olympiad-2026.he", path: "tournaments/olympiad-2026", language: "he", kind: "article" });
    expect(articleFileName("tournaments/index.he.mdx")).toEqual({ file: "tournaments/index.he", path: "tournaments", language: "he", kind: "folder" });
    expect(articleFileName("index.mdx")).toMatchObject({ path: "", kind: "folder" });
  });
});

describe("the schema", () => {
  const english = { kind: "article", language: "en" } as const;
  const hebrew = { kind: "article", language: "he" } as const;
  const folder = { kind: "folder", language: "en" } as const;
  const messages = (data: unknown, where: Parameters<typeof validateFrontmatter>[1]) => validateFrontmatter(data, where).issues.map((issue) => issue.message);

  it("takes an article's whole frontmatter", () => {
    const data = {
      title: "T",
      summary: "S",
      description: "D",
      order: 70,
      date: "2026-09-14",
      updated: "2026-10-01",
      tags: ["a", "b"],
      draft: false,
      image: "./share/x.png",
      imageAlt: "A board",
      redirectFrom: ["old/place"],
    };
    expect(validateFrontmatter(data, english)).toEqual({ frontmatter: data, issues: [] });
  });

  it("requires a title and an article's summary", () => {
    expect(messages(undefined, english)).toEqual(["has no frontmatter — a --- block at its top holding at least its title"]);
    expect(messages({}, english)).toEqual(["title is required", "summary is required"]);
    expect(messages({ title: "Tournaments" }, folder)).toEqual([]);
  });

  it("refuses an unknown key, and a key of the wrong type", () => {
    expect(messages({ title: "T", summary: "S", slug: "x" }, english)).toEqual(['unknown key "slug"']);
    expect(messages({ title: "T", summary: "S", order: "7", date: "14 Sep 2026", draft: "yes", tags: "a" }, english)).toEqual([
      "order must be a number",
      "date must be a date, YYYY-MM-DD",
      "tags must be a list of words",
      "draft must be true or false",
    ]);
    expect(messages({ title: "T", summary: "S", date: "2026-02-30" }, english)).toEqual(["date must be a date, YYYY-MM-DD"]);
  });

  it("keeps the structural keys in the English file", () => {
    expect(messages({ title: "ת", summary: "ס", order: 3, draft: true }, hebrew)).toEqual([
      '"order" belongs to the English file — a translation carries only title, summary, description, image and imageAlt',
      '"draft" belongs to the English file — a translation carries only title, summary, description, image and imageAlt',
    ]);
    expect(messages({ title: "ת", summary: "ס", imageAlt: "לוח" }, hebrew)).toEqual([]);
  });

  it("gives a folder's index the folder's keys only", () => {
    expect(messages({ title: "Tournaments", date: "2026-01-01" }, folder)).toEqual([
      '"date" is not a folder\'s — a folder\'s index takes title, summary, description, order, image and imageAlt',
    ]);
    // A folder's image is the one for every page under it with none nearer (CTA-136).
    expect(messages({ title: "Tournaments", image: "./cover.png", imageAlt: "A board" }, folder)).toEqual([]);
  });

  it("wants an image's words with it, and redirects as Blog paths", () => {
    expect(messages({ title: "T", summary: "S", image: "./x.png" }, english)).toEqual(["imageAlt is required with an image — what the image shows"]);
    // Beside the file, and a format every previewer shows (CTA-136).
    for (const image of ["x.png", "/x.png", "./x.webp", "./x.svg", "https://example.com/x.png"]) {
      expect(messages({ title: "T", summary: "S", image, imageAlt: "A board" }, english)).toEqual([
        "image must be a PNG or JPEG beside the file — ./cover.png, ../olympiad.jpg",
      ]);
    }
    expect(messages({ title: "T", summary: "S", image: "../covers/x.JPG", imageAlt: "A board" }, english)).toEqual([]);
    expect(messages({ title: "T", summary: "S", redirectFrom: ["/blog/old"] }, english)).toEqual([
      "redirectFrom must be a list of Blog paths — tournaments/old-name, no leading slash",
    ]);
  });
});

describe("the whole Blog", () => {
  const files = (entries: Record<string, string>) => Object.entries(entries).map(([name, text]) => ({ name, text }));

  it("reads every file — a translation with no body of its own, a draft's translation a draft too", () => {
    const { entries, errors, warnings } = readArticleFiles(
      files({
        "news/index.mdx": "---\ntitle: News\norder: 1\n---\n",
        "news/one.mdx": article("title: One\nsummary: S\ndraft: true\n"),
        "news/one.he.mdx": "---\ntitle: אחת\nsummary: ס\n---\n",
      }),
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(entries.map(({ file, kind, hasBody, draft }) => ({ file, kind, hasBody, draft }))).toEqual([
      { file: "news/index", kind: "folder", hasBody: false, draft: false },
      { file: "news/one.he", kind: "article", hasBody: false, draft: true },
      { file: "news/one", kind: "article", hasBody: true, draft: true },
    ]);
  });

  it("names the file of everything wrong with it", () => {
    const { errors, warnings } = readArticleFiles(
      files({
        "no-title.mdx": article("summary: S\n"),
        "empty.mdx": "---\ntitle: E\nsummary: S\n---\n",
        "x.fr.mdx": article("title: X\nsummary: S\n"),
        "orphan.he.mdx": "---\ntitle: י\nsummary: ס\n---\n",
        "broken.mdx": article("title: [\n"),
        "a.mdx": article("title: A\nsummary: S\nredirectFrom: [old]\n"),
        "b.mdx": article("title: B\nsummary: S\nredirectFrom: [old, a]\n"),
        "deep/one.mdx": article("title: One\nsummary: S\n"),
      }),
    );
    expect(errors).toEqual([
      "articles/broken.mdx: its frontmatter does not parse (line 3) — Flow sequence in block collection must be sufficiently indented and end with a ]",
      "articles/empty.mdx: has no body — the English file is the article's document, which every language falls back to",
      "articles/no-title.mdx: title is required",
      'articles/x.fr.mdx: "fr" is not a language the app ships (en, he)',
      "articles/orphan.he.mdx: is a translation with no English file (orphan.mdx)",
      "articles/b.mdx: redirectFrom old is claimed by articles/a.mdx too",
      "articles/b.mdx: redirectFrom a is a page of its own",
    ]);
    expect(warnings).toEqual(["articles/deep/: has no index.mdx — the folder is titled by its path"]);
  });

  it("knows no article called index — that name is a folder's", () => {
    const { entries } = readArticleFiles(files({ "news/index.mdx": "---\ntitle: News\n---\n\nAn introduction.\n" }));
    expect(entries).toMatchObject([{ kind: "folder", path: "news", hasBody: true }]);
  });

  it("refuses a path that is both an article and a folder", () => {
    const { errors } = readArticleFiles(
      files({ "news.mdx": article("title: N\nsummary: S\n"), "news/index.mdx": "---\ntitle: News\n---\n" }),
    );
    expect(errors).toEqual(["articles/news.mdx: news is both an article and a folder"]);
  });
});
