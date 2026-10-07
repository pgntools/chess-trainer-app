import type { UIMatch } from "react-router";

import type { AppLanguage } from "../../i18n";
import { localizedText, type LocalizedText } from "../../lib/localizedText";
import { languageVariantOf, type ShareImageLevel, type ShareImageOption } from "../../lib/shareImage";
import type { PageMeta } from "../main/routeHandle";
import { BLOG_ROOT, blogPageOf, blogParentOf, blogPathOf, findBlogFolder, type BlogFolder } from "./articles";

/**
 * A level's files for a page in `language`, best first: the language's own
 * file, then the English file's variant in it (`x.he.png`), then the English
 * file. Its words in the language — or the English ones on a page that is
 * not written in it (its body is the English one), and none where a page that
 * is gets none: the build reports that.
 */
const optionsOf = (
  images: LocalizedText | undefined,
  alts: LocalizedText | undefined,
  language: AppLanguage,
  writtenIn: boolean,
): ShareImageOption[] => {
  if (images === undefined) return [];
  const alt = alts?.[language] ?? (writtenIn ? undefined : alts?.en);
  if (language === "en") return [{ file: images.en, alt }];
  const own = images[language];
  return [
    ...(own !== undefined && own !== images.en ? [{ file: own, alt }] : []),
    { file: languageVariantOf(images.en, language), alt },
    { file: images.en, alt },
  ];
};

/** The folders from `path` up to the Blog's own, nearest first — each one's image a level of the chain (the MDX editor's preview walks it too). */
export const folderLevels = (path: string, language: AppLanguage, writtenIn: boolean): ShareImageLevel[] => {
  const folders: BlogFolder[] = [];
  for (let at = path; at !== ""; at = blogParentOf(at)) {
    const folder = findBlogFolder(at);
    if (folder !== undefined) folders.push(folder);
  }
  if (BLOG_ROOT !== undefined) folders.push(BLOG_ROOT);
  return folders
    .map((folder) => ({ level: "folder" as const, from: folder.path, options: optionsOf(folder.image, folder.imageAlt, language, writtenIn) }))
    .filter((level) => level.options.length > 0);
};

/**
 * **The page a Blog address names** (CTA-135), for the route's `handle.meta`:
 * an article's title — first in the page title, "Every screen as cards — Blog
 * — chessapp.dev" — and its description (its `description`, else its
 * summary); a folder's name; the Blog's own index and an address that names
 * nothing, the route's own title alone. From the address and the registry
 * only, so a page rendered ahead of time has it too.
 *
 * And what a link preview reads of it (CTA-136): an article's dates, tags and
 * the languages it is written in, and the page's own levels of its share
 * image's chain — the article's image, then its folders', walking up.
 */
export const blogPageMeta = (match: UIMatch, language: AppLanguage): PageMeta => {
  const page = blogPageOf(blogPathOf(match.pathname));
  switch (page.kind) {
    case "article": {
      const { article } = page;
      const writtenIn = article.languages.includes(language);
      const own: ShareImageLevel = { level: "own", options: optionsOf(article.image, article.imageAlt, language, writtenIn) };
      return {
        title: localizedText(article.title, language),
        description: localizedText(article.description ?? article.summary, language),
        kind: "article",
        ...(article.date !== undefined && { published: article.date }),
        ...((article.updated ?? article.date) !== undefined && { modified: article.updated ?? article.date }),
        ...(article.tags !== undefined && { tags: article.tags }),
        languages: article.languages,
        images: [...(own.options.length > 0 ? [own] : []), ...folderLevels(blogParentOf(article.path), language, writtenIn)],
      };
    }
    case "redirect":
      return { title: localizedText(page.to.title, language) };
    case "folder": {
      const images = folderLevels(page.folder?.path ?? "", language, true);
      if (page.folder === undefined) return { images };
      return {
        title: localizedText(page.folder.title, language),
        ...(page.folder.summary !== undefined && { description: localizedText(page.folder.summary, language) }),
        images,
      };
    }
    case "missing":
      return {};
  }
};
