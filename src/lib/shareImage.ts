// With its extension: the pre-render (`scripts/prerender.mjs`) reads this file too.
import type { AppLanguage } from "../languages.ts";

/**
 * **A shared link's image** (CTA-136) — what a page shows when its link is
 * pasted into a chat or a feed (`og:image`). Every page gets one, from **the
 * first level of a chain that has one**, so a page with nothing of its own
 * still previews with the nearest image above it, and at worst with the
 * site's:
 *
 * | Level | Where it is declared |
 * | --- | --- |
 * | `own` | an article's frontmatter `image` — its translation's file first |
 * | `folder` | the nearest Blog folder's `index.mdx` `image`, walking up to the Blog's own |
 * | `section` | the app's section the page is in (`src/assets/share/sections.ts`) |
 * | `default` | the site's (`src/assets/share/default.png`) |
 *
 * **Every level is language-aware**: a page in Hebrew takes a level's Hebrew
 * image when there is one — a translation's own `image`, or `x.he.png` beside
 * `x.png` — before its general one, and only then moves up a level.
 *
 * Pure: the levels arrive as data and whether a file is there is the
 * caller's to say, so the pre-render (the files on disk) and the MDX editor
 * (the files the dev server knows) walk the same chain.
 */

export type ShareImageLevelName = "own" | "folder" | "section" | "default";

/** One file a level may offer, with its words — `alt` is `undefined` when the page's language has none for it. */
export type ShareImageOption = {
  /** Repository-relative — `src/views/blog/articles/tournaments/cover.png`. */
  file: string;
  alt: string | undefined;
};

/** A level of the chain: what it is, what it is called (a folder's path, a section's id), and its files, best first. */
export type ShareImageLevel = {
  level: ShareImageLevelName;
  /** The folder's path or the section's id — where the image came from, for the author. */
  from?: string;
  options: readonly ShareImageOption[];
};

/** The image a page previews with, and where it came from. */
export type ShareImage = ShareImageOption & Pick<ShareImageLevel, "level" | "from">;

/** `x.png` → `x.he.png`: a file's variant in a language. */
export const languageVariantOf = (file: string, language: AppLanguage): string => file.replace(/(\.[^./]+)$/, `.${language}$1`);

/**
 * A file and, before it, its variant in `language` (`x.he.png`) — what a
 * level declared by a file name offers. The default language takes the file
 * itself.
 */
export const languageAwareOptions = (
  file: string,
  language: AppLanguage,
  alt: string | undefined,
  defaultLanguage: AppLanguage = "en",
): ShareImageOption[] =>
  language === defaultLanguage ? [{ file, alt }] : [{ file: languageVariantOf(file, language), alt }, { file, alt }];

/** **The chain walked**: the first file any level offers that is there — or `undefined`, where even the site's is missing. */
export const shareImageOf = (
  levels: readonly ShareImageLevel[],
  exists: (file: string) => boolean,
): ShareImage | undefined => {
  for (const { level, from, options } of levels) {
    const found = options.find((option) => exists(option.file));
    if (found !== undefined) return { ...found, level, ...(from !== undefined && { from }) };
  }
  return undefined;
};

/**
 * `./cover.png` written in a file under `articles/<dir>` → the repository's
 * path to it. `dir` is the file's folder under `articles/` (`""` at the top);
 * `..` climbs.
 */
export const articleImageFile = (articlesDir: string, dir: string, image: string): string => {
  const parts = [...articlesDir.split("/"), ...dir.split("/")].filter((part) => part !== "");
  for (const segment of image.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
};

/** What a share image must be (§6.4 of `docs/static-pages-proposal.md`), checked by the build for every image a page resolves to. */
export const SHARE_IMAGE_RULES = {
  /** Below this the build fails. */
  minWidth: 600,
  minHeight: 315,
  /** The previews' own ratio, 1200 × 630; off it by more than `ratioTolerance` is a warning. */
  ratio: 1.91,
  ratioTolerance: 0.05,
  /** X's limit; the others take more. */
  maxBytes: 5 * 1024 * 1024,
} as const;

/** A share image's problems — `errors` fail the build, `warnings` are reported. */
export const shareImageProblems = (
  image: { type: "png" | "jpeg" | undefined; width: number; height: number; bytes: number },
): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules = SHARE_IMAGE_RULES;
  if (image.type === undefined) errors.push("is not a PNG or a JPEG");
  else {
    if (image.width < rules.minWidth || image.height < rules.minHeight) {
      errors.push(`is ${image.width} × ${image.height} — at least ${rules.minWidth} × ${rules.minHeight}`);
    } else if (Math.abs(image.width / image.height / rules.ratio - 1) > rules.ratioTolerance) {
      warnings.push(`is ${image.width} × ${image.height}, off the previews' 1.91 : 1 (1200 × 630)`);
    }
  }
  if (image.bytes > rules.maxBytes) errors.push(`is ${(image.bytes / 1024 / 1024).toFixed(1)} MB — at most 5 MB`);
  return { errors, warnings };
};

/** A PNG's or a JPEG's type and size, read from its bytes — or no type, for anything else. */
export const imageInfoOf = (bytes: Uint8Array): { type: "png" | "jpeg" | undefined; width: number; height: number } => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 24 && png.every((byte, index) => bytes[index] === byte)) {
    return { type: "png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    // Walk the segments to the first start-of-frame, which holds the size.
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return { type: "jpeg", height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      offset += 2 + length;
    }
    return { type: "jpeg", width: 0, height: 0 };
  }
  return { type: undefined, width: 0, height: 0 };
};
