import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

/*
  The design system's lint boundary (CTA-107): nothing under
  `src/design-system/` may import `src/views/` or `src/lib/`. Linted through
  the project's own config, exactly as `yarn lint` does.
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

  it("leaves the screens free to import the design system", async () => {
    const messages = await lint(
      [
        'import { parseFen } from "../../lib/fen";',
        'import { themes } from "../../design-system/themes";',
        "export const used = [parseFen, themes];",
      ].join("\n"),
      "src/views/settings/Probe.ts",
    );
    expect(messages).toEqual([]);
  });
});
