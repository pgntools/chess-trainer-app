import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

/*
  The design system's lint boundary (CTA-107, CTA-110): nothing under
  `src/design-system/` may import `src/views/`, `src/lib/` or `src/blocks/`,
  and a base component (`components/`) may not import a pattern
  (`patterns/`). Linted through the project's own config, exactly as
  `yarn lint` does. The blocks' own rule is `src/blocks/boundary.test.ts`.
*/

const lint = async (code: string, filePath: string) => {
  const [result] = await new ESLint().lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === "no-restricted-imports");
};

describe("the design system's lint boundary", () => {
  it("rejects an import of src/lib or src/views from inside the layer", async () => {
    const messages = await lint(
      [
        'import { parseFen } from "../../lib/fen";',
        'import EvalBar from "../../views/shared/EvalBar";',
        'import { gameTag } from "../lib/gameModel";',
        "export const used = [parseFen, EvalBar, gameTag];",
      ].join("\n"),
      "src/design-system/components/forms/Probe.ts",
    );
    expect(messages.map((message) => message.line)).toEqual([1, 2, 3]);
  });

  it("rejects an import of src/blocks, from either tier", async () => {
    const code = [
      'import { ExampleGamesTable } from "../../../blocks/tables";',
      'import { BLOCK_FAMILIES } from "../../blocks/families";',
      "export const used = [ExampleGamesTable, BLOCK_FAMILIES];",
    ].join("\n");
    for (const path of ["src/design-system/components/tables/Probe.ts", "src/design-system/patterns/tables/Probe.ts"]) {
      const messages = await lint(code, path);
      expect(messages.map((message) => message.line), path).toEqual([1, 2]);
      expect(messages[0].message).toContain("docs/design/hierarchy.md");
    }
  });

  it("rejects a pattern imported into a base component", async () => {
    const messages = await lint(
      [
        'import { DataTable } from "../../patterns/tables";',
        'import DataTableItself from "../../../patterns/tables/DataTable/DataTable";',
        "export const used = [DataTable, DataTableItself];",
      ].join("\n"),
      "src/design-system/components/tables/Probe.ts",
    );
    expect(messages.map((message) => message.line)).toEqual([1, 2]);
    expect(messages[0].message).toContain("base tier");
  });

  it("keeps the base tier's own boundary alongside the pattern rule", async () => {
    const messages = await lint(
      ['import { parseFen } from "../../lib/fen";', "export const used = [parseFen];"].join("\n"),
      "src/design-system/components/tables/Probe.ts",
    );
    expect(messages.map((message) => message.line)).toEqual([1]);
  });

  it("lets a pattern import the base components", async () => {
    const messages = await lint(
      [
        'import { TableFrame } from "../../../components/tables";',
        'import { IconAction } from "../../components/toolbars";',
        'import { PATTERN_SECTIONS } from "../sections";',
        "export const used = [TableFrame, IconAction, PATTERN_SECTIONS];",
      ].join("\n"),
      "src/design-system/patterns/tables/DataTable/Probe.ts",
    );
    expect(messages).toEqual([]);
  });

  it("allows the layer's own modules and packages", async () => {
    const messages = await lint(
      [
        'import Box from "@mui/material/Box";',
        'import { themes } from "../../themes";',
        'import { SECTIONS } from "../sections";',
        "export const used = [Box, themes, SECTIONS];",
      ].join("\n"),
      "src/design-system/components/forms/Probe.ts",
    );
    expect(messages).toEqual([]);
  });

  it("leaves the screens free to import every tier", async () => {
    const messages = await lint(
      [
        'import { parseFen } from "../../lib/fen";',
        'import { themes } from "../../design-system/themes";',
        'import { DataTable } from "../../design-system/patterns/tables";',
        'import { ExampleGamesTable } from "../../blocks/tables";',
        'import { useNavigate } from "react-router";',
        "export const used = [parseFen, themes, DataTable, ExampleGamesTable, useNavigate];",
      ].join("\n"),
      "src/views/settings/Probe.ts",
    );
    expect(messages).toEqual([]);
  });
});
