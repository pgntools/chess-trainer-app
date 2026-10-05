import type { StorageFolder } from "./storageClient";

/**
 * **What a delete of the lobby's picks takes** (CTA-137) — worked out from
 * the folders on disk, so the confirmation can name every file before any
 * goes:
 *
 * - a **folder** goes whole — everything under it, at any depth; a folder
 *   inside another picked one is taken with it;
 * - an **article** goes with its **translations** (`x.he.mdx` beside
 *   `x.mdx`): the build refuses a translation whose English file is gone;
 * - a **PGN** or an **image** goes alone;
 * - anything inside a folder that goes is the folder's, not counted twice.
 */

export type DeletionPlan = {
  /** The folders to delete, each the topmost picked — with everything under them. */
  folders: string[];
  /** Files under those folders, by kind — what the confirmation says goes with them. */
  inFolders: { articles: string[]; pgns: string[]; images: string[]; others: string[] };
  /** The articles picked outside them, and the translations that go with them. */
  articles: string[];
  translations: string[];
  /** The PGN files and the images picked outside them. */
  pgns: string[];
  images: string[];
  /** Every file deleted outside the folders — what the service's `paths` is. */
  files: string[];
};

const join = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);
const under = (path: string, folder: string) => path === folder || path.startsWith(`${folder}/`);

/** The plan for these picks — `folder:<path>`, `article:<path>` and `pgn:<path>`, as the lobby's rows are keyed. */
export const deletionPlanOf = (picked: Iterable<string>, folders: readonly StorageFolder[]): DeletionPlan => {
  const picks = [...picked].map((id) => {
    const at = id.indexOf(":");
    return { kind: id.slice(0, at), path: id.slice(at + 1) };
  });
  const pickedFolders = picks.filter((pick) => pick.kind === "folder").map((pick) => pick.path);
  // A folder inside another picked one goes with it.
  const topFolders = pickedFolders.filter((path) => !pickedFolders.some((other) => other !== path && under(path, other))).sort();
  const covered = (path: string) => topFolders.some((folder) => path.startsWith(`${folder}/`));

  const inFolders = { articles: [] as string[], pgns: [] as string[], images: [] as string[], others: [] as string[] };
  for (const folder of folders) {
    if (!topFolders.some((top) => under(folder.path, top))) continue;
    for (const file of folder.files) (file.endsWith(".mdx") ? inFolders.articles : file.endsWith(".pgn") ? inFolders.pgns : inFolders.images).push(join(folder.path, file));
    for (const file of folder.others ?? []) inFolders.others.push(join(folder.path, file));
  }

  const articles = picks.filter((pick) => pick.kind === "article" && !covered(pick.path)).map((pick) => pick.path);
  const translations = new Set<string>();
  for (const article of articles) {
    const name = article.split("/").at(-1) ?? article;
    // An English article's translations, beside it; a translation picked alone goes alone.
    if (/\.[a-z]{2}\.mdx$/.test(name)) continue;
    const folderPath = article.split("/").slice(0, -1).join("/");
    const stem = name.replace(/\.mdx$/, "");
    for (const file of folders.find((folder) => folder.path === folderPath)?.files ?? []) {
      const path = join(folderPath, file);
      if (new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.[a-z]{2}\\.mdx$`).test(file) && !articles.includes(path)) translations.add(path);
    }
  }
  const pgns = picks.filter((pick) => pick.kind === "pgn" && !covered(pick.path)).map((pick) => pick.path);
  const images = picks.filter((pick) => pick.kind === "image" && !covered(pick.path)).map((pick) => pick.path);
  return {
    folders: topFolders,
    inFolders,
    articles,
    translations: [...translations].sort(),
    pgns,
    images,
    files: [...articles, ...translations, ...pgns, ...images],
  };
};

/** Every file the plan deletes — inside its folders and out. */
export const deletedFilesOf = (plan: DeletionPlan): string[] => [...plan.inFolders.articles, ...plan.inFolders.pgns, ...plan.inFolders.images, ...plan.inFolders.others, ...plan.files];
