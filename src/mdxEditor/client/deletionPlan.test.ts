import { describe, expect, it } from "vitest";

import { deletedFilesOf, deletionPlanOf } from "./deletionPlan";
import type { StorageFolder } from "./storageClient";

/*
  What deleting the lobby's picks takes (CTA-137): a folder whole, a folder
  inside a picked one with it, an article with its translations, a PGN
  alone — each file once.
*/

const folders: StorageFolder[] = [
  { path: "", files: ["get-started.he.mdx", "get-started.mdx"] },
  { path: "club", files: ["index.mdx", "night.mdx", "night.he.mdx", "games.pgn"], others: ["cover.png"] },
  { path: "club/winter", files: ["index.mdx", "round.pgn"] },
  { path: "tournaments", files: ["cup.mdx", "cup.he.mdx", "cup.pgn"] },
];

describe("deletionPlanOf", () => {
  it("takes a folder whole, with the folders under it, and counts what goes with it", () => {
    const plan = deletionPlanOf(["folder:club", "folder:club/winter", "article:club/night.mdx"], folders);
    expect(plan.folders).toEqual(["club"]);
    expect(plan.inFolders).toEqual({
      articles: ["club/index.mdx", "club/night.mdx", "club/night.he.mdx", "club/winter/index.mdx"],
      pgns: ["club/games.pgn", "club/winter/round.pgn"],
      others: ["club/cover.png"],
    });
    // The article inside the folder is the folder's, not counted twice.
    expect(plan.files).toEqual([]);
  });

  it("takes an article with its translations, a translation alone by itself, and a PGN alone", () => {
    expect(deletionPlanOf(["article:tournaments/cup.mdx", "pgn:tournaments/cup.pgn"], folders)).toMatchObject({
      articles: ["tournaments/cup.mdx"],
      translations: ["tournaments/cup.he.mdx"],
      pgns: ["tournaments/cup.pgn"],
      files: ["tournaments/cup.mdx", "tournaments/cup.he.mdx", "tournaments/cup.pgn"],
    });
    expect(deletionPlanOf(["article:get-started.he.mdx"], folders)).toMatchObject({ articles: ["get-started.he.mdx"], translations: [], files: ["get-started.he.mdx"] });
  });

  it("lists every file the plan deletes, inside its folders and out", () => {
    expect(deletedFilesOf(deletionPlanOf(["folder:club/winter", "article:get-started.mdx"], folders))).toEqual([
      "club/winter/index.mdx",
      "club/winter/round.pgn",
      "get-started.mdx",
      "get-started.he.mdx",
    ]);
  });
});
