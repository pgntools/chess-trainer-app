import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

/*
  The blocks' lint boundary (CTA-110): a block is presentational, so nothing
  under `src/blocks/` imports a screen (`src/views/`), a store or database
  module (`src/lib/*Store.ts`, `*Db.ts`, `idb*.ts`) or the router. The rest
  of `src/lib/` — its types and pure helpers — and every tier of the design
  system are a block's to use. Linted through the project's own config,
  exactly as `yarn lint` does.
*/

const lint = async (code: string, filePath = "src/blocks/tables/Probe/Probe.tsx") => {
  const [result] = await new ESLint().lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === "no-restricted-imports");
};

describe("the blocks' lint boundary", () => {
  it("rejects an import of a screen", async () => {
    const messages = await lint(
      [
        'import EvalBar from "../../../views/shared/EvalBar";',
        'import { useLibraryCollections } from "../../views/library/useLibraryCollections";',
        "export const used = [EvalBar, useLibraryCollections];",
      ].join("\n"),
    );
    expect(messages.map((message) => message.line)).toEqual([1, 2]);
    expect(messages[0].message).toContain("docs/design/hierarchy.md");
  });

  it("rejects a store or database module of src/lib", async () => {
    const messages = await lint(
      [
        'import { loadPlayedGames } from "../../../lib/playedGameStore";',
        'import { openLibraryDb } from "../../../lib/libraryDb";',
        'import { openDb } from "../../../lib/idb";',
        'import { idbRecordStore } from "../../../lib/idbRecordStore";',
        'import { addCollection } from "../../../lib/libraryCollectionStore.ts";',
        "export const used = [loadPlayedGames, openLibraryDb, openDb, idbRecordStore, addCollection];",
      ].join("\n"),
    );
    expect(messages.map((message) => message.line)).toEqual([1, 2, 3, 4, 5]);
    expect(messages[0].message).toContain("presentational");
  });

  it("rejects the router", async () => {
    const messages = await lint(
      [
        'import { useNavigate } from "react-router";',
        'import { Link } from "react-router/dom";',
        "export const used = [useNavigate, Link];",
      ].join("\n"),
    );
    expect(messages.map((message) => message.line)).toEqual([1, 2]);
    expect(messages[0].message).toContain("LinkTarget");
  });

  it("allows src/lib's types and pure helpers, and every tier of the design system", async () => {
    const messages = await lint(
      [
        'import type { CollectionRow } from "../../../lib/libraryCollections";',
        'import { tableDate } from "../../../design-system/components/tables";',
        'import { DataTable } from "../../../design-system/patterns/tables";',
        'import { useChessTokens } from "../../../design-system/theme";',
        'import { ExampleGamesTable } from "../ExampleGamesTable";',
        'import Box from "@mui/material/Box";',
        "export type Row = CollectionRow;",
        "export const used = [tableDate, DataTable, useChessTokens, ExampleGamesTable, Box];",
      ].join("\n"),
    );
    expect(messages).toEqual([]);
  });
});
