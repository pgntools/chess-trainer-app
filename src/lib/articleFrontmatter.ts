import { parseDocument } from "yaml";

// With its extension: Node runs this file as it is too (`scripts/check-dist-blog.js`, the e2e route list).
import { supportedLanguages, type AppLanguage } from "../languages.ts";

/**
 * **A Blog article's frontmatter** (CTA-135) — the metadata an article file
 * carries at its top, between two `---` lines, read in one place: the build's
 * Blog plugin (`plugins/blogArticles.ts`, which turns every file under
 * `src/views/blog/articles/` into the Blog's manifest and fails the build on
 * a file that does not pass), the browser pass's route list
 * (`e2e/a11y/blogRoutes.ts`) and the MDX editor's Metadata tab (which
 * validates as the build does, while typing). Pure: the files arrive as text.
 *
 * ```mdx
 * ---
 * title: Every screen as cards
 * summary: "<NavCards>: the app's screens, by section."
 * order: 70
 * date: 2026-09-14
 * ---
 *
 * ## Cards
 * ```
 *
 * **Text keys** (`title`, `summary`, `description`, `image`, `imageAlt`)
 * belong to each file, in its own language. **Structural keys** (`order`,
 * `date`, `updated`, `tags`, `draft`, `redirectFrom`) belong to the article,
 * so they live once, in its English file — a translation that repeats one
 * fails, and two files can never disagree about where an article sits.
 *
 * A **folder** is described by its `index.mdx` (`tournaments/index.mdx`, and
 * `index.he.mdx` for its Hebrew name): `title`, `summary`, `description` and
 * `order`, its body an optional introduction. `index` is therefore no
 * article's name.
 */

/** The metadata one file carries. `title` is required; the rest as the table in `docs/frontmatter-feature-proposal.md` §4.1. */
export type ArticleFrontmatter = {
  /** The article's name in this file's language — its `h1`, page title, breadcrumb, sidebar row and card. */
  title: string;
  /** One line under its title on the index pages. Required of an article; a folder may leave it out. */
  summary?: string;
  /** The page's `<meta name="description">`. */
  description?: string;
  /** Pins the article to the top of its folder, in ascending order; a folder's place among its siblings. */
  order?: number;
  /** `YYYY-MM-DD` — published. A folder sorts its unpinned articles by it, newest first. */
  date?: string;
  /** `YYYY-MM-DD` — last changed in substance. */
  updated?: string;
  tags?: string[];
  /** In `yarn dev` only, marked; absent from a production build. */
  draft?: boolean;
  /** A share image, `public/`-relative — with `imageAlt`. */
  image?: string;
  imageAlt?: string;
  /** Old addresses (paths under `/blog/`) that redirect here — a moved article's links keep working. */
  redirectFrom?: string[];
};

export type ArticleFileKind = "article" | "folder";

/** Every key the schema knows, in the order the editor's form shows them and a written file lists them. */
export const FRONTMATTER_KEYS = [
  "title",
  "summary",
  "description",
  "order",
  "date",
  "updated",
  "tags",
  "draft",
  "image",
  "imageAlt",
  "redirectFrom",
] as const satisfies readonly (keyof ArticleFrontmatter)[];

export type FrontmatterKey = (typeof FRONTMATTER_KEYS)[number];

/** The keys an article's translation carries — the rest it takes from the English file. */
export const TRANSLATION_KEYS: readonly FrontmatterKey[] = ["title", "summary", "description", "image", "imageAlt"];

/** The keys a folder's `index.mdx` takes. */
export const FOLDER_KEYS: readonly FrontmatterKey[] = ["title", "summary", "description", "order"];

/** The keys a file of this kind and language may carry. */
export const keysFor = (kind: ArticleFileKind, language: string): readonly FrontmatterKey[] =>
  kind === "folder" ? (language === "en" ? FOLDER_KEYS : FOLDER_KEYS.filter((key) => key !== "order")) : language === "en" ? FRONTMATTER_KEYS : TRANSLATION_KEYS;

