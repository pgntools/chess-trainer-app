import { lazy, type LazyExoticComponent } from "react";
import type { MDXContent } from "mdx/types";

import type { AppLanguage } from "../../i18n";
import type { LocalizedText } from "../../lib/localizedText";

/**
 * **The Blog** (CTA-126) — articles written as MDX, in folders that nest, each
 * at a fixed address under `/blog/`. This file is the Blog's one list: the
 * sidebar's Blog folder, the index pages (`/blog`, `/blog/<folder>`) and each
 * article's title, breadcrumbs and page title are read off it.
 *
 * **An article** is `articles/<path>.mdx` (English, required) and, when it is
 * translated, `articles/<path>.he.mdx`, found by path — so an entry below
 * names no file. Its address is `/blog/<path>`, and it has its own line in
 * `src/routes.tsx` and in `e2e/a11y/routes.ts` (the browser pass visits every
 * route). A **folder** is a path every article under it starts with, listed
 * below with its name. `articles.test.ts` holds the four lists — the files,
 * this registry, the routes and the folders — to each other.
 *
 * The article's title is its page's `h1` (the screen renders it), so the
 * document itself starts below it, at `##`. The
 * how-to is itself an article: `articles/guides/writing-an-article.mdx`.
 */

export type BlogFolder = {
  /** `components`, `guides/front-page` — the address under `/blog/`. */
  path: string;
  title: LocalizedText;
};

type BlogArticleEntry = {
  /** `components/game-boards-3col` — the address under `/blog/`, and the file under `articles/`. */
  path: string;
  title: LocalizedText;
  /** One line under its title on the index pages. */
  summary: LocalizedText;
};

export const BLOG_FOLDERS: readonly BlogFolder[] = [
  { path: "components", title: { en: "Components", he: "רכיבים" } },
  { path: "inline-pgn", title: { en: "Games in an article", he: "משחקים בתוך מאמר" } },
  { path: "guides", title: { en: "Guides", he: "מדריכים" } },
];

export const BLOG_ARTICLES: readonly BlogArticleEntry[] = [
  {
    // The front page shows this one (`views/home/frontPageArticle.ts`).
    path: "get-started",
    title: { en: "Get started", he: "בואו נתחיל" },
    summary: {
      en: "The front page: three famous games, two repertoires, a collection and every screen of the app.",
      he: "דף הבית: שלושה משחקים מפורסמים, שני רפרטוארים, אוסף וכל מסכי האפליקציה.",
    },
  },
  {
    path: "components/game-boards-3col",
    title: { en: "Three game boards in a row", he: "שלושה לוחות משחק בשורה" },
    summary: {
      en: "<CollectionGameBoard> three times in a <BoardRow>: Library games, each opened before its famous move.",
      he: "<CollectionGameBoard> שלוש פעמים בתוך <BoardRow>: משחקים מהספרייה, כל אחד נפתח לפני המהלך המפורסם שלו.",
    },
  },
  {
    path: "components/start-move",
    title: { en: "Where a board opens: startMove", he: "איפה לוח נפתח: startMove" },
    summary: {
      en: "The forms startMove takes — White's move, Black's move, a line of moves.",
      he: "הצורות של startMove — מהלך של הלבן, מהלך של השחור, שורת מהלכים.",
    },
  },
  {
    path: "components/repertoires-2col",
    title: { en: "Two repertoires side by side", he: "שני רפרטוארים זה לצד זה" },
    summary: {
      en: "<RepertoireBoard> twice: a reader's repertoire, or its shipped sample.",
      he: "<RepertoireBoard> פעמיים: רפרטואר של הקורא, או הדוגמה שמגיעה עם האפליקציה.",
    },
  },
  {
    path: "components/collection-wide-view-1",
    title: { en: "A collection across the page", he: "אוסף לרוחב הדף" },
    summary: {
      en: "<CollectionCard>: a board on one game and a short table of the collection's games.",
      he: "<CollectionCard>: לוח על משחק אחד וטבלה קצרה של משחקי האוסף.",
    },
  },
  {
    path: "components/collection-wide-view-2",
    title: { en: "A collection, a longer table", he: "אוסף, טבלה ארוכה יותר" },
    summary: {
      en: "<CollectionCard> with more rows, opened at a move.",
      he: "<CollectionCard> עם יותר שורות, נפתח במהלך מסוים.",
    },
  },
  {
    path: "components/stored-game-embed",
    title: { en: "Any stored game", he: "כל משחק שמור" },
    summary: {
      en: "<StoredGameEmbed>: a game by its ?game= reference — a Library game, a saved analysis, a game against the engine.",
      he: "<StoredGameEmbed>: משחק לפי ההפניה ?game= שלו — משחק מהספרייה, ניתוח שמור, משחק נגד המנוע.",
    },
  },
  {
    path: "components/nav-cards",
    title: { en: "Every screen as cards", he: "כל המסכים ככרטיסים" },
    summary: {
      en: "<NavCards>: the app's screens, by section — the landing page as it first was.",
      he: "<NavCards>: מסכי האפליקציה לפי אזורים — דף הנחיתה כפי שהיה בהתחלה.",
    },
  },
  {
    path: "inline-pgn/the-component",
    title: { en: "A game in an article: InlinePgnGame", he: "משחק בתוך מאמר: InlinePgnGame" },
    summary: {
      en: "<InlinePgnGame>: a window of a game's moves on a board, side lines and all — every prop.",
      he: "<InlinePgnGame>: חלון של מהלכי משחק על לוח, כולל וריאנטים — כל המאפיינים.",
    },
  },
  {
    path: "inline-pgn/windows",
    title: { en: "Windows: from, to and start", he: "חלונות: from, to ו-start" },
    summary: {
      en: "Which moves a board shows, and where it opens — by move number or by ply.",
      he: "אילו מהלכים לוח מציג, והיכן הוא נפתח — לפי מספר מהלך או לפי חצי-מהלך.",
    },
  },
  {
    path: "inline-pgn/variations",
    title: { en: "Side lines", he: "וריאנטים" },
    summary: {
      en: "Side lines nested where they branch, a board opened inside one, and the game's comments.",
      he: "וריאנטים מקוננים במקום שבו הם מתפצלים, לוח שנפתח בתוך אחד, וההערות של המשחק.",
    },
  },
  {
    path: "inline-pgn/arrows-and-circles",
    title: { en: "Arrows and circles: [%cal] and [%csl]", he: "חצים ועיגולים: [%cal] ו-[%csl]" },
    summary: {
      en: "The arrows and circles a lichess study draws, read back from its PGN — five drawn positions and games.",
      he: "החצים והעיגולים שסטודיו של lichess מצייר, נקראים מחדש מה-PGN שלו — חמש עמדות ומשחקים מצוירים.",
    },
  },
  {
    path: "inline-pgn/rubinstein-capablanca-1911",
    title: { en: "Rubinstein – Capablanca, San Sebastian 1911", he: "רובינשטיין – קפבלנקה, סן סבסטיאן 1911" },
    summary: {
      en: "A game review: Capablanca's own notes, with nine boards on the one game.",
      he: "סקירת משחק: ההערות של קפבלנקה עצמו, עם תשעה לוחות על אותו משחק.",
    },
  },
  {
    path: "guides/writing-an-article",
    title: { en: "Writing an article", he: "כתיבת מאמר" },
    summary: {
      en: "Where an article's file goes, the lines that give it an address, and what it may embed.",
      he: "היכן נמצא קובץ המאמר, השורות שנותנות לו כתובת, ומה אפשר להטמיע בו.",
    },
  },
];

