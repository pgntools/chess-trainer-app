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
 * how-to is itself an article: `articles/writing-an-article/guide.mdx`.
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
  { path: "tournaments", title: { en: "Tournaments", he: "טורנירים" } },
  // How an article is written, and every component it may embed shown at work (CTA-128 gathered them here).
  { path: "writing-an-article", title: { en: "Writing an article", he: "כתיבת מאמר" } },
  { path: "writing-an-article/components", title: { en: "Components", he: "רכיבים" } },
  { path: "writing-an-article/inline-pgn", title: { en: "Games in an article", he: "משחקים בתוך מאמר" } },
  { path: "writing-an-article/demo-tables", title: { en: "Demo tables", he: "טבלאות לדוגמה" } },
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
    path: "tournaments/olympiad-2026",
    title: { en: "46th Chess Olympiad 2026", he: "האולימפיאדה ה-46 בשחמט 2026" },
    summary: {
      en: "Samarkand: the Open and the Women's, two Swisses of national teams — <TeamStandingsTable> with flags, each file loaded on its own.",
      he: "סמרקנד: הפתוחה ושל הנשים, שני טורנירים שוויצריים של נבחרות — <TeamStandingsTable> עם דגלים, כל קובץ נטען בנפרד.",
    },
  },
  {
    path: "writing-an-article/components/game-boards-3col",
    title: { en: "Three game boards in a row", he: "שלושה לוחות משחק בשורה" },
    summary: {
      en: "<CollectionGameBoard> three times in a <BoardRow>: Library games, each opened before its famous move.",
      he: "<CollectionGameBoard> שלוש פעמים בתוך <BoardRow>: משחקים מהספרייה, כל אחד נפתח לפני המהלך המפורסם שלו.",
    },
  },
  {
    path: "writing-an-article/components/start-move",
    title: { en: "Where a board opens: startMove", he: "איפה לוח נפתח: startMove" },
    summary: {
      en: "The forms startMove takes — White's move, Black's move, a line of moves.",
      he: "הצורות של startMove — מהלך של הלבן, מהלך של השחור, שורת מהלכים.",
    },
  },
  {
    path: "writing-an-article/components/repertoires-2col",
    title: { en: "Two repertoires side by side", he: "שני רפרטוארים זה לצד זה" },
    summary: {
      en: "<RepertoireBoard> twice: a reader's repertoire, or its shipped sample.",
      he: "<RepertoireBoard> פעמיים: רפרטואר של הקורא, או הדוגמה שמגיעה עם האפליקציה.",
    },
  },
  {
    path: "writing-an-article/components/collection-wide-view-1",
    title: { en: "A collection across the page", he: "אוסף לרוחב הדף" },
    summary: {
      en: "<CollectionCard>: a board on one game and a short table of the collection's games.",
      he: "<CollectionCard>: לוח על משחק אחד וטבלה קצרה של משחקי האוסף.",
    },
  },
  {
    path: "writing-an-article/components/collection-wide-view-2",
    title: { en: "A collection, a longer table", he: "אוסף, טבלה ארוכה יותר" },
    summary: {
      en: "<CollectionCard> with more rows, opened at a move.",
      he: "<CollectionCard> עם יותר שורות, נפתח במהלך מסוים.",
    },
  },
  {
    path: "writing-an-article/components/stored-game-embed",
    title: { en: "Any stored game", he: "כל משחק שמור" },
    summary: {
      en: "<StoredGameEmbed>: a game by its ?game= reference — a Library game, a saved analysis, a game against the engine.",
      he: "<StoredGameEmbed>: משחק לפי ההפניה ?game= שלו — משחק מהספרייה, ניתוח שמור, משחק נגד המנוע.",
    },
  },
  {
    path: "writing-an-article/components/nav-cards",
    title: { en: "Every screen as cards", he: "כל המסכים ככרטיסים" },
    summary: {
      en: "<NavCards>: the app's screens, by section — the landing page as it first was.",
      he: "<NavCards>: מסכי האפליקציה לפי אזורים — דף הנחיתה כפי שהיה בהתחלה.",
    },
  },
  {
    path: "writing-an-article/inline-pgn/the-component",
    title: { en: "A game in an article: InlinePgnGame", he: "משחק בתוך מאמר: InlinePgnGame" },
    summary: {
      en: "<InlinePgnGame>: a window of a game's moves on a board, side lines and all — every prop.",
      he: "<InlinePgnGame>: חלון של מהלכי משחק על לוח, כולל וריאנטים — כל המאפיינים.",
    },
  },
  {
    path: "writing-an-article/inline-pgn/windows",
    title: { en: "Windows: from, to and start", he: "חלונות: from, to ו-start" },
    summary: {
      en: "Which moves a board shows, and where it opens — by move number or by ply.",
      he: "אילו מהלכים לוח מציג, והיכן הוא נפתח — לפי מספר מהלך או לפי חצי-מהלך.",
    },
  },
  {
    path: "writing-an-article/inline-pgn/variations",
    title: { en: "Side lines", he: "וריאנטים" },
    summary: {
      en: "Side lines nested where they branch, a board opened inside one, and the game's comments.",
      he: "וריאנטים מקוננים במקום שבו הם מתפצלים, לוח שנפתח בתוך אחד, וההערות של המשחק.",
    },
  },
  {
    path: "writing-an-article/inline-pgn/arrows-and-circles",
    title: { en: "Arrows and circles: [%cal] and [%csl]", he: "חצים ועיגולים: [%cal] ו-[%csl]" },
    summary: {
      en: "The arrows and circles a lichess study draws, read back from its PGN — five drawn positions and games.",
      he: "החצים והעיגולים שסטודיו של lichess מצייר, נקראים מחדש מה-PGN שלו — חמש עמדות ומשחקים מצוירים.",
    },
  },
  {
    path: "writing-an-article/inline-pgn/rubinstein-capablanca-1911",
    title: { en: "Rubinstein – Capablanca, San Sebastian 1911", he: "רובינשטיין – קפבלנקה, סן סבסטיאן 1911" },
    summary: {
      en: "A game review: Capablanca's own notes, with nine boards on the one game.",
      he: "סקירת משחק: ההערות של קפבלנקה עצמו, עם תשעה לוחות על אותו משחק.",
    },
  },
  {
    path: "tournaments/fide-candidates-2026",
    title: { en: "FIDE Candidates 2026", he: "טורניר המועמדים 2026" },
    summary: {
      en: "A double round robin: eight players, fourteen rounds — <RoundRobinCrossTable> and three of its games.",
      he: "טורניר כל-נגד-כל כפול: שמונה שחקנים, ארבעה-עשר סבבים — <RoundRobinCrossTable> ושלושה ממשחקיו.",
    },
  },
  {
    path: "tournaments/werner-obermeyer-swiss-2026",
    title: { en: "20th Werner-Obermeyer", he: "טורניר ורנר-אוברמאייר ה-20" },
    summary: {
      en: "A Swiss: five rounds, the top boards of each — <SwissStandingsTable> and three of its games.",
      he: "טורניר שוויצרי: חמישה סבבים, הלוחות העליונים של כל סבב — <SwissStandingsTable> ושלושה ממשחקיו.",
    },
  },
  {
    path: "tournaments/green-hills-masters-rapid-2026",
    title: { en: "Green Hills Masters Rapid", he: "טורניר המאסטרים המהיר גרין הילס" },
    summary: {
      en: "A single round robin: eight players, seven rounds of rapid — <RoundRobinCrossTable> and three of its games.",
      he: "טורניר כל-נגד-כל: שמונה שחקנים, שבעה סבבים של שחמט מהיר — <RoundRobinCrossTable> ושלושה ממשחקיו.",
    },
  },
  {
    path: "writing-an-article/demo-tables/swiss",
    title: { en: "Swiss", he: "שוויצרי" },
    summary: {
      en: "<SwissStandingsTable>: the 112th British Championship — 108 players, nine rounds, ranked by points, Buchholz and Sonneborn-Berger.",
      he: "<SwissStandingsTable>: אליפות בריטניה ה-112 — 108 שחקנים, תשעה סיבובים, דירוג לפי נקודות, בוכהולץ וזונבורן־ברגר.",
    },
  },
  {
    path: "writing-an-article/demo-tables/single-round-robin",
    title: { en: "Single round robin", he: "כל-נגד-כל" },
    summary: {
      en: "<RoundRobinCrossTable>: the Green Hills Resort Masters 2026 — eight players, each met once.",
      he: "<RoundRobinCrossTable>: גרין הילס מאסטרס 2026 — שמונה שחקנים, כל זוג נפגש פעם אחת.",
    },
  },
  {
    path: "writing-an-article/demo-tables/double-round-robin",
    title: { en: "Double round robin", he: "כל-נגד-כל כפול" },
    summary: {
      en: "<RoundRobinCrossTable>: the FIDE Candidates 2026 — eight players, each met twice, two results a cell.",
      he: "<RoundRobinCrossTable>: טורניר המועמדים 2026 — שמונה שחקנים, כל זוג נפגש פעמיים, שתי תוצאות בכל משבצת.",
    },
  },
  {
    path: "writing-an-article/demo-tables/knockout",
    title: { en: "Knockout", he: "נוקאאוט" },
    summary: {
      en: "<KnockoutBracket>: the Dutch Championship 2026 — sixteen players, four rounds, tiebreaks counted.",
      he: "<KnockoutBracket>: אליפות הולנד 2026 — שישה-עשר שחקנים, ארבעה סיבובים, כולל משחקי שובר שוויון.",
    },
  },
  {
    path: "writing-an-article/demo-tables/double-elimination",
    title: { en: "Double-elimination knockout", he: "נוקאאוט כפול" },
    summary: {
      en: "<KnockoutBracket losersFromRound>: the Esports World Cup 2026 — the play-in's winners' and losers' brackets, then the final stage.",
      he: "<KnockoutBracket losersFromRound>: גביע העולם באיספורט 2026 — בית המנצחים ובית המפסידים של שלב הכניסה, ואז השלב הסופי.",
    },
  },
  {
    path: "writing-an-article/demo-tables/match",
    title: { en: "Match", he: "משחק בין שניים" },
    summary: {
      en: "<MatchTable>: Clutch Chess: The Legends 2026 — Topalov against Kasparov, twelve games.",
      he: "<MatchTable>: Clutch Chess: The Legends 2026 — טופאלוב מול קספרוב, שנים-עשר משחקים.",
    },
  },
  {
    path: "writing-an-article/demo-tables/team",
    title: { en: "Team events", he: "אירועי קבוצות" },
    summary: {
      en: "<TeamStandingsTable> and a team <KnockoutBracket>: the FIDE World Rapid and Blitz Team Championships 2026.",
      he: "<TeamStandingsTable> ו-<KnockoutBracket> של קבוצות: אליפויות העולם לקבוצות בשחמט מהיר ובזק 2026.",
    },
  },
  {
    path: "writing-an-article/demo-tables/from-a-collection",
    title: { en: "From a Library collection", he: "מאוסף בספרייה" },
    summary: {
      en: "<CollectionTournamentTable>: a tournament from the Library — names linked to each player's games, results to each game.",
      he: "<CollectionTournamentTable>: טורניר מהספרייה — שמות מקושרים למשחקי כל שחקן, ותוצאות לכל משחק.",
    },
  },
  {
    path: "writing-an-article/demo-tables/knockout-from-a-collection",
    title: { en: "A knockout from the Library", he: "נוקאאוט מהספרייה" },
    summary: {
      en: "<CollectionKnockoutBracket>: a knockout from the Library — a team knockout too; names linked to their games, each match's games under it.",
      he: "<CollectionKnockoutBracket>: נוקאאוט מהספרייה — גם של קבוצות; שמות מקושרים למשחקיהם, ומשחקי כל מפגש מתחתיו.",
    },
  },
  {
    path: "writing-an-article/demo-tables/double-elimination-from-a-collection",
    title: { en: "A double elimination from the Library", he: "הדחה כפולה מהספרייה" },
    summary: {
      en: "<CollectionDoubleEliminationBracket>: the winners' and losers' brackets from the Library, names and games linked.",
      he: "<CollectionDoubleEliminationBracket>: בית המנצחים ובית המפסידים מהספרייה, שמות ומשחקים מקושרים.",
    },
  },
  {
    path: "writing-an-article/demo-tables/team-from-a-collection",
    title: { en: "A team event from the Library", he: "אירוע קבוצתי מהספרייה" },
    summary: {
      en: "<CollectionTeamStandingsTable>: a team Swiss from the Library — each team linked to its players' games, each match to its first board.",
      he: "<CollectionTeamStandingsTable>: שוויצרי קבוצתי מהספרייה — כל קבוצה מקושרת למשחקי שחקניה, וכל מפגש ללוח הראשון שלו.",
    },
  },
  {
    path: "writing-an-article/guide",
    title: { en: "Writing an article", he: "כתיבת מאמר" },
    summary: {
      en: "Where an article's file goes, the lines that give it an address, and what it may embed.",
      he: "היכן נמצא קובץ המאמר, השורות שנותנות לו כתובת, ומה אפשר להטמיע בו.",
    },
  },
];

/* --- the files ----------------------------------------------------- */

const files = import.meta.glob<{ default: MDXContent }>("./articles/**/*.mdx");

/** `./articles/writing-an-article/components/x.he.mdx` → `writing-an-article/components/x`, `he`. */
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