/* --- the file's text ------------------------------------------------ */

/** A `---` block at the very top of a file — the only place remark-frontmatter reads one. */
const FRONTMATTER_BLOCK = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

/**
 * A file's text as its frontmatter (the YAML between the fences, `undefined`
 * for a file with no block) and its body — the blank lines that separate the
 * two dropped, so `joinFrontmatter` puts the same file back together.
 */
export const splitFrontmatter = (source: string): { yaml: string | undefined; body: string } => {
  const match = FRONTMATTER_BLOCK.exec(source);
  if (match === null) return { yaml: undefined, body: source };
  const yaml = match[1] === undefined ? "" : `${match[1]}\n`;
  return { yaml, body: source.slice(match[0].length).replace(/^(?:[ \t]*\r?\n)+/, "") };
};

/** The one file again: `---`, the YAML, `---`, a blank line, the body. No YAML, no block. */
export const joinFrontmatter = (yaml: string | undefined, body: string): string => {
  if (yaml === undefined) return body;
  const block = `---\n${yaml === "" || yaml.endsWith("\n") ? yaml : `${yaml}\n`}---\n`;
  return body.trim() === "" ? block : `${block}\n${body}`;
};

/** The YAML parsed — or why it does not parse, and on which line of the YAML (1-based). */
export const parseFrontmatterYaml = (
  yaml: string,
): { ok: true; data: unknown } | { ok: false; message: string; line?: number } => {
  const document = parseDocument(yaml, { prettyErrors: true });
  const error = document.errors[0];
  // The message's first line, without the position the library writes after it — `line` carries that.
  if (error !== undefined) return { ok: false, message: error.message.split("\n")[0].replace(/ at line \d+, column \d+:?$/, ""), line: error.linePos?.[0].line };
  return { ok: true, data: document.toJS() as unknown };
};

/* --- the file's name ------------------------------------------------ */

export type ArticleFileName = {
  /** The file under `articles/`, without `.mdx` — `tournaments/olympiad-2026.he`, `tournaments/index`. */
  file: string;
  /** The article's or the folder's address under `/blog/` — `tournaments/olympiad-2026`, `tournaments`, `""` for the Blog's own index. */
  path: string;
  /** The two letters before `.mdx`, `en` when there are none. Not necessarily one the app ships — that is a validation. */
  language: string;
  kind: ArticleFileKind;
};

/** `tournaments/olympiad-2026.he.mdx` → the article `tournaments/olympiad-2026` in Hebrew; `tournaments/index.mdx` → the folder `tournaments`. */
export const articleFileName = (name: string): ArticleFileName => {
  const file = name.replace(/\.mdx$/, "");
  const match = /^(.+?)(?:\.([a-z]{2}))?$/.exec(file);
  const stem = match?.[1] ?? file;
  const language = match?.[2] ?? "en";
  const parts = stem.split("/");
  if (parts.at(-1) === "index") return { file, path: parts.slice(0, -1).join("/"), language, kind: "folder" };
  return { file, path: stem, language, kind: "article" };
};

/* --- the schema ------------------------------------------------------ */

/** What is wrong with a file's metadata — under the key it is about, when it is about one. */
export type FrontmatterIssue = { key?: string; message: string };

const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && ISO_DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
/** A Blog path — lower-case words and dashes, `/` between folders, no leading slash. */
const BLOG_PATH = /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;

const list = (keys: readonly string[]): string => `${keys.slice(0, -1).join(", ")} and ${keys.at(-1)}`;

/**
 * **One file's metadata, checked** against the schema — for a file of this
 * kind (an article or a folder's index) in this language. The frontmatter
 * comes back typed only when nothing is wrong with it.
 */
