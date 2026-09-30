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

  it("rejects the MUI atoms the design system wraps, naming what to use (CTA-116)", async () => {
    // The lock is the screens' too (src/views/boundary.test.ts has every atom);
    // here it is shown to survive the one config entry that also holds the
    // blocks' own rules — a later entry replaces an earlier one.
    const messages = await lint(
      [
        'import Dialog from "@mui/material/Dialog";',
        'import Tooltip from "@mui/material/Tooltip";',
        'import { Tabs } from "@mui/material";',
        "export const used = [Dialog, Tooltip, Tabs];",
      ].join("\n"),
    );
    expect(messages.map((message) => message.line)).toEqual([1, 2, 3]);
    expect(messages[0].message).toContain("BaseDialog");
    expect(messages[1].message).toContain("HintButton");
    expect(messages[2].message).toContain("PanelTabs");
    expect(messages[0].message).toContain("docs/design/hierarchy.md");
  });

  it("keeps the presentational rules beside the MUI lock in one file", async () => {
    const messages = await lint(
      [
        'import Dialog from "@mui/material/Dialog";',
        'import { useNavigate } from "react-router";',
        'import { openDb } from "../../../lib/idb";',
        'import EvalBar from "../../../views/shared/EvalBar";',
        "export const used = [Dialog, useNavigate, openDb, EvalBar];",
      ].join("\n"),
    );
    expect(messages.map((message) => message.line)).toEqual([1, 2, 3, 4]);
  });

  it("allows a block to use the atoms the design system does not wrap", async () => {
    const messages = await lint(
      [
        'import Box from "@mui/material/Box";',
        'import Button from "@mui/material/Button";',
        'import Chip from "@mui/material/Chip";',
        'import DialogContentText from "@mui/material/DialogContentText";',
        "export const used = [Box, Button, Chip, DialogContentText];",
      ].join("\n"),
    );
    expect(messages).toEqual([]);
  });

  it("allows src/lib's types and pure helpers, and every tier of the design system", async () => {
    const messages = await lint(
      [
        'import type { CollectionRow } from "../../../lib/libraryCollections";',
        'import { tableDate } from "../../../design-system/components/tables";',
        'import { DataTable } from "../../../design-system/patterns/tables";',
        'import { useChessTokens } from "../../../design-system/theme";',
        'import { PlayedGamesTable } from "../PlayedGamesTable";',
        'import Box from "@mui/material/Box";',
        "export type Row = CollectionRow;",
        "export const used = [tableDate, DataTable, useChessTokens, PlayedGamesTable, Box];",
      ].join("\n"),
    );
    expect(messages).toEqual([]);
  });
});