/* --- the files ----------------------------------------------------- */

const files = import.meta.glob<{ default: MDXContent }>("./articles/**/*.mdx");

/** `./articles/components/x.he.mdx` → `components/x`, `he`. */
const fileParts = (file: string): { path: string; language: string } => {
  const match = /^\.\/articles\/(.+?)(?:\.([a-z]{2}))?\.mdx$/.exec(file);
  return match === null ? { path: file, language: "" } : { path: match[1], language: match[2] ?? "en" };
};

/** Every article file, as `<path>` → language → its lazy document. Each is its own chunk. */
const documents = new Map<string, Map<string, LazyExoticComponent<MDXContent>>>();
for (const [file, load] of Object.entries(files)) {
  const { path, language } = fileParts(file);
  if (!documents.has(path)) documents.set(path, new Map());
  documents.get(path)!.set(language, lazy(load));
}

/** The files' paths and languages — for the registry's test. */
export const articleFiles = (): { path: string; language: string }[] => Object.keys(files).map(fileParts);

/**
 * An article's document in `language`, or its English one: `language` says
 * which it is, so the screen can pin an English fallback left to right.
 */
export const articleDocument = (
  path: string,
  language: AppLanguage,
): { Content: LazyExoticComponent<MDXContent>; language: AppLanguage } | undefined => {
  const byLanguage = documents.get(path);
  const own = byLanguage?.get(language);
  if (own !== undefined) return { Content: own, language };
  const english = byLanguage?.get("en");
  return english === undefined ? undefined : { Content: english, language: "en" };
};

/* --- the tree ------------------------------------------------------ */

const parentOf = (path: string): string => path.split("/").slice(0, -1).join("/");

export const findBlogArticle = (path: string): BlogArticleEntry | undefined =>
  BLOG_ARTICLES.find((article) => article.path === path);

export const findBlogFolder = (path: string): BlogFolder | undefined =>
  BLOG_FOLDERS.find((folder) => folder.path === path);

/** The folders from the Blog's root down to `path`'s parent — a breadcrumb trail. Unregistered ones are left out. */
export const blogFolderChain = (path: string): BlogFolder[] => {
  const parts = path.split("/").slice(0, -1);
  return parts
    .map((_, index) => findBlogFolder(parts.slice(0, index + 1).join("/")))
    .filter((folder): folder is BlogFolder => folder !== undefined);
};

/** What a folder holds, one level down — `""` is the Blog's root. In the lists' order. */
export const blogFolderContents = (
  path: string,
): { folders: BlogFolder[]; articles: BlogArticleEntry[] } => ({
  folders: BLOG_FOLDERS.filter((folder) => parentOf(folder.path) === path),
  articles: BLOG_ARTICLES.filter((article) => parentOf(article.path) === path),
});

/**
 * Every article in the order the sidebar draws them: in each folder, its
 * sub-folders' articles first (in `BLOG_FOLDERS`' order, depth first), then
 * its own — a folder's sub-folders render above its own screens (`navTree.ts`).
 */
export const blogArticlesInTreeOrder = (folder = ""): BlogArticleEntry[] => [
  ...BLOG_FOLDERS.filter((child) => parentOf(child.path) === folder).flatMap((child) => blogArticlesInTreeOrder(child.path)),
  ...BLOG_ARTICLES.filter((article) => parentOf(article.path) === folder),
];

/** How many articles sit anywhere under a folder. */
export const blogArticleCount = (path: string): number =>
  BLOG_ARTICLES.filter((article) => article.path.startsWith(`${path}/`)).length;

/** The sidebar's id for a Blog folder — `blog` for the root. */
export const blogNavFolderId = (path: string): string => (path === "" ? "blog" : `blog/${path}`);

/** The parent folder's path of an article or a folder. */
export const blogParentOf = parentOf;
