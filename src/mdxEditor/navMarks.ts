import { useMemo } from "react";

import { blogNavFolderId } from "../views/blog/articles";
import type { GitFile } from "./client/storageClient";
import { useGitStatus } from "./client/useGitStatus";
import { MDX_EDITOR_ENABLED } from "./enabled";

/**
 * **The sidebar's "not synced" marks** (CTA-137) — under
 * `yarn mdx-editor:start`, the Blog's rows holding a file git has not got
 * as it is: an article whose `.mdx` (or a translation) is new or changed,
 * a folder whose `index.mdx` or a `.pgn` of it is, and every folder above
 * one. The sidebar asks `useUnsyncedNavIds()` and marks those rows; without
 * the editor it is a constant empty set, and a production build drops the
 * rest.
 */

const NONE: ReadonlySet<string> = new Set();

/** The sidebar's ids of the rows git's files touch — `/blog/<article>` for an article, `blog/<folder>` for each folder up to the Blog's own. */
export const navIdsOf = (files: readonly GitFile[]): ReadonlySet<string> => {
  const ids = new Set<string>();
  for (const { path } of files) {
    const parts = path.split("/");
    const name = parts.at(-1) ?? "";
    const folders = parts.slice(0, -1);
    for (let depth = 0; depth <= folders.length; depth += 1) ids.add(blogNavFolderId(folders.slice(0, depth).join("/")));
    // An article file — `x.mdx` or its translation `x.he.mdx`; a folder's index and a PGN mark the folder alone.
    const article = /^(.+?)(?:\.[a-z]{2})?\.mdx$/.exec(name)?.[1];
    if (article !== undefined && article !== "index") ids.add(`/blog/${[...folders, article].join("/")}`);
  }
  return ids;
};

const useGitNavIds = (): ReadonlySet<string> => {
  const { status } = useGitStatus();
  return useMemo(() => (status?.kind === "status" ? navIdsOf(status.files) : NONE), [status]);
};
const useNoNavIds = (): ReadonlySet<string> => NONE;

/** The sidebar rows to mark "not synced with git" — none without the editor. */
export const useUnsyncedNavIds: () => ReadonlySet<string> = MDX_EDITOR_ENABLED ? useGitNavIds : useNoNavIds;