export const validateFrontmatter = (
  data: unknown,
  { kind, language }: { kind: ArticleFileKind; language: string },
): { frontmatter?: ArticleFrontmatter; issues: FrontmatterIssue[] } => {
  if (data === undefined || data === null) {
    return { issues: [{ message: "has no frontmatter — a --- block at its top holding at least its title" }] };
  }
  if (typeof data !== "object" || Array.isArray(data)) return { issues: [{ message: "its frontmatter is not a map of keys" }] };

  const issues: FrontmatterIssue[] = [];
  const record = data as Record<string, unknown>;
  const allowed = keysFor(kind, language);
  const known = new Set<string>(FRONTMATTER_KEYS);
  for (const key of Object.keys(record)) {
    if (!known.has(key)) issues.push({ key, message: `unknown key "${key}"` });
    else if (!allowed.includes(key as FrontmatterKey)) {
      issues.push({
        key,
        message:
          kind === "folder"
            ? `"${key}" is not a folder's — a folder's index takes ${list(allowed)}`
            : `"${key}" belongs to the English file — a translation carries only ${list(TRANSLATION_KEYS)}`,
      });
    }
  }

  const has = (key: FrontmatterKey) => record[key] !== undefined && record[key] !== null;
  if (!isText(record.title)) issues.push({ key: "title", message: has("title") ? "title must be words" : "title is required" });
  if (kind === "article" && !isText(record.summary)) issues.push({ key: "summary", message: has("summary") ? "summary must be words" : "summary is required" });
  else if (kind === "folder" && has("summary") && !isText(record.summary)) issues.push({ key: "summary", message: "summary must be words" });
  if (has("description") && !isText(record.description)) issues.push({ key: "description", message: "description must be words" });
  if (has("order") && (typeof record.order !== "number" || !Number.isFinite(record.order))) issues.push({ key: "order", message: "order must be a number" });
  for (const key of ["date", "updated"] as const) {
    if (has(key) && !isIsoDate(record[key])) issues.push({ key, message: `${key} must be a date, YYYY-MM-DD` });
  }
  if (has("tags") && !isTextList(record.tags)) issues.push({ key: "tags", message: "tags must be a list of words" });
  if (has("draft") && typeof record.draft !== "boolean") issues.push({ key: "draft", message: "draft must be true or false" });
  if (has("image") && !isText(record.image)) issues.push({ key: "image", message: "image must be a path" });
  if (has("imageAlt") && !isText(record.imageAlt)) issues.push({ key: "imageAlt", message: "imageAlt must be words" });
  if (language === "en" && has("image") && !has("imageAlt")) issues.push({ key: "imageAlt", message: "imageAlt is required with an image — what the image shows" });
  if (language === "en" && has("imageAlt") && !has("image")) issues.push({ key: "image", message: "imageAlt without an image" });
  if (has("redirectFrom") && !(isTextList(record.redirectFrom) && record.redirectFrom.every((path) => BLOG_PATH.test(path)))) {
    issues.push({ key: "redirectFrom", message: "redirectFrom must be a list of Blog paths — tournaments/old-name, no leading slash" });
  }

  return issues.length === 0 ? { frontmatter: record as ArticleFrontmatter, issues } : { issues };
};

/* --- the whole Blog --------------------------------------------------- */

/** One file of the Blog, read: what its name says, its metadata, and whether it has a document below it. */
export type ArticleManifestEntry = ArticleFileName & {
  language: AppLanguage;
  meta: ArticleFrontmatter;
  /** A body to render — a frontmatter-only translation has none, and shows its title over the English document. */
  hasBody: boolean;
  /** Its article's `draft`, translations included (the key lives in the English file). */
  draft: boolean;
};

/** A file under `articles/`, as text — `name` relative to it, `.mdx` and all. */
export type ArticleSourceFile = { name: string; text: string };

/** Problems that fail the build, each naming its file; and what only deserves a warning. */
export type ArticleManifest = { entries: ArticleManifestEntry[]; errors: string[]; warnings: string[] };

