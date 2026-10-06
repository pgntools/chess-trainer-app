import { useEffect, useState } from "react";

import type { GallerySource } from "./componentGallery";
import { listStorageFolders, STORAGE_COMMAND, writeStorageFile } from "./storageClient";

/**
 * **Where a Components gallery entry reads its games from** (CTA-140) —
 * what the gallery's Add / update PGN dialog and its heavy-PGN dialog
 * share: the source chosen and how, a PGN file's name, the Blog's folders
 * a file can go into, and the write itself.
 */

/** The prefix of every test id on the gallery's page. */
export const GALLERY_ID = "mdx-component-gallery";

/** Where a component reads its games from: a built-in example, a PGN file uploaded, one pasted, or the Library. */
export type Choice = "builtin" | "upload" | "paste" | "library";

/** The source an entry reads, with how it was chosen — so the dialog opens on it again — and in words for the pane. */
export type Applied = {
  source: GallerySource;
  words: string;
  /** `written`: the PGN went to that file, under `articles/`, rather than into the code. */
  origin:
    | { kind: "builtin"; id: string }
    | { kind: "upload"; name: string; text: string; written?: string }
    | { kind: "paste"; text: string; written?: string }
    | { kind: "library"; address: string };
  /** A file just written, by its path under `articles/` → its text — read before the build's glob has caught up. */
  attached?: Readonly<Record<string, string>>;
};

/** A PGN file's name as the Blog's files are named. */
export const PGN_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pgn$/;

/** A picked file's name as an article would import it — letters, digits, dots, dashes and underscores. */
export const fileNameOf = (name: string): string => name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[^A-Za-z0-9]+/, "") || "image.png";

/** A file's name as a PGN file of the Blog's — letters, digits, dots, dashes and underscores, then `.pgn`. */
export const pgnFileNameOf = (name: string): string => `${name.replace(/\.pgn$/i, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[^A-Za-z0-9]+/, "") || "games"}.pgn`;

/** A count of games, for a sentence. */
export const gamesWords = (count: number): string => `${count.toLocaleString()} game${count === 1 ? "" : "s"}`;

/** The Blog's folders, as the storage service lists them — or why it could not. */
export type BlogFolders = { kind: "folders"; paths: string[] } | { kind: "down" } | { kind: "refused"; message: string };

/** The Blog's folders, asked of the storage service once `wanted` — `undefined` until it answers. */
export const useBlogFolders = (wanted: boolean): BlogFolders | undefined => {
  const [folders, setFolders] = useState<BlogFolders>();
  const asking = wanted && folders === undefined;
  useEffect(() => {
    if (!asking) return;
    let live = true;
    void listStorageFolders().then((listed) => {
      if (live) setFolders(listed.kind === "folders" ? { kind: "folders", paths: listed.folders.map((folder) => folder.path) } : listed);
    });
    return () => {
      live = false;
    };
  }, [asking]);
  return folders;
};

/** What the storage service says when it is not there. */
export const SERVICE_DOWN = `The storage service is not answering — start the editor with ${STORAGE_COMMAND}.`;

/** A PGN written to `path` under `articles/`, never over another file — `undefined` once written, else why not. */
export const writePgnFile = async (path: string, text: string): Promise<string | undefined> => {
  const result = await writeStorageFile(path, text);
  if (result.kind === "written") return undefined;
  return result.kind === "exists" ? `${path} is there already — give the file another name.` : result.kind === "down" ? SERVICE_DOWN : result.message;
};