const isAppLanguage = (language: string): language is AppLanguage => (supportedLanguages as readonly string[]).includes(language);

/**
 * **Every file of the Blog, read and held to each other** — what the build
 * plugin turns into the manifest the app reads. Beyond each file's own
 * schema: a language the app ships, an English file under every
 * translation, a body under every English article, no path that is both an
 * article and a folder, every `redirectFrom` unique and naming no live page;
 * a folder with no `index.mdx` is a warning (it is titled by its path).
 */
export const readArticleFiles = (files: readonly ArticleSourceFile[]): ArticleManifest => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const read: (ArticleFileName & { language: AppLanguage; meta: ArticleFrontmatter; hasBody: boolean })[] = [];

  for (const { name, text } of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    const fileName = articleFileName(name);
    const where = `articles/${name}`;
    if (!isAppLanguage(fileName.language)) {
      errors.push(`${where}: "${fileName.language}" is not a language the app ships (${supportedLanguages.join(", ")})`);
      continue;
    }
    const { yaml, body } = splitFrontmatter(text);
    let data: unknown;
    if (yaml !== undefined) {
      const parsed = parseFrontmatterYaml(yaml);
      if (!parsed.ok) {
        // The YAML's line, plus the opening `---`: the file's.
        errors.push(`${where}: its frontmatter does not parse${parsed.line === undefined ? "" : ` (line ${parsed.line + 1})`} — ${parsed.message}`);
        continue;
      }
      data = parsed.data;
    }
    const { frontmatter, issues } = validateFrontmatter(data, fileName);
    if (frontmatter === undefined) {
      errors.push(...issues.map((issue) => `${where}: ${issue.message}`));
      continue;
    }
    const hasBody = body.trim() !== "";
    if (fileName.kind === "article" && fileName.language === "en" && !hasBody) {
      errors.push(`${where}: has no body — the English file is the article's document, which every language falls back to`);
      continue;
    }
    read.push({ ...fileName, language: fileName.language, meta: frontmatter, hasBody });
  }

  const english = new Map(read.filter((entry) => entry.language === "en").map((entry) => [`${entry.kind}:${entry.path}`, entry]));
  for (const entry of read) {
    if (entry.language !== "en" && !english.has(`${entry.kind}:${entry.path}`)) {
      errors.push(`articles/${entry.file}.mdx: is a translation with no English file (${entry.kind === "folder" ? `${entry.path === "" ? "" : `${entry.path}/`}index` : entry.path}.mdx)`);
    }
  }

  const articles = new Set(read.filter((entry) => entry.kind === "article").map((entry) => entry.path));
  const folders = new Set<string>();
  for (const path of articles) {
    const parts = path.split("/").slice(0, -1);
    for (let depth = 1; depth <= parts.length; depth += 1) folders.add(parts.slice(0, depth).join("/"));
  }
  for (const entry of read) if (entry.kind === "folder" && entry.path !== "") folders.add(entry.path);
  for (const path of articles) if (folders.has(path)) errors.push(`articles/${path}.mdx: ${path} is both an article and a folder`);
  for (const folder of [...folders].sort()) {
    if (!english.has(`folder:${folder}`)) warnings.push(`articles/${folder}/: has no index.mdx — the folder is titled by its path`);
  }

  const redirects = new Map<string, string>();
  for (const entry of read) {
    for (const from of entry.meta.redirectFrom ?? []) {
      const where = `articles/${entry.file}.mdx`;
      if (articles.has(from) || folders.has(from)) errors.push(`${where}: redirectFrom ${from} is a page of its own`);
      else if (redirects.has(from)) errors.push(`${where}: redirectFrom ${from} is claimed by ${redirects.get(from)} too`);
      else redirects.set(from, where);
    }
  }

  const entries = read.map((entry) => ({ ...entry, draft: english.get(`${entry.kind}:${entry.path}`)?.meta.draft === true }));
  return { entries, errors, warnings };
};
